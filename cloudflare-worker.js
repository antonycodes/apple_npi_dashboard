/**
 * Lark Base proxy — Cloudflare Worker (module syntax).
 *
 * Deploy: `npx wrangler deploy cloudflare-worker.js` (hoặc dán vào Workers editor).
 * Biến bí mật đặt bằng `wrangler secret put <NAME>` hoặc trong dashboard Workers:
 *   LARK_APP_ID, LARK_APP_SECRET, LARK_HOST, LARK_APP_TOKEN,
 *   TB_CHECKIN, TB_ORDERS, TB_MASTER, TB_DISPATCH, TB_DS_MASTER
 *
 * Tuỳ chọn (2 nút Tiếp nhận/Hoàn tất ở màn hình nhân viên, 2026-08-12):
 * `LARK_WEBHOOK_URL2` = URL webhook của workflow Lark tạo record SS_Master.
 * `ADMIN_PASSWORD` = mật khẩu tài khoản `admin` (BẮT BUỘC — thiếu thì mọi lần
 * đăng nhập admin trả 500 kèm thông báo rõ, KHÔNG rơi về chế độ không mật khẩu).
 * `STAFF_PASSWORD` = mật khẩu dùng chung cho tài khoản con TV/TC/BK (đặt 0000).
 * App trỏ ô "Webhook Tiếp nhận / Hoàn tất" vào `https://<worker>/webhook2`.
 *
 * `POST /upload` (2026-08-12, tiếp) — ảnh nghiệm thu ở form Hoàn tất khâu Thu
 * cũ/Backup: nhận multipart `file`, upload lên Lark bằng tenant token của
 * worker, trả `file_token` để app gắn vào JSON `/webhook2`. Không cần secret
 * mới (dùng lại `LARK_APP_ID`/`LARK_APP_SECRET`/`LARK_APP_TOKEN` sẵn có).
 *
 * Tuỳ chọn (form "Điều phối", 2026-08-11): `LARK_WEBHOOK_URL` = URL webhook
 * Lark Base nhận form. **Phải đặt dạng Secret** (`wrangler secret put`), KHÔNG
 * phải biến plaintext "Text" trên dashboard: `wrangler deploy` đẩy lên nguyên
 * danh sách biến plaintext lấy từ `wrangler.jsonc` nên biến Text thêm tay trên
 * dashboard sẽ bị XOÁ ngay lần deploy kế tiếp (secret thì được giữ). Đặt xong
 * thì trỏ "Webhook URL" trong Cài đặt vào
 * `https://<worker>.workers.dev/webhook` để tránh CORS (xem `POST /webhook`
 * bên dưới); không đặt cũng được — web sẽ gửi thẳng lên Lark kiểu `no-cors`,
 * chỉ là không đọc được phản hồi.
 *
 * Dashboard trỏ vào:  API URL = https://<worker>.workers.dev/api/lark
 * (Worker lấy tên bảng ở segment cuối, nên /api/lark/<table> hay /<table> đều được.)
 * `GET /` hoặc `GET /health` → liệt kê các table key đang hỗ trợ, không cần Lark token.
 *
 * **Schema (2026-08-05, "no DS Master")**: `TB_CHECKIN` = table id của
 * "Master_Check in". `TB_MASTER` = table id của bảng "Master_Staff" (logic
 * Master/SS_Master, log NV tiếp
 * nhận khách theo bàn — nguồn xác định khách đang ở bàn nào + màu bàn + "Chờ
 * điều phối"). `TB_DISPATCH` = table id của "Master Điều phối" (khách đã gán
 * bàn, chờ NV nhận — nguồn số "khách đang chờ" mỗi bàn).
 *
 * **`TB_DS_MASTER`** (thêm lại 2026-08-05, tiếp) = table id của "Master_DS"
 * (logic DS Master) —
 * web đọc field "STT tiếp theo" + "NV Tư vấn"/"Loại" mỗi bàn từ bảng này
 * (dự phòng suy mã bàn khi `TV_MãNV` không tự resolve được, xem
 * `larkMapper.ts`'s `indexDeskCodeByStaffName`). Bug thật 2026-08-06:
 * `TABLE_ENV` từng thiếu hẳn key `dsMaster` — `/dsMaster` luôn trả rỗng y hệt
 * bảng thật sự không có dữ liệu, mất nhiều vòng debug mới lộ ra.
 *
 * **Tự resolve mã option Lark thô** (2026-08-06, đồng bộ từ bản đang deploy
 * thật — tiến bộ hơn bản cũ chỉ lọc mã "opt..." phía web): với field có
 * DANH SÁCH OPTION TĨNH khai báo ngay trên field (formula/single-select
 * bình thường), REST API trả mảng mã option thô (`["opt..."]`) thay vì chữ
 * hiển thị — gọi thêm `GET .../fields` 1 lần/bảng (cache 10 phút) lấy map
 * optionId→tên, tự thay thế trước khi trả về client. KHÔNG bao phủ được
 * field kiểu Lookup có options ĐỘNG (vd `TV_MãNV`, options lấy từ bảng khác
 * qua `optionsRule`, không có trong `fields` API) — code web (`larkMapper.ts`)
 * vẫn cần tự suy mã bàn qua NV làm dự phòng cho đúng trường hợp này.
 *
 * **Base nhúng trong Wiki**: nếu bạn lấy `LARK_APP_TOKEN` từ 1 URL dạng
 * `.../wiki/<token>?table=...` (không phải `.../base/<token>?table=...`),
 * giá trị đó là *wiki node token*, KHÔNG PHẢI app_token thật của Bitable —
 * dùng thẳng sẽ luôn lỗi `NOTEXIST`. Worker này tự dò: gọi
 * `wiki/v2/spaces/get_node` trước, nếu token là 1 node kiểu `bitable` thì tự
 * đổi sang `obj_token` thật; nếu không (bạn đã dùng đúng app_token trực
 * tiếp) thì dùng nguyên token đã cấu hình — không cần biết trước bạn đang ở
 * trường hợp nào.
 */
const TABLE_ENV = {
  checkin: 'TB_CHECKIN',
  orders: 'TB_ORDERS',
  master: 'TB_MASTER',
  dispatch: 'TB_DISPATCH',
  dsMaster: 'TB_DS_MASTER',
};

let cachedToken = null;
let tokenExpiresAt = 0;

async function getToken(env, host) {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;
  const r = await fetch(`${host}/open-apis/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: env.LARK_APP_ID, app_secret: env.LARK_APP_SECRET }),
  });
  const j = await r.json();
  if (j.code !== 0) throw new Error(`token error: ${j.msg} (code ${j.code})`);
  cachedToken = j.tenant_access_token;
  tokenExpiresAt = Date.now() + (j.expire - 120) * 1000;
  return cachedToken;
}

let cachedAppToken = null;

/** `LARK_APP_TOKEN` có thể là wiki node token — dò và đổi sang app_token thật của Bitable nếu đúng vậy. */
async function resolveAppToken(env, host, token) {
  if (cachedAppToken) return cachedAppToken;
  try {
    const bearer = await getToken(env, host);
    const r = await fetch(`${host}/open-apis/wiki/v2/spaces/get_node?token=${encodeURIComponent(token)}`, {
      headers: { Authorization: `Bearer ${bearer}` },
    });
    const j = await r.json();
    if (j.code === 0 && j.data?.node?.obj_type === 'bitable' && j.data.node.obj_token) {
      cachedAppToken = j.data.node.obj_token;
      return cachedAppToken;
    }
  } catch {
    /* không phải wiki node (hoặc lỗi mạng) — dùng thẳng token gốc bên dưới */
  }
  cachedAppToken = token;
  return cachedAppToken;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ── Admin: đăng nhập + cấu hình dùng chung giữa các máy điều phối ──────────
//
// **Mật khẩu KHÔNG BAO GIỜ nằm trong bundle web**: client chỉ POST
// username/password lên `/admin/login`. Admin dùng `ADMIN_PASSWORD`, tài khoản
// nhân viên dùng `STAFF_PASSWORD`. Worker trả về token có hạn.
//
// Token là chuỗi tự xác thực `<hết hạn>.<HMAC-SHA256>` ký bằng secret
// `ADMIN_SESSION_SECRET` — worker không cần lưu session, và token cũ tự chết
// khi hết hạn. Đổi `ADMIN_SESSION_SECRET` = vô hiệu hoá tất cả token đang có.
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const KV_COORDINATORS = 'coordinators';

/**
 * Cấu hình Lark DÙNG CHUNG (2026-08-12) — admin bấm "Đẩy cho mọi máy" ở
 * `#/settings`, mọi máy (điều phối, màn hình STT, điện thoại nhân viên) tự đọc
 * mỗi 30 giây và áp dụng. Trước đây cấu hình chỉ nằm trong localStorage từng
 * máy nên admin bật Live Base ở máy mình thì máy NV vẫn chạy dữ liệu mẫu.
 */
const KV_APP_SETTINGS = 'app-settings';

/** Chỉ nhận đúng các khoá này — client gửi thừa gì cũng không lọt vào KV. */
function normalizeAppSettings(input) {
  const s = input && typeof input === 'object' ? input : {};
  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  return {
    useMock: Boolean(s.useMock),
    apiUrl: str(s.apiUrl),
    dispatchWebhookUrl: str(s.dispatchWebhookUrl),
    staffActionWebhookUrl: str(s.staffActionWebhookUrl),
    // Ánh xạ tên cột: cấu trúc lồng nhau do client định nghĩa (xem
    // `larkConfig.ts`), giữ nguyên vẹn — đã qua cổng token admin.
    fields: s.fields && typeof s.fields === 'object' ? s.fields : null,
  };
}

const enc = new TextEncoder();

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hmacHex(secret, text) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(text));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** So sánh không phụ thuộc thời gian — tránh rò rỉ qua timing khi dò mật khẩu/token. */
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function issueToken(env, role = 'admin', desk = '') {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = `${role}:${desk}:${exp}`;
  return `${payload}.${await hmacHex(env.ADMIN_SESSION_SECRET, payload)}`;
}

async function verifyToken(env, token) {
  const [payload, sig] = String(token || '').split('.');
  const [role, desk, exp] = String(payload || '').split(':');
  const signedPayload = `${role}:${desk}:${exp}`;
  if (!role || !sig || !/^\d+$/.test(exp) || Number(exp) < Date.now()) return null;
  if (role === 'staff' && !desk) return null;
  if (!safeEqual(sig, await hmacHex(env.ADMIN_SESSION_SECRET, signedPayload))) return null;
  return { role, desk };
}

function isStaffDesk(username) {
  const value = String(username || '').trim().toUpperCase();
  const match = /^(TV|TC|BK)(\d+)$/.exec(value);
  if (!match) return false;
  const n = Number(match[2]);
  return (match[1] === 'TV' && n >= 1 && n <= 18) ||
    (match[1] === 'TC' && n >= 1 && n <= 10) ||
    (match[1] === 'BK' && n >= 1 && n <= 10);
}

function bearer(request) {
  const h = request.headers.get('Authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7) : '';
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

// Cache map optionId→tên hiển thị theo TỪNG BẢNG (10 phút) — tránh gọi lại
// API field-metadata mỗi request.
const fieldOptionCache = new Map();
const FIELD_CACHE_MS = 10 * 60 * 1000;

/** Lấy `{ tên field → Map(optionId → tên hiển thị) }` cho các field CÓ danh sách option tĩnh trong 1 bảng. */
async function getFieldOptionMaps(env, host, appToken, token, tableId) {
  const now = Date.now();
  const hit = fieldOptionCache.get(tableId);
  if (hit && now < hit.expiresAt) return hit.maps;

  const url = `${host}/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/fields?page_size=200`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();

  const maps = {};
  for (const f of data?.data?.items ?? []) {
    const options = f.property?.type?.ui_property?.options;
    if (Array.isArray(options)) maps[f.field_name] = new Map(options.map((o) => [o.id, o.name]));
  }
  fieldOptionCache.set(tableId, { maps, expiresAt: now + FIELD_CACHE_MS });
  return maps;
}

/** Thay mã option thô (`["opt..."]`) bằng tên hiển thị cho mọi field có option tĩnh — sửa `records` tại chỗ. */
function resolveOptionRefs(records, fieldMaps) {
  for (const rec of records) {
    for (const [fieldName, optMap] of Object.entries(fieldMaps)) {
      const v = rec.fields?.[fieldName];
      if (Array.isArray(v) && v.length && typeof v[0] === 'string' && optMap.has(v[0])) {
        rec.fields[fieldName] = v.map((id) => optMap.get(id) ?? id).join(', ');
      }
    }
  }
}

// Dashboard reads are shared per warm Worker isolate. The short TTL is
// deliberate: it coalesces a burst of devices without making writes appear
// permanently stale. POST routes never use this cache.
let dashboardSnapshotCache = null;
let dashboardSnapshotInFlight = null;
const dashboardTableCache = new Map();
const DASHBOARD_SNAPSHOT_TTL_MS = 4000;
const DASHBOARD_SNAPSHOT_STALE_MS = 30000;
const DASHBOARD_TABLES = ['checkin', 'orders', 'master', 'dispatch', 'dsMaster'];

async function readTableRecords(env, host, key, token, appToken) {
  const envKey = TABLE_ENV[key];
  const tableId = envKey ? env[envKey] : undefined;
  if (!envKey || !tableId) throw new Error(`Missing Cloudflare secret for table "${key}"`);

  let items = [];
  let pageToken;
  do {
    const u = new URL(`${host}/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`);
    u.searchParams.set('page_size', '500');
    if (pageToken) u.searchParams.set('page_token', pageToken);
    const response = await fetch(u, { headers: { Authorization: `Bearer ${token}` } });
    const body = await response.json();
    if (body.code !== 0) throw new Error(`Lark API error on ${key}: ${body.msg} (code ${body.code})`);
    items = items.concat(body.data?.items ?? []);
    pageToken = body.data?.has_more ? body.data.page_token : null;
  } while (pageToken);

  const fieldMaps = await getFieldOptionMaps(env, host, appToken, token, tableId);
  resolveOptionRefs(items, fieldMaps);
  return items;
}

async function getDashboardSnapshot(env, host) {
  const now = Date.now();
  if (dashboardSnapshotCache && now < dashboardSnapshotCache.expiresAt) {
    return { ...dashboardSnapshotCache.payload, cache: 'hit' };
  }
  if (dashboardSnapshotInFlight) return dashboardSnapshotInFlight;

  dashboardSnapshotInFlight = (async () => {
    const token = await getToken(env, host);
    const appToken = await resolveAppToken(env, host, env.LARK_APP_TOKEN);
    const results = await Promise.all(DASHBOARD_TABLES.map(async (key) => {
      try {
        const items = await readTableRecords(env, host, key, token, appToken);
        dashboardTableCache.set(key, { items, updatedAt: Date.now() });
        return { key, items, warning: null };
      } catch (error) {
        const cached = dashboardTableCache.get(key);
        return {
          key,
          items: cached?.items ?? [],
          warning: `${key}: ${String(error?.message || error)}`,
        };
      }
    }));
    const tables = Object.fromEntries(results.map(({ key, items }) => [key, items]));
    const warnings = results.map((result) => result.warning).filter(Boolean);
    const payload = {
      code: 0,
      msg: warnings.length ? 'partial snapshot' : 'success',
      data: { tables, generatedAt: new Date().toISOString(), warnings },
    };
    dashboardSnapshotCache = {
      payload,
      expiresAt: Date.now() + DASHBOARD_SNAPSHOT_TTL_MS,
      staleUntil: Date.now() + DASHBOARD_SNAPSHOT_STALE_MS,
    };
    return { ...payload, cache: 'miss' };
  })();

  try {
    return await dashboardSnapshotInFlight;
  } catch (error) {
    // Keep the dashboard usable during a short Lark timeout/rate-limit burst.
    // Writes still invalidate this cache, so this fallback is only a read-path
    // resilience measure and is bounded by DASHBOARD_SNAPSHOT_STALE_MS.
    if (dashboardSnapshotCache && Date.now() < dashboardSnapshotCache.staleUntil) {
      return {
        ...dashboardSnapshotCache.payload,
        cache: 'stale',
        warning: String(error?.message || error),
      };
    }
    throw error;
  } finally {
    dashboardSnapshotInFlight = null;
  }
}

function invalidateDashboardSnapshot() {
  dashboardSnapshotCache = null;
}

// ── `POST /record`: map payload → cột Bitable ───────────────────────────────
//
// Tên cột lấy theo bảng "Master" đang dùng thật. Sai tên KHÔNG làm hỏng
// record: route tự dò schema, cột nào không có thì bỏ qua và báo trong
// `data.skipped` để sửa lại map này.
//
// `nhanSu` → "Người" cố ý GIỮ trong map dù biết sẽ bị bỏ qua (person field cần
// open_id): để phản hồi nói rõ lý do, thay vì im lặng như thể chưa từng có.
const RECORD_FIELD_MAP = {
  stt: 'STT Input',
  hoTen: 'Họ và tên',
  maBan: 'TV_MãNV',
  trangThai: 'Trạng thái',
  msnv: 'Submit by',
  nhanSu: 'Người',
  phanLoai: 'Loại 2',
  thoiGian: 'Thời gian',
  checkBackup: 'Back up',
  thuLaiMay: 'Thu lại máy',
  scanQr: 'Scan QR máy cũ',
  imei: 'Scan IMEI',
  hinhNghiemThu: 'Hình nghiệm thu máy cũ',
  // Leadtime do APP đo — chỉ ghi bản dạng CHỮ, làm ĐỐI CHIẾU.
  //
  // ⚠️ Tên hai cột dễ gây hiểu ngược: cột tên `Number Leadtime` lại là kiểu
  // TEXT, còn cột tên `Leadtime` mới là kiểu NUMBER. Map theo KIỂU THẬT, không
  // theo tên — chuỗi "06:52" nhét vào cột Number sẽ bị bỏ qua.
  //
  // Cột số (`Leadtime`) KHÔNG map ở đây: worker tự tính từ hai mốc `Thời gian`
  // trong Base (xem `tinhLeadtimeTuBase`) vì con số đó chính xác hơn hẳn —
  // đồng hồ của app nằm trong bộ nhớ trình duyệt nên mất khi tải lại trang
  // hoặc khi đổi máy giữa chừng.
  //
  // Giữ cả hai để so: lệch nhiều ở ca nào là dấu hiệu ca đó có chuyện (bấm
  // Hoàn tất muộn, hoặc Tiếp nhận và Hoàn tất ở hai máy khác nhau).
  //
  // KHÔNG map `leadtimeUocLuong`: Base không có cột cho nó. Thay vào đó
  // `leadtimeHienThi` mang tiền tố `~` khi mốc là suy ra — đúng ký hiệu mà
  // màn hình nhân viên đang hiện, nên đọc báo cáo không phải học quy ước mới.
  leadtimeHienThi: 'Number Leadtime',
};

/**
 * Cột SỐ để worker ghi leadtime tự tính — cột này mới là thứ dùng để tính
 * trung bình. Nằm ngoài `RECORD_FIELD_MAP` vì giá trị do worker sinh ra, không
 * đến từ payload.
 */
const COT_LEADTIME_GIAY = 'Leadtime';

/**
 * Map cho bảng ĐIỀU PHỐI (`TB_DISPATCH`), dùng bởi `POST /dispatch-record`.
 *
 * Form Điều phối KHÔNG gửi tên khách — bên Base cột `Họ và tên` là tra ngược
 * từ STT, nên ở đây chỉ ghi `STT input` và để Base tự suy phần còn lại.
 * `maBan` không nằm trong map này: nó vào 1 trong 3 cột tuỳ `phanLoai`, xem
 * `DISPATCH_DESK_COLUMN`.
 */
const DISPATCH_FIELD_MAP = {
  stt: 'STT input',
  phanLoai: 'Phân loại',
  submitBy: 'Submit by',
};

/**
 * Bảng Điều phối tách mã bàn thành BA cột riêng theo khâu, không dùng chung
 * một cột như bảng Master. Đây cũng là ba cột dashboard đọc để dựng dòng
 * "(DS Tư vấn)(DS Thu cũ)(DS Backup)" ở End Flow — ghi sai cột là cột Nhân sự
 * rỗng. Khớp với `DispatchFieldMap` bên `src/config/larkConfig.ts`.
 */
const DISPATCH_DESK_COLUMN = {
  'Tư vấn': 'DS Tư vấn',
  'Thu cũ': 'DS Thu cũ',
  Backup: 'DS Backup',
};

// Mã kiểu field Bitable (theo tài liệu Lark): 1 Text · 2 Number · 3 Single
// select · 5 Date · 7 Checkbox · 11 User · 17 Attachment · 19 Lookup ·
// 20 Formula · 1001–1005 hệ thống. Barcode là type 1 + `ui_type: "Barcode"`.
const LARK_FIELD_NUMBER = 2;
const LARK_FIELD_DATE = 5;
const LARK_FIELD_CHECKBOX = 7;
const LARK_FIELD_USER = 11;
const LARK_FIELD_ATTACHMENT = 17;
const READONLY_FIELD_TYPES = new Set([19, 20, 1001, 1002, 1003, 1004, 1005]);

// Cache schema THEO TỪNG BẢNG. Bản đầu dùng một biến duy nhất và bỏ qua
// `tableId` — lúc đó chỉ có mỗi `/record` đọc `TB_MASTER` nên không lộ. Thêm
// bảng thứ hai (`TB_DISPATCH`) là nó trả nhầm schema của bảng đọc trước, và
// hậu quả sẽ là "cột không tồn tại" hàng loạt hoặc ghi sai bảng.
const recordFieldMetaCache = new Map();

/** `Map(tên cột → { type, uiType })` của 1 bảng — cache 10 phút, cùng nhịp với field options. */
async function getRecordFieldMeta(env, host, appToken, token, tableId) {
  const now = Date.now();
  const hit = recordFieldMetaCache.get(tableId);
  if (hit && now < hit.expiresAt) return hit.byName;

  const url = `${host}/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/fields?page_size=200`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (data.code !== 0) throw new Error(`Đọc danh sách cột lỗi: ${data.msg} (code ${data.code})`);

  const byName = new Map();
  for (const f of data?.data?.items ?? []) byName.set(f.field_name, { type: f.type, uiType: f.ui_type });
  recordFieldMetaCache.set(tableId, { byName, expiresAt: now + FIELD_CACHE_MS });
  return byName;
}

/** Đọc ô "Thời gian" (DateTime) ra epoch ms; Lark có thể trả số hoặc chuỗi. */
function docMocThoiGian(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
    const p = Date.parse(v);
    if (Number.isFinite(p)) return p;
  }
  return null;
}

/**
 * Tính leadtime của MỘT KHÂU từ chính dữ liệu Base, thay vì tin đồng hồ của
 * trình duyệt.
 *
 * Mỗi khâu đã có sẵn 2 dòng trong bảng Master, mỗi dòng mang `Thời gian`:
 * một dòng "Tiếp nhận" và một dòng "Hoàn tất". Hiệu số của chúng là con số
 * đúng — không phụ thuộc máy nào bấm, sống qua tải lại trang, và tính ngược
 * được cho dữ liệu cũ.
 *
 * Khớp theo cặp (`STT Input`, `Loại 2`) = đúng độ mịn "một khâu của một khách".
 * Một khách có thể qua cùng một khâu HAI LẦN (vd Thu cũ làm lại), nên lấy dòng
 * Tiếp nhận MỚI NHẤT còn nằm trước mốc Hoàn tất — cùng quy tắc "dòng mới nhất
 * thắng" mà dashboard đang dùng.
 *
 * Trả `{ giay }` khi tính được, `{ lyDo }` khi không — caller đưa lý do vào
 * `skipped` để thiếu số liệu thì nhìn thấy được, thay vì im lặng bỏ trống.
 */
async function tinhLeadtimeTuBase(host, appToken, token, tableId, fm, { stt, phanLoai, mocHoanTatMs }) {
  if (!stt || !Number.isFinite(mocHoanTatMs)) return { lyDo: 'thiếu STT hoặc mốc Hoàn tất' };

  const conditions = [
    { field_name: fm.stt, operator: 'is', value: [String(stt)] },
    { field_name: fm.trangThai, operator: 'is', value: ['Tiếp nhận'] },
  ];
  // `Loại 2` phân biệt khâu. Thiếu thì vẫn tra được nhưng có thể lẫn khâu khác
  // của cùng khách — nói rõ trong lý do thay vì lặng lẽ nhận số sai.
  if (phanLoai) conditions.push({ field_name: fm.phanLoai, operator: 'is', value: [String(phanLoai)] });

  let body;
  try {
    const r = await fetch(
      `${host}/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/search?page_size=100`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          field_names: [fm.stt, fm.trangThai, fm.phanLoai, fm.thoiGian],
          filter: { conjunction: 'and', conditions },
          automatic_fields: false,
        }),
      },
    );
    body = await r.json();
  } catch (e) {
    return { lyDo: `tra dòng Tiếp nhận lỗi: ${String(e?.message || e)}` };
  }
  if (body.code !== 0) return { lyDo: `tra dòng Tiếp nhận lỗi: ${body.msg} (code ${body.code})` };

  const moc = (body.data?.items ?? [])
    .map((r) => docMocThoiGian(r.fields?.[fm.thoiGian]))
    .filter((t) => Number.isFinite(t) && t <= mocHoanTatMs)
    .sort((a, b) => b - a)[0];

  if (moc === undefined) return { lyDo: 'không tìm thấy dòng Tiếp nhận tương ứng' };

  const giay = Math.floor((mocHoanTatMs - moc) / 1000);
  // Âm = đồng hồ hai máy lệch nhau, hoặc dòng Tiếp nhận ghi sai giờ. Bỏ hơn là
  // đưa số vô nghĩa vào thống kê hiệu suất.
  if (giay < 0) return { lyDo: 'khoảng thời gian âm — đồng hồ hai máy lệch nhau' };
  return { giay };
}

/**
 * Dựng object `fields` cho Bitable từ payload + map cột, CHỈ giữ cột có thật và
 * ghi được. Trả kèm `written`/`skipped` để phản hồi nói rõ cột nào rớt và vì
 * sao — sai tên cột lộ ra ở response thay vì làm hỏng cả record.
 *
 * Dùng chung cho `/record` (bảng Master) và `/dispatch-record` (bảng Điều
 * phối): hai bảng khác schema nhưng quy tắc lọc thì giống hệt.
 */
function buildRecordFields(payload, fieldMap, meta) {
  const fields = {};
  const written = [];
  const skipped = [];
  for (const [key, column] of Object.entries(fieldMap)) {
    const raw = payload[key];
    // Payload cố tình BỎ HẲN key không áp dụng — không ghi đè cột bằng chuỗi rỗng.
    if (raw === undefined || raw === null || raw === '') continue;

    const m = meta.get(column);
    if (!m) {
      skipped.push(`${column} — bảng không có cột này`);
      continue;
    }
    if (READONLY_FIELD_TYPES.has(m.type)) {
      skipped.push(`${column} — cột tính toán/hệ thống, không ghi được`);
      continue;
    }
    if (m.type === LARK_FIELD_USER) {
      // Cùng giới hạn với automation: person field cần open_id, không điền
      // được từ tên dạng text.
      skipped.push(`${column} — cột người dùng, cần open_id`);
      continue;
    }
    const value = toCellValue(m, raw);
    if (value === null) {
      skipped.push(`${column} — giá trị không hợp với kiểu cột`);
      continue;
    }
    fields[column] = value;
    written.push(column);
  }
  return { fields, written, skipped };
}

/** Đổi giá trị payload sang đúng dạng Bitable đòi. `null` = không hợp lệ, bỏ qua cột. */
function toCellValue(meta, raw) {
  const s = String(raw);
  switch (meta.type) {
    // Ô đính kèm CHỈ nhận mảng object file_token — lý do tồn tại của route này.
    // App gửi MẢNG token (NV chọn được nhiều ảnh); vẫn nhận cả chuỗi 1 token
    // hoặc chuỗi ngăn bởi dấu phẩy để tương thích payload cũ.
    case LARK_FIELD_ATTACHMENT: {
      const tokens = (Array.isArray(raw) ? raw : s.split(','))
        .map((t) => String(t).trim())
        .filter(Boolean);
      return tokens.length ? tokens.map((file_token) => ({ file_token })) : null;
    }
    case LARK_FIELD_DATE: {
      const n = typeof raw === 'number' ? raw : Date.parse(s);
      return Number.isFinite(n) ? n : null;
    }
    case LARK_FIELD_NUMBER: {
      const n = typeof raw === 'number' ? raw : Number(raw);
      if (Number.isFinite(n)) return n;
      // "Thời gian" ở base này là cột số lưu epoch ms, mà app gửi ISO string.
      const parsed = Date.parse(s);
      return Number.isFinite(parsed) ? parsed : null;
    }
    case LARK_FIELD_CHECKBOX:
      return raw === true || s === 'true' || s === 'Có';
    // Text / single select / barcode / URL… đều nhận string.
    default:
      return s;
  }
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    const segments = new URL(request.url).pathname.split('/').filter(Boolean);
    const table = segments[segments.length - 1];
    // Khớp theo 2 segment CUỐI, không phải full path: "API URL" người dùng cấu
    // hình có thể là `https://worker` hoặc `https://worker/api/lark` — cùng cơ
    // chế với việc lấy tên bảng ở segment cuối bên dưới.
    const route = segments.slice(-2).join('/');
    const host = (env.LARK_HOST || 'https://open.larksuite.com').replace(/\/+$/, '');

    // ── Admin login ────────────────────────────────────────────────────────
    if (request.method === 'POST' && route === 'admin/login') {
      if (!env.ADMIN_SESSION_SECRET) {
        return json({ code: -1, msg: 'Chưa cấu hình ADMIN_SESSION_SECRET' }, 500);
      }
      let body = {};
      try {
        body = await request.json();
      } catch {
        return json({ code: -1, msg: 'Body không phải JSON' }, 400);
      }
      const username = String(body.username ?? '').trim();
      let role = 'admin';
      let desk = '';
      let valid = false;
      if (username.toLowerCase() === 'admin') {
        // Admin PHẢI có mật khẩu (2026-08-12, yêu cầu user — trước đây đăng
        // nhập admin không cần gì cả, tức ai biết URL worker cũng đẩy được
        // cấu hình cho toàn bộ 38 máy).
        //
        // Thiếu secret thì TỪ CHỐI, không rơi về chế độ không mật khẩu: im
        // lặng cho qua là để lại đúng lỗ hổng vừa vá. Báo rõ để người cấu hình
        // biết phải chạy `wrangler secret put ADMIN_PASSWORD`.
        if (!env.ADMIN_PASSWORD) {
          return json({ code: -1, msg: 'Chưa cấu hình ADMIN_PASSWORD trên worker' }, 500);
        }
        valid = safeEqual(String(body.password ?? ''), env.ADMIN_PASSWORD);
      } else if (isStaffDesk(username) && env.STAFF_PASSWORD) {
        valid = safeEqual(String(body.password ?? ''), env.STAFF_PASSWORD);
        role = 'staff';
        desk = username.toUpperCase();
      }
      // Sai user và sai mật khẩu trả về CÙNG một thông báo — không tiết lộ
      // username nào có thật.
      if (!valid) {
        return json({ code: -1, msg: 'Sai tài khoản hoặc mật khẩu' }, 401);
      }
      return json({ code: 0, msg: 'success', data: { token: await issueToken(env, role, desk), ttlMs: SESSION_TTL_MS, role, desk } });
    }

    // ── Danh sách điều phối viên (cấu hình dùng chung) ──────────────────────
    if (route === 'config/coordinators') {
      if (!env.CONFIG) return json({ code: -1, msg: 'Thiếu KV binding "CONFIG"' }, 500);

      if (request.method === 'GET') {
        // ĐỌC CÔNG KHAI: máy điều phối cần đọc danh sách này lúc khởi động mà
        // không phải đăng nhập admin. Nội dung chỉ là tên/vị trí NV, không có
        // gì bí mật; mọi thao tác GHI vẫn phải có token admin bên dưới.
        const raw = await env.CONFIG.get(KV_COORDINATORS);
        return json({ code: 0, msg: 'success', data: raw ? JSON.parse(raw) : { coordinators: [], updatedAt: null } });
      }

      if (request.method === 'PUT') {
        if ((await verifyToken(env, bearer(request)))?.role !== 'admin') {
          return json({ code: -1, msg: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' }, 401);
        }
        let body = {};
        try {
          body = await request.json();
        } catch {
          return json({ code: -1, msg: 'Body không phải JSON' }, 400);
        }
        if (!Array.isArray(body.coordinators)) {
          return json({ code: -1, msg: 'Thiếu mảng "coordinators"' }, 400);
        }
        // Chuẩn hoá tại server: máy điều phối luôn đọc được đúng 4 field, dù
        // client gửi thừa/thiếu gì.
        const coordinators = body.coordinators.map((c) => ({
          id: String(c?.id ?? '').trim(),
          msnv: String(c?.msnv ?? '').trim(),
          name: String(c?.name ?? '').trim(),
          position: String(c?.position ?? '').trim(),
        }));
        const payload = { coordinators, updatedAt: new Date().toISOString() };
        await env.CONFIG.put(KV_COORDINATORS, JSON.stringify(payload));
        return json({ code: 0, msg: 'success', data: payload });
      }
    }

    // ── Cấu hình Lark dùng chung mọi máy ───────────────────────────────────
    // GET công khai (máy NV/điều phối đọc lúc khởi động + mỗi 30s, không cần
    // đăng nhập); PUT bắt buộc token admin — y hệt `/config/coordinators`.
    if (route === 'config/app') {
      if (!env.CONFIG) return json({ code: -1, msg: 'Thiếu KV binding "CONFIG"' }, 500);

      if (request.method === 'GET') {
        const raw = await env.CONFIG.get(KV_APP_SETTINGS);
        return json({
          code: 0,
          msg: 'success',
          data: raw ? JSON.parse(raw) : { settings: null, updatedAt: null },
        });
      }

      if (request.method === 'PUT') {
        if ((await verifyToken(env, bearer(request)))?.role !== 'admin') {
          return json({ code: -1, msg: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' }, 401);
        }
        let body = {};
        try {
          body = await request.json();
        } catch {
          return json({ code: -1, msg: 'Body không phải JSON' }, 400);
        }
        const payload = {
          settings: normalizeAppSettings(body.settings),
          updatedAt: new Date().toISOString(),
        };
        await env.CONFIG.put(KV_APP_SETTINGS, JSON.stringify(payload));
        return json({ code: 0, msg: 'success', data: payload });
      }
    }

    // `POST /webhook` — chuyển tiếp form "Điều phối" tới webhook Lark đặt sẵn
    // trong secret `LARK_WEBHOOK_URL`. Chỉ để LÁCH CORS (URL webhook gốc của
    // Lark không trả header CORS nên trình duyệt không đọc được phản hồi):
    // dashboard trỏ "Webhook URL" vào đây thì mới biết chắc Lark nhận hay
    // chưa. KHÔNG nhận URL đích từ client — tránh biến Worker thành open proxy.
    // KHÔNG đòi token ở đây (gỡ 2026-08-11): máy điều phối không còn phải đăng
    // nhập để vận hành, nên bắt token sẽ làm mọi lần submit trả 401. Đăng nhập
    // giờ chỉ chặn việc ĐỔI điều phối viên của máy + sửa danh sách
    // (`/config/coordinators` PUT vẫn đòi token như cũ).
    // Hệ quả phải chấp nhận: ai biết URL worker đều POST được vào đây.
    //
    // `POST /webhook2` (2026-08-12) — ĐÍCH THỨ HAI, secret `LARK_WEBHOOK_URL2`:
    // workflow Lark riêng cho 2 nút Tiếp nhận / Hoàn tất ở màn hình nhân viên
    // (`#/tv4`…), tạo record trong SS_Master. Vẫn giữ nguyên nguyên tắc trên:
    // client CHỈ chọn được 1 trong 2 nhánh có sẵn, không bao giờ gửi URL đích.
    // ── `POST /upload` (2026-08-12) — ảnh nghiệm thu ở form Hoàn tất ───────
    //
    // Cột đính kèm bên Bitable KHÔNG nhận được ảnh từ 1 chuỗi text/base64 —
    // bắt buộc phải có `file_token` do chính Lark cấp. Route này nhận file từ
    // điện thoại NV (multipart `file`), upload bằng `tenant_access_token` của
    // worker (app_id/secret KHÔNG BAO GIỜ ra tới client), rồi trả `file_token`
    // để app gắn vào JSON gửi `/webhook2`. Automation Lark map token đó vào
    // cột đính kèm.
    //
    // `parent_type: bitable_file` + `parent_node: <app_token>` là cặp bắt buộc
    // để file thuộc về đúng Base — dùng `resolveAppToken` y như đường đọc dữ
    // liệu, nên Base nhúng trong Wiki cũng đúng (xem module doc).
    //
    // KHÔNG đòi token đăng nhập: cùng lý do đã bỏ ở `/webhook` (máy NV không
    // duy trì phiên admin). Đánh đổi đã biết: ai có URL worker đều upload
    // được. Có giới hạn 10MB để không biến worker thành kho ảnh miễn phí.
    // ── `GET /fields` (2026-08-12) — soi schema bảng ghi record ────────────
    //
    // Trả tên + kiểu từng cột, kèm kết quả đối chiếu với map tương ứng: cột nào
    // khớp, cột nào sai tên, cột nào không ghi được. Dùng để kiểm tra map TRƯỚC
    // khi bấm thử ca thật — khỏi tốn 1 record rác mới biết lệch tên.
    //
    // `?table=dispatch` soi bảng Điều phối (đối chiếu `DISPATCH_FIELD_MAP`);
    // mặc định là bảng Master (`RECORD_FIELD_MAP`).
    if (request.method === 'GET' && table === 'fields') {
      if (!env.LARK_APP_TOKEN) return json({ code: -1, msg: 'Chưa cấu hình LARK_APP_TOKEN' }, 500);
      const which = new URL(request.url).searchParams.get('table') === 'dispatch' ? 'dispatch' : 'master';
      const fieldsTableId = which === 'dispatch' ? env.TB_DISPATCH : env.TB_MASTER;
      if (!fieldsTableId) {
        return json({ code: -1, msg: `Chưa cấu hình ${which === 'dispatch' ? 'TB_DISPATCH' : 'TB_MASTER'}` }, 500);
      }
      const activeMap = which === 'dispatch' ? DISPATCH_FIELD_MAP : RECORD_FIELD_MAP;
      try {
        const bearerToken = await getToken(env, host);
        const appToken = await resolveAppToken(env, host, env.LARK_APP_TOKEN);
        const meta = await getRecordFieldMeta(env, host, appToken, bearerToken, fieldsTableId);

        const columns = [...meta.entries()].map(([name, m]) => ({
          name,
          type: m.type,
          uiType: m.uiType ?? null,
        }));
        // Ba cột mã bàn của bảng Điều phối không nằm trong map (chọn theo
        // `phanLoai` lúc chạy) — vẫn phải đối chiếu, nếu không sai tên 1 trong
        // 3 cột sẽ chỉ lộ ra khi có ca thật đúng khâu đó.
        const extra =
          which === 'dispatch'
            ? Object.entries(DISPATCH_DESK_COLUMN).map(([loai, column]) => {
                const m = meta.get(column);
                return m
                  ? { key: `maBan (${loai})`, column, ok: !READONLY_FIELD_TYPES.has(m.type), type: m.type, uiType: m.uiType ?? null }
                  : { key: `maBan (${loai})`, column, ok: false, reason: 'bảng không có cột này' };
              })
            : [];
        const mapping = Object.entries(activeMap).map(([key, column]) => {
          const m = meta.get(column);
          if (!m) return { key, column, ok: false, reason: 'bảng không có cột này' };
          if (READONLY_FIELD_TYPES.has(m.type)) return { key, column, ok: false, reason: 'cột tính toán/hệ thống' };
          if (m.type === LARK_FIELD_USER) return { key, column, ok: false, reason: 'cột người dùng, cần open_id' };
          return { key, column, ok: true, type: m.type, uiType: m.uiType ?? null };
        });
        return json({ code: 0, msg: 'success', data: { table: which, tableId: fieldsTableId, columns, mapping: [...mapping, ...extra] } });
      } catch (e) {
        return json({ code: -1, msg: String(e?.message || e) }, 500);
      }
    }

    // ── `GET /media/<file_token>` (2026-08-12) — xem lại ảnh từ token ──────
    //
    // `file_token` KHÔNG phải URL: muốn ra ảnh phải gọi API tải của Lark kèm
    // `tenant_access_token`, mà token đó ký bằng app_id/app_secret (secret của
    // worker, không bao giờ ra tới trình duyệt). Route này ký hộ rồi stream
    // ảnh về, để mở thẳng bằng trình duyệt là thấy.
    //
    // CÔNG DỤNG: soi lỗi ("token này có ra ảnh thật không?"). Đường chính để
    // ảnh hiện trong Base vẫn là ghi token vào cột đính kèm qua `/record`.
    //
    // ĐÁNH ĐỔI ĐÃ BIẾT: không đòi đăng nhập nên ai có URL worker + 1 token hợp
    // lệ đều tải được file đó. Token là chuỗi ngẫu nhiên không đoán được, và
    // route chỉ ĐỌC. Không cần nữa thì xoá hẳn khối này rồi deploy lại.
    if (request.method === 'GET' && route.startsWith('media/')) {
      const fileToken = table;
      if (!fileToken) return json({ code: -1, msg: 'Thiếu file_token' }, 400);
      try {
        const bearerToken = await getToken(env, host);
        const r = await fetch(
          `${host}/open-apis/drive/v1/medias/${encodeURIComponent(fileToken)}/download`,
          { headers: { Authorization: `Bearer ${bearerToken}` } },
        );
        // Lark báo lỗi bằng JSON; tải được thì trả thẳng bytes ảnh.
        const contentType = r.headers.get('Content-Type') || '';
        if (!r.ok || contentType.includes('application/json')) {
          const detail = await r.text();
          return json({ code: -1, msg: `Lark không trả ảnh (HTTP ${r.status})`, data: { body: detail } }, 502);
        }
        return new Response(r.body, {
          status: 200,
          headers: {
            'Content-Type': contentType || 'application/octet-stream',
            'Cache-Control': 'private, max-age=300',
            ...CORS,
          },
        });
      } catch (e) {
        return json({ code: -1, msg: String(e?.message || e) }, 500);
      }
    }

    if (request.method === 'POST' && table === 'upload') {
      if (!env.LARK_APP_TOKEN) return json({ code: -1, msg: 'Chưa cấu hình LARK_APP_TOKEN' }, 500);
      // Chặn trước khi `formData()` tự ném: probe bằng `curl -X POST` rỗng là
      // cách kiểm tra route đã deploy chưa, nên nó phải trả câu dễ hiểu thay
      // vì lỗi nội bộ "Parsing a Body as FormData requires a Content-Type".
      if (!(request.headers.get('Content-Type') || '').includes('multipart/form-data')) {
        return json({ code: -1, msg: 'Thiếu file (route /upload đang hoạt động)' }, 400);
      }
      try {
        const inbound = await request.formData();
        const file = inbound.get('file');
        if (!file || typeof file === 'string') return json({ code: -1, msg: 'Thiếu file' }, 400);
        const size = file.size ?? 0;
        if (size <= 0) return json({ code: -1, msg: 'File rỗng' }, 400);
        if (size > 10 * 1024 * 1024) return json({ code: -1, msg: 'Ảnh vượt 10MB' }, 413);

        const bearerToken = await getToken(env, host);
        const appToken = await resolveAppToken(env, host, env.LARK_APP_TOKEN);

        // `size` phải là số byte THẬT — Lark từ chối nếu lệch với file gửi kèm.
        const outbound = new FormData();
        outbound.append('file_name', file.name || 'nghiem-thu.jpg');
        outbound.append('parent_type', 'bitable_file');
        outbound.append('parent_node', appToken);
        outbound.append('size', String(size));
        outbound.append('file', file, file.name || 'nghiem-thu.jpg');

        const r = await fetch(`${host}/open-apis/drive/v1/medias/upload_all`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${bearerToken}` },
          body: outbound,
        });
        const j = await r.json();
        if (j.code !== 0 || !j.data?.file_token) {
          return json({ code: -1, msg: `Lark upload lỗi: ${j.msg || r.status}` }, 502);
        }
        return json({ code: 0, msg: 'success', data: { fileToken: j.data.file_token } });
      } catch (e) {
        return json({ code: -1, msg: String(e?.message || e) }, 500);
      }
    }

    // ── `POST /dispatch-record` (2026-08-13) — Điều phối ghi thẳng ─────────
    //
    // Vì sao có route này: `/webhook` chỉ CHÂM NGÒI một Lark Automation. Lark
    // trả 200 nghĩa là "đã nhận trigger", không phải "đã tạo record" — phần
    // ghi chạy bất đồng bộ trong hàng đợi của Lark, và khi trigger đến nhanh
    // hơn tốc độ hàng đợi thì run bị bỏ. Đo được trên production: tỉ lệ mất
    // tăng theo mức đồng thời — 19% ở 10 request, 38% ở 15, 43% ở 20; nhịp
    // thưa vẫn mất 6,5%. Người gọi KHÔNG có cách nào biết vì 200 đã trả rồi.
    //
    // Route này gọi thẳng Bitable API như `/record`: worker giữ kết nối tới
    // khi Lark xác nhận, lỗi thì trả `code != 0` để client thấy ngay.
    //
    // **Drop-in thay `/webhook`**: nhận ĐÚNG payload `DispatchFormPayload` app
    // đang gửi, trả cùng khuôn `{code, msg}`. Đổi đường = sửa ô "Webhook Điều
    // phối" trong Cài đặt sang `/dispatch-record`; dán lại URL cũ là rollback.
    if (request.method === 'POST' && table === 'dispatch-record') {
      if (!env.LARK_APP_TOKEN) return json({ code: -1, msg: 'Chưa cấu hình LARK_APP_TOKEN' }, 500);
      const dispatchTableId = env.TB_DISPATCH;
      if (!dispatchTableId) return json({ code: -1, msg: 'Chưa cấu hình TB_DISPATCH' }, 500);

      let payload;
      try {
        payload = await request.json();
      } catch {
        return json({ code: -1, msg: 'Body không phải JSON' }, 400);
      }

      try {
        const bearerToken = await getToken(env, host);
        const appToken = await resolveAppToken(env, host, env.LARK_APP_TOKEN);
        const meta = await getRecordFieldMeta(env, host, appToken, bearerToken, dispatchTableId);

        const { fields, written, skipped } = buildRecordFields(payload, DISPATCH_FIELD_MAP, meta);

        // Mã bàn vào đúng 1 trong 3 cột theo khâu. `phanLoai` lạ thì BỎ QUA và
        // nói rõ, thay vì đoán bừa một cột — ghi nhầm cột là dashboard đọc sai
        // khâu, tệ hơn là thiếu hẳn.
        const maBan = String(payload.maBan ?? '').trim();
        const deskColumn = DISPATCH_DESK_COLUMN[String(payload.phanLoai ?? '').trim()];
        if (maBan && !deskColumn) {
          skipped.push(`maBan — phân loại "${payload.phanLoai}" không khớp khâu nào`);
        } else if (maBan && deskColumn) {
          const m = meta.get(deskColumn);
          if (!m) skipped.push(`${deskColumn} — bảng không có cột này`);
          else if (READONLY_FIELD_TYPES.has(m.type)) skipped.push(`${deskColumn} — cột tính toán/hệ thống`);
          else {
            const value = toCellValue(m, maBan);
            if (value === null) skipped.push(`${deskColumn} — giá trị không hợp với kiểu cột`);
            else {
              fields[deskColumn] = value;
              written.push(deskColumn);
            }
          }
        }

        if (written.length === 0) {
          return json({ code: -1, msg: `Không map được cột nào. ${skipped.join(' | ')}` }, 400);
        }

        const r = await fetch(
          `${host}/open-apis/bitable/v1/apps/${appToken}/tables/${dispatchTableId}/records`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${bearerToken}`,
              'Content-Type': 'application/json; charset=utf-8',
            },
            body: JSON.stringify({ fields }),
          },
        );
        const j = await r.json();
        if (j.code !== 0) {
          return json(
            { code: -1, msg: `Lark ghi record Điều phối lỗi: ${j.msg} (code ${j.code})`, data: { skipped } },
            502,
          );
        }
        invalidateDashboardSnapshot();
        return json({
          code: 0,
          msg: 'success',
          data: { recordId: j.data?.record?.record_id ?? null, written, skipped },
        });
      } catch (e) {
        return json({ code: -1, msg: String(e?.message || e) }, 500);
      }
    }

    // ── `POST /record` (2026-08-12) — GHI THẲNG record, thay automation ────
    //
    // Vì sao có route này: ô ĐÍNH KÈM bên Bitable đòi giá trị dạng
    // `[{"file_token": "..."}]` (mảng object), trong khi automation "Add
    // record" chỉ kéo được 1 tham số TEXT vào ô đó — nên ảnh nghiệm thu gần
    // như chắc chắn không vào được nếu đi đường automation. Route này gọi
    // thẳng Bitable API, nơi định dạng trên là chính thức.
    //
    // **Drop-in thay `/webhook2`**: nhận ĐÚNG payload app đang gửi và trả
    // cùng khuôn `{code, msg}` — muốn đổi đường chỉ cần sửa ô "Webhook Tiếp
    // nhận / Hoàn tất" trong Cài đặt từ `/webhook2` sang `/record`. Dán lại
    // URL cũ là quay về automation, không phải sửa/deploy gì.
    //
    // **Tự dò schema thay vì tin vào tên cột hardcode**: đọc field metadata
    // của bảng rồi CHỈ ghi cột nào có thật + ghi được, cột nào không thì bỏ
    // qua và liệt kê trong `data.skipped`. Sai tên cột sẽ hiện ra rõ ràng ở
    // phản hồi thay vì làm hỏng cả record (bài học "im lặng thành công" của
    // key `dsMaster` thiếu trong TABLE_ENV).
    if (request.method === 'POST' && table === 'record') {
      if (!env.LARK_APP_TOKEN) return json({ code: -1, msg: 'Chưa cấu hình LARK_APP_TOKEN' }, 500);
      const recordTableId = env.TB_MASTER;
      if (!recordTableId) return json({ code: -1, msg: 'Chưa cấu hình TB_MASTER' }, 500);

      let payload;
      try {
        payload = await request.json();
      } catch {
        return json({ code: -1, msg: 'Body không phải JSON' }, 400);
      }

      try {
        const bearerToken = await getToken(env, host);
        const appToken = await resolveAppToken(env, host, env.LARK_APP_TOKEN);
        const meta = await getRecordFieldMeta(env, host, appToken, bearerToken, recordTableId);

        const { fields, written, skipped } = buildRecordFields(payload, RECORD_FIELD_MAP, meta);

        // Leadtime khâu này: worker tự tính từ dữ liệu Base thay vì tin đồng hồ
        // trình duyệt. Chỉ chạy khi Hoàn tất — lúc Tiếp nhận chưa có gì để trừ.
        //
        // Hỏng ở đây KHÔNG chặn việc ghi record: leadtime là số liệu phụ, mất
        // nó thì tiếc, nhưng mất bản ghi Hoàn tất thì hỏng cả vận hành.
        let leadtime = null;
        if (String(payload.action ?? '') === 'hoan_tat') {
          const cot = meta.get(COT_LEADTIME_GIAY);
          if (!cot) {
            skipped.push(`${COT_LEADTIME_GIAY} — bảng không có cột này`);
          } else if (READONLY_FIELD_TYPES.has(cot.type)) {
            skipped.push(`${COT_LEADTIME_GIAY} — cột tính toán/hệ thống, không ghi được`);
          } else {
            leadtime = await tinhLeadtimeTuBase(
              host,
              appToken,
              bearerToken,
              recordTableId,
              {
                stt: RECORD_FIELD_MAP.stt,
                trangThai: RECORD_FIELD_MAP.trangThai,
                phanLoai: RECORD_FIELD_MAP.phanLoai,
                thoiGian: RECORD_FIELD_MAP.thoiGian,
              },
              {
                stt: String(payload.stt ?? '').trim(),
                phanLoai: String(payload.phanLoai ?? '').trim(),
                mocHoanTatMs: Date.parse(String(payload.thoiGian ?? '')),
              },
            );
            if (leadtime.giay === undefined) {
              skipped.push(`${COT_LEADTIME_GIAY} — ${leadtime.lyDo}`);
            } else {
              // Cột đang là Text; `toCellValue` tự chuyển theo kiểu thật, nên
              // đổi cột sang Number bên Lark là chạy luôn, không phải sửa code.
              fields[COT_LEADTIME_GIAY] = toCellValue(cot, leadtime.giay);
              written.push(COT_LEADTIME_GIAY);
            }
          }
        }

        if (written.length === 0) {
          return json({ code: -1, msg: `Không map được cột nào. ${skipped.join(' | ')}` }, 400);
        }

        const r = await fetch(
          `${host}/open-apis/bitable/v1/apps/${appToken}/tables/${recordTableId}/records`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${bearerToken}`,
              'Content-Type': 'application/json; charset=utf-8',
            },
            body: JSON.stringify({ fields }),
          },
        );
        const j = await r.json();
        if (j.code !== 0) {
          return json(
            { code: -1, msg: `Lark ghi record lỗi: ${j.msg} (code ${j.code})`, data: { skipped } },
            502,
          );
        }
        invalidateDashboardSnapshot();
        return json({
          code: 0,
          msg: 'success',
          data: {
            recordId: j.data?.record?.record_id ?? null,
            written,
            skipped,
            // Số worker vừa tính, để soi nhanh mà không phải mở Base.
            leadtimeGiay: leadtime?.giay ?? null,
          },
        });
      } catch (e) {
        return json({ code: -1, msg: String(e?.message || e) }, 500);
      }
    }

    if (request.method === 'POST' && (table === 'webhook' || table === 'webhook2')) {
      const secretName = table === 'webhook2' ? 'LARK_WEBHOOK_URL2' : 'LARK_WEBHOOK_URL';
      const target = env[secretName];
      if (!target) return json({ code: -1, msg: `Missing Cloudflare secret "${secretName}"` }, 500);
      try {
        const r = await fetch(target, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: await request.text(),
        });
        const text = await r.text();
        if (r.ok) invalidateDashboardSnapshot();
        return json({ code: r.ok ? 0 : -1, msg: r.ok ? 'success' : `Lark HTTP ${r.status}`, data: { body: text } }, r.ok ? 200 : 502);
      } catch (e) {
        return json({ code: -1, msg: String(e?.message || e) }, 500);
      }
    }

    if (table === '' || table === 'health') {
      return json({ code: 0, msg: 'ok', tables: Object.keys(TABLE_ENV) });
    }

    if (request.method === 'GET' && route === 'dashboard/snapshot') {
      try {
        return json(await getDashboardSnapshot(env, host));
      } catch (e) {
        return json({ code: -1, msg: String(e?.message || e), data: { tables: {} } }, 500);
      }
    }

    const envKey = TABLE_ENV[table];
    const tableId = envKey ? env[envKey] : undefined;

    // Thiếu secret (hoặc key bảng không tồn tại trong TABLE_ENV) — báo lỗi rõ
    // ràng thay vì giả vờ thành công. Trước đây trả `code:0, items:[]` trông
    // Y HỆT 1 bảng thật sự rỗng — bug thật 2026-08-06 (thiếu hẳn key
    // "dsMaster") mất nhiều vòng debug mới lộ ra vì im lặng "thành công".
    if (!envKey) return json({ code: -1, msg: `Unknown table key "${table}"`, data: { items: [] } }, 400);
    if (!tableId) return json({ code: -1, msg: `Missing Cloudflare secret "${envKey}" for table "${table}"`, data: { items: [] } }, 500);

    try {
      const token = await getToken(env, host);
      const appToken = await resolveAppToken(env, host, env.LARK_APP_TOKEN);
      const items = await readTableRecords(env, host, table, token, appToken);
      return json({ code: 0, msg: 'success', data: { items, has_more: false, total: items.length } });
    } catch (e) {
      return json({ code: -1, msg: String(e?.message || e), data: { items: [] } }, 500);
    }
  },
};
