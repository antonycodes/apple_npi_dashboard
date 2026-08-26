import { DurableObject } from 'cloudflare:workers';

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
 * `STAFF_PASSWORD` = mật khẩu dùng chung cho tài khoản con TV/TC/BK (đặt 0000)
 * — chỉ còn để đỡ link riêng từng bàn đã phát ra ngoài. Từ 2026-08-19 tài khoản
 * THẬT nằm ở `Master_DS` (`NPI_AIO_User`/`NPI_AIO_Pass`, xem `readRoster`), user
 * tự đổi mật khẩu trong Base không cần deploy. Xoá secret này là tắt hẳn đường cũ.
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

/**
 * Hạn giờ cho MỘT lượt gọi Lark (2026-08-19).
 *
 * Vì sao cần: `fetch` không có hạn mặc định, nên một request Lark treo là treo
 * theo cả snapshot. Đo thực tế hôm nay: đọc từng bảng tuần tự 1.7–2.9 giây,
 * nhưng bắn 5 bảng SONG SONG thì 4/6 lần không trả về trong 25 giây. Phía
 * trình duyệt, vòng poll chỉ hẹn lượt sau khi lượt hiện tại xong → màn hình
 * đứng im ở dữ liệu cũ, không báo lỗi, phải tải lại trang mới sống.
 *
 * 8 giây là gấp ~3 lần lượt đọc chậm nhất đo được, đủ rộng để không cắt nhầm
 * lượt đọc bình thường.
 */
const LARK_FETCH_TIMEOUT_MS = 8000;

async function fetchCoHanGio(url, init = {}, timeoutMs = LARK_FETCH_TIMEOUT_MS) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } catch (error) {
    if (ctl.signal.aborted) throw new Error(`Lark không trả lời trong ${timeoutMs / 1000}s`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Hạn giờ + thử lại 1 lần cho 2 lượt gọi CHUẨN BỊ (lấy token, giải app_token).
 *
 * Vì sao tách riêng khỏi `LARK_FETCH_TIMEOUT_MS` (2026-08-19, sau khi đo lại):
 * đặt hạn 8 giây cho phần đọc bảng vẫn còn 2/8 lượt snapshot treo quá 30 giây,
 * mà `warnings` rỗng — tức chỗ treo KHÔNG nằm trong phần đọc bảng. Còn đúng 2
 * lượt gọi chưa có hạn là ở đây, và chúng cache theo ISOLATE của Cloudflare
 * (mỗi isolate mới là gọi lại), khớp đúng kiểu treo ngẫu nhiên quan sát được.
 *
 * **An toàn cho cả đường GHI** dù `getToken` cũng phục vụ ghi: cắt ở bước lấy
 * token là cắt TRƯỚC khi có bất kỳ record nào được tạo, nên không có nguy cơ
 * ghi trùng — chỉ đổi "quay vòng vô tận" thành "báo lỗi rõ để bấm lại".
 */
const LARK_AUTH_TIMEOUT_MS = 6000;

async function fetchAuthCoHanGio(url, init) {
  try {
    return await fetchCoHanGio(url, init, LARK_AUTH_TIMEOUT_MS);
  } catch {
    // Thử lại đúng 1 lần: đây là lượt gọi chặn TẤT CẢ việc khác, mà lỗi hay gặp
    // là một cú chậm nhất thời chứ không phải hỏng thật.
    return fetchCoHanGio(url, init, LARK_AUTH_TIMEOUT_MS);
  }
}

async function getToken(env, host) {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;
  const r = await fetchAuthCoHanGio(`${host}/open-apis/auth/v3/tenant_access_token/internal`, {
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
    const r = await fetchAuthCoHanGio(
      `${host}/open-apis/wiki/v2/spaces/get_node?token=${encodeURIComponent(token)}`,
      { headers: { Authorization: `Bearer ${bearer}` } },
    );
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
    sleepMode: Boolean(s.sleepMode),
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
  if ((role === 'staff' || role === 'dieuphoi') && !desk) return null;
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

// ── Roster tài khoản đọc từ `Master_DS` (2026-08-19) ─────────────────────────
//
// Trước đây tài khoản là danh sách CỨNG trong code (`isStaffDesk`) + một mật
// khẩu dùng chung (`STAFF_PASSWORD`). Giờ mỗi nhân sự có dòng riêng trong
// `Master_DS` với `NPI_AIO_User`/`NPI_AIO_Pass`, nên nguồn tài khoản là chính
// bảng đó: user đổi mật khẩu trong Base là có hiệu lực sau tối đa
// `ROSTER_TTL_MS`, KHÔNG cần deploy lại worker.
//
// Đường cũ vẫn giữ (xem `/admin/login`) để link riêng từng bàn đã phát ra
// ngoài không chết giữa sự kiện — nhưng chỉ sống khi `STAFF_PASSWORD` còn đặt.

/**
 * Cột tài khoản/mật khẩu app trong `Master_DS` (user tạo 2026-08-19).
 *
 * `NPI_AIO_User` là cột FORMULA (thường trả MSNV), `NPI_AIO_Pass` là cột chữ
 * user tự sửa trong Base. Đây là NGUỒN DUY NHẤT của danh sách tài khoản — web
 * và worker không có bảng tài khoản nào khác ngoài `admin`.
 */
// ⚠️ TÊN CỘT VIẾT THẲNG, KHÔNG qua hằng trung gian (bài học 2026-08-19): bản
// trước đặt `user: AIO_USER_FIELD` với hằng khai báo ở CUỐI file. Node ném lỗi
// TDZ ngay, nhưng bundler của wrangler biến nó thành `undefined` LẶNG LẼ —
// worker vẫn chạy, chỉ là đi tìm cột tên `undefined`, nên MỌI lần đăng nhập
// đều báo "sai tài khoản hoặc mật khẩu" mà log không có lỗi nào. Chuỗi viết
// tại chỗ thì không có thứ tự khai báo nào để mà sai.

/** Các cột của `Master_DS` mà việc đăng nhập cần. Đổi tên cột bên Base là phải sửa ở đây. */
const ROSTER_FIELDS = {
  user: 'NPI_AIO_User',
  pass: 'NPI_AIO_Pass',
  desk: 'STT bàn',
  loai: 'Loại',
  msnv: 'MSNV',
  name: 'NV Tư vấn',
};

/**
 * Các cột KHÔNG BAO GIỜ được rời khỏi worker theo đường đọc dashboard.
 * Cũng viết thẳng chuỗi, vì `stripSecretFields` là hàng rào chặn rò mật khẩu —
 * nó mà đọc phải `undefined` thì rò toàn bộ roster ra mọi máy khách.
 */
const SECRET_DS_FIELDS = ['NPI_AIO_User', 'NPI_AIO_Pass'];

/**
 * Ô Bitable → chuỗi. Mỗi kiểu cột trả một hình dạng khác nhau: text là mảng
 * đoạn `[{text}]`, formula là `{type, value:[…]}`, person là `[{name,…}]`,
 * số là number. Không chuẩn hoá thì `NPI_AIO_User` (cột formula) đọc ra
 * `[object Object]` và không ai đăng nhập được.
 */
function cellText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    // Mảng đoạn văn bản phải nối LIỀN ("S08" + "380"); mảng người/option thì
    // nối bằng khoảng trắng cho dễ đọc.
    const allSegments = value.every((p) => p && typeof p === 'object' && typeof p.text === 'string');
    const parts = value.map(cellText).filter(Boolean);
    return (allSegments ? parts.join('') : parts.join(' ')).trim();
  }
  if (typeof value === 'object') {
    if (Array.isArray(value.value)) return cellText(value.value);
    for (const k of ['text', 'name', 'en_name', 'value', 'full_name']) {
      if (typeof value[k] === 'string') return value[k].trim();
      if (typeof value[k] === 'number') return String(value[k]);
    }
  }
  return '';
}

/** Bỏ dấu + viết thường, để so "Kho"/"KHO"/"kho " như nhau. */
function normalizeLoai(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/gi, 'd')
    .trim()
    .toLowerCase();
}

/**
 * Lấy ô theo tên cột, CHỊU ĐƯỢC lệch nhẹ: khớp đúng tên trước, không có thì
 * khớp bỏ qua hoa/thường và khoảng trắng thừa.
 *
 * Cột trong Base do người dùng tự tạo, và một dấu cách vô hình ở cuối tên cột
 * đủ để cả roster đọc ra rỗng — tức KHÔNG AI đăng nhập được, với thông báo
 * "sai mật khẩu" không hé lộ nguyên nhân thật.
 */
function pickField(fields, wanted) {
  if (wanted in fields) return fields[wanted];
  const target = String(wanted).trim().toLowerCase();
  for (const key of Object.keys(fields)) {
    if (key.trim().toLowerCase() === target) return fields[key];
  }
  return undefined;
}

const ROSTER_TTL_MS = 60 * 1000;
let rosterCache = null;

/**
 * Danh sách tài khoản từ `Master_DS`, cache 60 giây.
 *
 * Cache ngắn cố ý: đủ để một đợt đăng nhập đầu giờ không bắn 300 request vào
 * Lark, mà vẫn đảm bảo user sửa mật khẩu trong Base là chậm nhất 1 phút sau có
 * hiệu lực — đúng như đã hứa trong bản kế hoạch.
 */
async function readRoster(env, host) {
  if (rosterCache && Date.now() < rosterCache.expiresAt) return rosterCache.rows;

  const token = await getToken(env, host);
  const appToken = await resolveAppToken(env, host, env.LARK_APP_TOKEN);
  // `includeSecrets` — ĐÂY là chỗ duy nhất trong worker được đọc cột mật khẩu.
  const items = await readTableRecords(env, host, 'dsMaster', token, appToken, { includeSecrets: true });

  const rows = [];
  for (const item of items) {
    const f = item?.fields ?? {};
    const user = cellText(pickField(f, ROSTER_FIELDS.user));
    if (!user) continue;
    rows.push({
      user,
      pass: cellText(pickField(f, ROSTER_FIELDS.pass)),
      desk: cellText(pickField(f, ROSTER_FIELDS.desk)).toUpperCase().replace(/\s+/g, ''),
      loai: cellText(pickField(f, ROSTER_FIELDS.loai)),
      msnv: cellText(pickField(f, ROSTER_FIELDS.msnv)),
      name: cellText(pickField(f, ROSTER_FIELDS.name)),
    });
  }
  rosterCache = { rows, expiresAt: Date.now() + ROSTER_TTL_MS };
  return rows;
}

/**
 * Vai trò của MỘT DÒNG roster, suy từ cột `Loại`; `Loại` bỏ trống thì suy tiếp
 * từ tiền tố mã bàn.
 *
 * Roster thật có 4 nhóm: Tư vấn/Thu cũ/Backup (bàn phục vụ), Kho, và Điều phối
 * (DP1–DP4, có dòng bỏ trống `Loại`). Đoán sai nhóm là mở nhầm cả màn hình,
 * nên chỗ này đọc cả hai nguồn thay vì tin mỗi cột `Loại`.
 */
function roleFromRosterRow(loai, desk) {
  const l = normalizeLoai(loai);
  if (l === 'kho') return 'kho';
  if (l.startsWith('dieu phoi')) return 'dieuphoi';
  const code = String(desk || '').toUpperCase();
  if (code.startsWith('KHO')) return 'kho';
  if (code.startsWith('DP')) return 'dieuphoi';
  return 'staff';
}

/**
 * Tra tài khoản + mật khẩu trong roster.
 *
 * Trả về DANH SÁCH CHỖ LÀM VIỆC, không phải một vai trò duy nhất: trong roster
 * thật, cùng một MSNV nằm ở nhiều dòng thuộc nhiều nhóm khác nhau (vd S12504 =
 * TV4 + TC4 + BK4 + KHO1). Bản trước gộp thành một vai trò và ưu tiên "kho" —
 * hậu quả là người đó đăng nhập vào là rơi thẳng vào màn kho, KHÔNG bao giờ
 * mở được bàn TV4 của mình. Giờ app hỏi họ đang trực chỗ nào.
 *
 * Trả `null` khi không khớp — caller trả về đúng một thông báo chung cho cả
 * "sai user" lẫn "sai mật khẩu", không tiết lộ MSNV nào có thật.
 */
function matchRosterAccount(rows, username, password) {
  const wanted = String(username || '').trim().toUpperCase();
  if (!wanted) return null;
  const sameUser = rows.filter((r) => r.user.toUpperCase() === wanted);
  if (sameUser.length === 0) return null;

  // Mật khẩu: khớp với BẤT KỲ dòng nào của tài khoản này là hợp lệ.
  const hopLe = sameUser.some((r) => r.pass && safeEqual(String(password ?? ''), r.pass));
  if (!hopLe) return null;

  // …nhưng CHỖ LÀM VIỆC thì lấy TẤT CẢ các dòng của tài khoản, không chỉ dòng
  // có mật khẩu khớp (sửa 2026-08-19). Trong roster thật, các dòng của cùng một
  // MSNV không nhất thiết cùng giá trị ở cột `NPI_AIO_Pass` — S12196 có 5 dòng
  // (TV3, TC3, BK3, KHO3, DP2) mà chỉ dòng DP2 khớp, nên người này đăng nhập
  // vào là rơi thẳng vào dashboard điều phối, không bao giờ thấy bàn TV3 của
  // mình. Tài khoản là CON NGƯỜI, không phải từng dòng bàn.
  const matched = sameUser;

  const workspaces = [];
  for (const r of matched) {
    // Dấu phẩy là ký tự phân tách trong token nên mã bàn không được chứa nó.
    const desk = r.desk.replace(/,/g, '');
    if (!desk || workspaces.some((w) => w.desk === desk)) continue;
    // Tên và MSNV lấy theo ĐÚNG DÒNG của chỗ đó (sửa 2026-08-19): mỗi dòng
    // roster là một bàn với cột `NV Tư vấn` riêng, nên lấy tên ở dòng đầu tiên
    // rồi dùng cho mọi chỗ là hiện tên người khác — và tên đó đi thẳng vào cột
    // `Người` của mọi record app ghi ra.
    workspaces.push({
      desk,
      loai: r.loai,
      role: roleFromRosterRow(r.loai, desk),
      name: r.name,
      msnv: r.msnv || r.user,
    });
  }
  const withInfo = matched.find((r) => r.msnv || r.name) ?? matched[0];
  return {
    workspaces,
    username: withInfo.user,
    // Mức tài khoản chỉ còn là giá trị dự phòng cho lúc CHƯA chọn chỗ; sau khi
    // chọn thì app dùng tên/MSNV của chính chỗ đó.
    msnv: withInfo.msnv || withInfo.user,
    name: withInfo.name,
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function guestCellText(value) {
  if (Array.isArray(value)) return value.map((part) => typeof part === 'string' ? part : part?.text || '').join('').trim();
  return value == null ? '' : String(value).trim();
}

function incrementGuestNghiemThu(value) {
  const text = guestCellText(value);
  const match = text.match(/Đã nghiệm thu\s*\((\d+)\)\s*máy/i);
  if (match) return text.replace(match[1], String(Number(match[1]) + 1));
  return '✅ Đã nghiệm thu (1) máy';
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
  // Cùng đường ĐỌC nên cũng có hạn giờ — treo ở đây thì treo cả snapshot y hệt
  // treo ở lượt đọc bản ghi. (Đường GHI — `getRecordFieldMeta` — giữ nguyên.)
  const res = await fetchCoHanGio(url, { headers: { Authorization: `Bearer ${token}` } });
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

const DASHBOARD_TABLES = ['checkin', 'orders', 'master', 'dispatch', 'dsMaster'];
const DASHBOARD_SNAPSHOT_FRESH_MS = 8000;
const DASHBOARD_SNAPSHOT_OBJECT_NAME = 'npi-cps-event';

/**
 * Xoá cột bí mật khỏi các record sắp trả về máy khách.
 *
 * Bắt buộc vì `/api/lark` trả NGUYÊN các cột của `Master_DS` cho MỌI máy đang
 * mở app (dashboard, màn hình STT, điện thoại NV) — để nguyên thì mật khẩu của
 * cả roster nằm sẵn trong response, mở DevTools là đọc được, và cổng đăng nhập
 * thành vô nghĩa. Quyền của bảng bên Lark KHÔNG cứu được chuyện này: máy khách
 * đọc bằng tenant token của worker chứ không bằng tài khoản Lark của người dùng.
 *
 * Chỉ đúng 1 chỗ trong worker được đọc 2 cột đó: `/admin/login`, qua
 * `readRoster(..., { includeSecrets: true })`.
 */
function stripSecretFields(items) {
  const targets = SECRET_DS_FIELDS.map((n) => n.trim().toLowerCase());
  for (const item of items) {
    if (!item?.fields) continue;
    // So theo tên đã chuẩn hoá: một dấu cách thừa trong tên cột KHÔNG được
    // phép biến thành đường rò mật khẩu ra mọi máy khách.
    for (const key of Object.keys(item.fields)) {
      if (targets.includes(key.trim().toLowerCase())) delete item.fields[key];
    }
  }
  return items;
}

async function readTableRecords(env, host, key, token, appToken, { includeSecrets = false } = {}) {
  const envKey = TABLE_ENV[key];
  const tableId = envKey ? env[envKey] : undefined;
  if (!envKey || !tableId) throw new Error(`Missing Cloudflare secret for table "${key}"`);

  let items = [];
  let pageToken;
  do {
    const u = new URL(`${host}/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`);
    u.searchParams.set('page_size', '500');
    if (pageToken) u.searchParams.set('page_token', pageToken);
    const response = await fetchCoHanGio(u, { headers: { Authorization: `Bearer ${token}` } });
    const body = await response.json();
    if (body.code !== 0) throw new Error(`Lark API error on ${key}: ${body.msg} (code ${body.code})`);
    items = items.concat(body.data?.items ?? []);
    pageToken = body.data?.has_more ? body.data.page_token : null;
  } while (pageToken);

  const fieldMaps = await getFieldOptionMaps(env, host, appToken, token, tableId);
  resolveOptionRefs(items, fieldMaps);
  if (key === 'dsMaster' && !includeSecrets) stripSecretFields(items);
  return items;
}

function snapshotResponse(request, payload, cacheState, ageMs = 0) {
  const generatedAt = String(payload?.data?.generatedAt ?? 'unknown');
  const etag = `"npi-${generatedAt}"`;
  const commonHeaders = {
    'Cache-Control': 'no-cache',
    ETag: etag,
    'X-NPI-Snapshot-Cache': cacheState,
    'X-NPI-Snapshot-Age-Ms': String(Math.max(0, Math.round(ageMs))),
    ...CORS,
  };

  // Snapshot chưa đổi thì chỉ gửi response 304 rất nhỏ; trình duyệt tự ghép
  // lại body 200 đã cache thay vì tải lại toàn bộ JSON.
  if (request.headers.get('If-None-Match') === etag) {
    return new Response(null, { status: 304, headers: commonHeaders });
  }

  return new Response(JSON.stringify({ ...payload, cache: cacheState }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...commonHeaders,
    },
  });
}

async function getSharedDashboardSnapshotResponse(request, env) {
  if (!env.DASHBOARD_SNAPSHOT) throw new Error('Thiếu Durable Object binding "DASHBOARD_SNAPSHOT"');
  const coordinator = env.DASHBOARD_SNAPSHOT.getByName(DASHBOARD_SNAPSHOT_OBJECT_NAME);
  const payload = await coordinator.getSnapshot();
  return snapshotResponse(request, payload, payload.cache ?? 'shared', payload.ageMs ?? 0);
}

function invalidateDashboardSnapshot(env, ctx) {
  if (!env.DASHBOARD_SNAPSHOT) return;
  const coordinator = env.DASHBOARD_SNAPSHOT.getByName(DASHBOARD_SNAPSHOT_OBJECT_NAME);
  ctx.waitUntil(coordinator.invalidate().catch(() => undefined));
}

function refreshDashboardSnapshotNow(env, ctx) {
  if (!env.DASHBOARD_SNAPSHOT) return;
  const coordinator = env.DASHBOARD_SNAPSHOT.getByName(DASHBOARD_SNAPSHOT_OBJECT_NAME);
  ctx.waitUntil(coordinator.refreshAndBroadcast().catch(() => undefined));
}

function dashboardSnapshotCoordinator(env) {
  if (!env.DASHBOARD_SNAPSHOT) throw new Error('Thiếu Durable Object binding "DASHBOARD_SNAPSHOT"');
  return env.DASHBOARD_SNAPSHOT.getByName(DASHBOARD_SNAPSHOT_OBJECT_NAME);
}

async function handleLarkEvent(request, env, ctx) {
  const raw = await request.text();
  let body;
  try {
    body = JSON.parse(raw || '{}');
  } catch {
    return json({ code: -1, msg: 'Lark event không phải JSON hợp lệ' }, 400);
  }

  // Lark gửi challenge khi kiểm tra URL callback. Phải trả lại nguyên giá trị.
  if (body.challenge) return json({ challenge: body.challenge });

  // Có thể đặt secret này bằng `wrangler secret put LARK_EVENT_VERIFICATION_TOKEN`.
  // Không hard-code token và không bắt buộc secret để giữ tương thích môi trường cũ.
  const expectedToken = String(env.LARK_EVENT_VERIFICATION_TOKEN || '').trim();
  const receivedToken = String(body.token || body.header?.token || '').trim();
  if (expectedToken && receivedToken !== expectedToken) {
    return json({ code: -1, msg: 'Lark event verification token không khớp' }, 401);
  }

  if (body.encrypt) {
    return json({ code: -1, msg: 'Lark event đang ở dạng encrypt; cần cấu hình decrypt key trước' }, 400);
  }

  const coordinator = dashboardSnapshotCoordinator(env);
  const eventId = String(body.header?.event_id || body.event_id || body.event?.event_id || '').trim();
  const eventType = String(body.header?.event_type || body.event_type || '').trim();
  // Acknowledge Lark immediately. Deduplication, alarm scheduling and snapshot
  // refresh continue after the HTTP response through the Worker lifetime.
  ctx.waitUntil(
    coordinator.receiveLarkEvent({ eventId, eventType }).catch(() => undefined),
  );
  return json({ code: 0, msg: 'event accepted' });
}

// ── `POST /record`: map payload → cột Bitable ───────────────────────────────
//
// Tên cột lấy theo bảng "Master" đang dùng thật. Sai tên KHÔNG làm hỏng
// record: route tự dò schema, cột nào không có thì bỏ qua và báo trong
// `data.skipped` để sửa lại map này.
//
const RECORD_FIELD_MAP = {
  stt: 'STT Input',
  hoTen: 'Họ và tên',
  maBan: 'TV_MãNV',
  trangThai: 'Trạng thái',
  // Contract chính của payload là `submitBy`. Giữ fallback `msnv` ở route
  // /record để không làm hỏng payload cũ (đời trước chỉ gửi msnv).
  submitBy: 'Submit by',
  phanLoai: 'Loại 2',
  thoiGian: 'Thời gian',
  checkBackup: 'Back up',
  thuLaiMay: 'Thu lại máy',
  scanQr: 'Scan QR máy cũ',
  imei: 'Scan IMEI',
  hinhNghiemThu: 'Hình nghiệm thu máy cũ',
  // Leadtime do APP đo, tính bằng GIÂY — làm ĐỐI CHIẾU cho cột worker tự tính.
  //
  // ⚠️ Cả hai cột leadtime giờ đều là kiểu NUMBER và đều là SỐ GIÂY, để cộng
  // trung bình / lọc ca chậm được thẳng trong Base. `leadtimeHienThi` ("06:52")
  // KHÔNG map nữa: chuỗi nhét vào cột Number sẽ bị bỏ qua im lặng.
  //
  // Đánh đổi đã chấp nhận khi đổi cột này từ Text sang Number: mất tiền tố `~`
  // vốn đánh dấu ca có mốc bắt đầu là SUY RA chứ không đo được (NV tải lại
  // trang hoặc đổi máy giữa chừng). Payload vẫn gửi `leadtimeUocLuong`, muốn
  // phân biệt lại thì tạo thêm 1 cột và map key đó vào.
  //
  // Cột worker tự tính KHÔNG map ở đây — xem `COT_LEADTIME_GIAY` bên dưới.
  //
  // Giữ cả hai để so: lệch nhiều ở ca nào là dấu hiệu ca đó có chuyện (bấm
  // Hoàn tất muộn, hoặc Tiếp nhận và Hoàn tất ở hai máy khác nhau).
  //
  // Đổi tên/kiểu cột bên Base là phải sửa hằng ở đây rồi deploy lại; kiểm bằng
  // `GET /fields?table=master` (cả hai cột đều có trong phần `mapping`).
  leadtimeGiay: 'Brower Leadtime',
};

/**
 * Cột SỐ để worker ghi leadtime TỰ TÍNH từ hai mốc `Thời gian` trong Base (xem
 * `tinhLeadtimeTuBase`) — **đây là số dùng để đánh giá hiệu quả**, chính xác
 * hơn hẳn cột app đo vì không phụ thuộc đồng hồ trong bộ nhớ trình duyệt.
 * Nằm ngoài `RECORD_FIELD_MAP` vì giá trị do worker sinh ra, không đến từ
 * payload. Cũng tính bằng GIÂY, cùng đơn vị với `Brower Leadtime`.
 */
const COT_LEADTIME_GIAY = 'Proxy Leadtime';

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
  khachDoiY: 'Khách đổi ý',
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
  for (const f of data?.data?.items ?? []) byName.set(f.field_name, { id: f.field_id, type: f.type, uiType: f.ui_type });
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

/**
 * Một event là một coordination atom: toàn bộ 38 thiết bị dùng chung đúng một
 * Durable Object. Object này serialize refresh, nên mỗi chu kỳ chỉ phát sinh
 * một lượt đọc 5 bảng Lark dù nhiều máy poll cùng lúc.
 *
 * Dữ liệu được lưu theo từng bảng. Nếu một bảng Lark timeout, bảng đó giữ bản
 * tốt gần nhất; tuyệt đối không ghi `[]` đè lên cache rồi làm dashboard trống.
 */
export class DashboardSnapshotCoordinator extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.refreshPromise = null;
    this.tableState = new Map();
    this.dirty = true;
    this.invalidateVersion = 0;
    this.lastAttemptAt = 0;
    this.lastWarnings = [];
    this.webSockets = new Set();
    this.activeAlerts = new Map();
    this.ready = ctx.blockConcurrencyWhile(async () => {
      const values = await ctx.storage.get([
        ...DASHBOARD_TABLES.map((key) => `table:${key}`),
        'dirty',
        'warnings',
        'desk-alerts',
      ]);
      for (const key of DASHBOARD_TABLES) {
        const saved = values.get(`table:${key}`);
        if (saved?.items && Number.isFinite(saved.updatedAt)) this.tableState.set(key, saved);
      }
      this.dirty = values.get('dirty') !== false;
      this.lastWarnings = Array.isArray(values.get('warnings')) ? values.get('warnings') : [];
      const alerts = values.get('desk-alerts');
      if (Array.isArray(alerts)) {
        for (const alert of alerts) if (alert?.id && alert?.deskId) this.activeAlerts.set(alert.id, alert);
      }
      this.lastAttemptAt = this.tableState.size
        ? Math.max(...Array.from(this.tableState.values(), (value) => value.updatedAt))
        : 0;
    });
  }

  async invalidate() {
    await this.ready;
    this.invalidateVersion += 1;
    this.dirty = true;
    await this.ctx.storage.put('dirty', true);
    await this.scheduleRefresh();
    return { ok: true, scheduled: true };
  }

  async refreshAndBroadcast() {
    await this.ready;
    if (!this.refreshPromise) {
      this.refreshPromise = this.refresh().finally(() => {
        this.refreshPromise = null;
      });
    }
    const payload = await this.refreshPromise;
    this.broadcast({ type: 'snapshot', payload });
    return { ok: true, generatedAt: payload.data?.generatedAt ?? null };
  }

  async receiveLarkEvent({ eventId = '', eventType = '' } = {}) {
    await this.ready;
    const id = String(eventId || '').trim();
    if (id) {
      const seenKey = `event:${id}`;
      if (await this.ctx.storage.get(seenKey)) return { duplicate: true, eventId: id };
      await this.ctx.storage.put(seenKey, Date.now(), { expirationTtl: 600 });
    }
    this.invalidateVersion += 1;
    this.dirty = true;
    await this.ctx.storage.put('dirty', true);
    await this.scheduleRefresh();
    return { duplicate: false, eventId: id || null, eventType: eventType || null, scheduled: true };
  }

  async scheduleRefresh() {
    const dueAt = Date.now() + 750;
    const currentDueAt = await this.ctx.storage.get('refreshDueAt');
    if (!currentDueAt || dueAt < currentDueAt) {
      await this.ctx.storage.put('refreshDueAt', dueAt);
      await this.ctx.storage.setAlarm(dueAt);
    }
  }

  async fetch(request) {
    await this.ready;
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return json({ code: -1, msg: 'WebSocket Upgrade required' }, 426);
    }
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server);
    this.webSockets.add(server);
    server.serializeAttachment({ connectedAt: Date.now() });
    server.send(JSON.stringify({ type: 'connected', generatedAt: new Date().toISOString() }));
    for (const alert of this.activeAlerts.values()) server.send(JSON.stringify({ type: 'desk-alert', alert }));
    return new Response(null, { status: 101, webSocket: client });
  }

  async alarm() {
    await this.ready;
    const dueAt = await this.ctx.storage.get('refreshDueAt');
    if (dueAt && dueAt > Date.now()) {
      await this.ctx.storage.setAlarm(dueAt);
      return;
    }
    await this.ctx.storage.delete('refreshDueAt');
    try {
      const payload = await this.refresh();
      this.broadcast({ type: 'snapshot', payload });
    } catch (error) {
      this.broadcast({ type: 'error', message: String(error?.message || error) });
    }
  }

  webSocketClose(webSocket) {
    this.webSockets.delete(webSocket);
  }

  webSocketError(webSocket) {
    this.webSockets.delete(webSocket);
  }

  async webSocketMessage(webSocket, message) {
    const raw = typeof message === 'string' ? message : message?.data;
    if (raw === 'ping') {
      webSocket.send('pong');
      return;
    }
    let body;
    try { body = JSON.parse(String(raw || '{}')); } catch { return; }
    if (body.type === 'desk-alert') {
      await this.ready;
      const input = body.alert || {};
      const alert = {
        id: crypto.randomUUID(),
        deskId: String(input.deskId || '').trim(),
        role: String(input.role || '').trim(),
        stt: input.stt == null ? null : String(input.stt),
        customerName: input.customerName == null ? null : String(input.customerName),
        createdAt: Date.now(),
      };
      if (!alert.deskId) return;
      this.activeAlerts.set(alert.id, alert);
      await this.ctx.storage.put('desk-alerts', [...this.activeAlerts.values()]);
      this.broadcast({ type: 'desk-alert', alert });
    }
    if (body.type === 'desk-alert-cleared' && body.alertId) {
      await this.ready;
      const alertId = String(body.alertId);
      if (!this.activeAlerts.delete(alertId)) return;
      await this.ctx.storage.put('desk-alerts', [...this.activeAlerts.values()]);
      this.broadcast({ type: 'desk-alert-cleared', alertId });
    }
  }

  broadcast(message) {
    const encoded = JSON.stringify(message);
    for (const webSocket of this.ctx.getWebSockets()) {
      try {
        webSocket.send(encoded);
      } catch {
        this.webSockets.delete(webSocket);
      }
    }
  }

  async getSnapshot() {
    await this.ready;
    const now = Date.now();
    const allTablesAvailable = DASHBOARD_TABLES.every((key) => this.tableState.has(key));
    if (allTablesAvailable && now - this.lastAttemptAt < DASHBOARD_SNAPSHOT_FRESH_MS) {
      return this.buildPayload(
        this.lastWarnings,
        this.lastWarnings.length ? 'shared-stale' : 'shared-hit',
      );
    }

    if (!this.refreshPromise) {
      this.refreshPromise = this.refresh().finally(() => {
        this.refreshPromise = null;
      });
    }
    try {
      return await this.refreshPromise;
    } catch (error) {
      if (!allTablesAvailable) throw error;
      this.lastWarnings = [`snapshot: ${String(error?.message || error)}`];
      this.dirty = true;
      await this.ctx.storage.put({ dirty: true, warnings: this.lastWarnings });
      return this.buildPayload(this.lastWarnings, 'shared-stale');
    }
  }

  async refresh() {
    const refreshVersion = this.invalidateVersion;
    this.lastAttemptAt = Date.now();
    const host = this.env.LARK_HOST || 'https://open.larksuite.com';
    const token = await getToken(this.env, host);
    const appToken = await resolveAppToken(this.env, host, this.env.LARK_APP_TOKEN);
    const refreshedAt = Date.now();
    const results = await Promise.all(DASHBOARD_TABLES.map(async (key) => {
      try {
        const items = await readTableRecords(this.env, host, key, token, appToken);
        return { key, value: { items, updatedAt: refreshedAt }, warning: null };
      } catch (error) {
        return { key, value: null, warning: `${key}: ${String(error?.message || error)}` };
      }
    }));

    const writes = {};
    for (const result of results) {
      if (!result.value) continue;
      this.tableState.set(result.key, result.value);
      writes[`table:${result.key}`] = result.value;
    }
    const warnings = results.map((result) => result.warning).filter(Boolean);
    const missing = DASHBOARD_TABLES.filter((key) => !this.tableState.has(key));
    if (Object.keys(writes).length) await this.ctx.storage.put(writes);
    if (missing.length) {
      throw new Error(`Snapshot chưa có dữ liệu tốt cho bảng: ${missing.join(', ')}`);
    }

    this.lastWarnings = warnings;
    this.dirty = warnings.length > 0 || this.invalidateVersion !== refreshVersion;
    await this.ctx.storage.put({ dirty: this.dirty, warnings });
    return this.buildPayload(warnings, warnings.length ? 'shared-stale' : 'shared-refresh');
  }

  buildPayload(warnings, cache) {
    const updatedAtByTable = Object.fromEntries(
      DASHBOARD_TABLES.map((key) => [key, new Date(this.tableState.get(key).updatedAt).toISOString()]),
    );
    const oldestUpdatedAt = Math.min(...DASHBOARD_TABLES.map((key) => this.tableState.get(key).updatedAt));
    return {
      code: 0,
      msg: warnings.length ? 'stale snapshot' : 'success',
      cache,
      ageMs: Date.now() - oldestUpdatedAt,
      data: {
        tables: Object.fromEntries(DASHBOARD_TABLES.map((key) => [key, this.tableState.get(key).items])),
        generatedAt: new Date(this.lastAttemptAt).toISOString(),
        sourceOldestAt: new Date(oldestUpdatedAt).toISOString(),
        updatedAtByTable,
        warnings,
      },
    };
  }
}

const GUEST_ROOM_TTL_MS = 2 * 60 * 60 * 1000;

function guestRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return `NPI_${Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('')}`;
}

/** State tạm cho một buổi demo nhiều thiết bị; không liên quan tới Lark Base. */
export class GuestSimulationRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.state = null;
    this.ready = ctx.blockConcurrencyWhile(async () => {
      this.state = await ctx.storage.get('state');
      if (!this.state || this.state.expiresAt <= Date.now()) this.state = null;
    });
  }

  async save() {
    this.state.expiresAt = Date.now() + GUEST_ROOM_TTL_MS;
    await this.ctx.storage.put('state', this.state);
    await this.ctx.storage.setAlarm(this.state.expiresAt);
  }

  async fetch(request) {
    await this.ready;
    const path = new URL(request.url).pathname.replace(/^\//, '');
    if (request.method === 'POST' && path === 'init') {
      const body = await request.json();
      const tables = body?.tables;
      if (!tables || !Array.isArray(tables.checkin) || tables.checkin.length > 5) {
        return json({ code: -1, msg: 'Guest room cần tối đa 5 khách Check-in.' }, 400);
      }
      this.state = {
        baseTables: {
          checkin: tables.checkin,
          orders: Array.isArray(tables.orders) ? tables.orders.slice(0, 5) : tables.checkin,
          master: [],
          dispatch: [],
          dsMaster: [],
        },
        assignments: [],
        alerts: [],
        participants: [],
        createdAt: Date.now(),
        expiresAt: Date.now() + GUEST_ROOM_TTL_MS,
      };
      await this.save();
      return json({ code: 0, msg: 'success', data: this.state });
    }

    if (!this.state) return json({ code: -1, msg: 'Phòng không tồn tại hoặc đã hết hạn.' }, 404);

    if (request.method === 'POST' && path === 'join') {
      const body = await request.json();
      const role = String(body?.role || '').slice(0, 20);
      if (role && !this.state.participants.some((item) => item.role === role)) {
        this.state.participants.push({ role, joinedAt: Date.now() });
      }
      await this.save();
      return json({ code: 0, msg: 'success', data: this.state });
    }

    if (request.method === 'POST' && path === 'action') {
      const body = await request.json();
      const stt = String(body?.stt || '').trim();
      const stage = String(body?.stage || '').trim();
      const deskId = String(body?.deskId || '').trim();
      const action = String(body?.action || '').trim();
      const checkBackup = body?.checkBackup === 'Có' || body?.checkBackup === 'Không' ? body.checkBackup : null;
      const thuLaiMay = body?.thuLaiMay === 'Thu máy ngay' || body?.thuLaiMay === 'Thu máy sau' ? body.thuLaiMay : null;
      const scanQr = typeof body?.scanQr === 'string' ? body.scanQr.trim().slice(0, 200) : null;
      const imei = typeof body?.imei === 'string' ? body.imei.trim().slice(0, 80) : null;
      let hinhNghiemThu = null;
      if (typeof body?.hinhNghiemThu === 'string') {
        try { hinhNghiemThu = JSON.parse(body.hinhNghiemThu); } catch { hinhNghiemThu = null; }
      } else if (Array.isArray(body?.hinhNghiemThu)) {
        hinhNghiemThu = body.hinhNghiemThu;
      }
      hinhNghiemThu = Array.isArray(hinhNghiemThu)
        ? hinhNghiemThu.slice(0, 3).map((image) => {
            const fileToken = typeof image?.file_token === 'string' ? image.file_token.trim().slice(0, 160) : '';
            const name = typeof image?.name === 'string' ? image.name.trim().slice(0, 120) : '';
            return fileToken ? { file_token: fileToken, ...(name ? { name } : {}) } : null;
          }).filter(Boolean)
        : null;
      if (!stage || !deskId || !['dispatch', 'receive', 'complete', 'device', 'help', 'help-clear'].includes(action)) {
        return json({ code: -1, msg: 'Guest room action không hợp lệ.' }, 400);
      }
      if (action === 'help') {
        const alertId = `guest-alert-${deskId}`;
        this.state.alerts = (this.state.alerts || []).filter((item) => item.deskId !== deskId);
        this.state.alerts.push({
          id: alertId,
          deskId,
          role: String(body?.role || ''),
          stt: stt || null,
          customerName: body?.customerName || null,
          createdAt: Date.now(),
        });
      } else if (action === 'help-clear') {
        this.state.alerts = (this.state.alerts || []).filter((item) => item.deskId !== deskId);
      } else if (action === 'dispatch') {
        this.state.assignments = this.state.assignments.filter(
          (item) => !(item.stt === stt && item.stage === stage && item.status === 'waiting'),
        );
        this.state.assignments.push({ stt, stage, deskId, status: 'waiting', at: Date.now() });
      } else if (action === 'device') {
        let matched = false;
        this.state.assignments = this.state.assignments.map((item) =>
          item.stt === stt && item.stage === stage
            ? {
                ...(matched = true, item),
                thuLaiMay: 'Thu máy ngay',
                at: Date.now(),
                ...(scanQr ? { scanQr } : {}),
                ...(imei ? { imei } : {}),
                ...(hinhNghiemThu?.length ? { hinhNghiemThu } : {}),
              }
            : item,
        );
        if (!matched) {
          this.state.assignments.push({
            stt,
            stage,
            deskId,
            status: 'completed',
            at: Date.now(),
            thuLaiMay: 'Thu máy ngay',
            ...(scanQr ? { scanQr } : {}),
            ...(imei ? { imei } : {}),
            ...(hinhNghiemThu?.length ? { hinhNghiemThu } : {}),
          });
        }
        const checkinRow = this.state.baseTables.checkin.find((row) => Object.entries(row.fields).some(([key, value]) => key.trim().toLowerCase() === 'stt' && guestCellText(value) === stt));
        if (checkinRow) {
          const acceptedKey = Object.keys(checkinRow.fields).find((key) => key.trim().toLowerCase() === 'check nghiệm thu');
          if (acceptedKey) checkinRow.fields[acceptedKey] = incrementGuestNghiemThu(checkinRow.fields[acceptedKey]);
        }
      } else {
        let matched = false;
          this.state.assignments = this.state.assignments.map((item) =>
            item.stt === stt && item.stage === stage && item.status === (action === 'receive' ? 'waiting' : 'active')
            ? (matched = true, {
                ...item,
                status: action === 'receive' ? 'active' : 'completed',
                at: Date.now(),
                ...(checkBackup ? { checkBackup } : {}),
                ...(thuLaiMay ? { thuLaiMay } : {}),
                ...(scanQr ? { scanQr } : {}),
                ...(imei ? { imei } : {}),
                ...(hinhNghiemThu?.length ? { hinhNghiemThu } : {}),
              })
            : item,
          );
        // Tiếp nhận nhanh có thể bypass Điều phối. Khi đó chưa có assignment
        // waiting để chuyển trạng thái, nên tạo thẳng active trên room chung.
        if (action === 'receive' && !matched) {
          this.state.assignments.push({ stt, stage, deskId, status: 'active', at: Date.now() });
        }
        if (action === 'complete' && checkBackup) {
          const checkinRow = this.state.baseTables.checkin.find((row) => Object.entries(row.fields).some(([key, value]) => key.trim().toLowerCase() === 'stt' && guestCellText(value) === stt));
          if (checkinRow) {
            const backupKey = Object.keys(checkinRow.fields).find((key) => key.trim().toLowerCase() === 'backup check');
            const backupStatusKey = Object.keys(checkinRow.fields).find((key) => key.trim().toLowerCase() === 'bc_check backup');
            const backupValue = checkBackup === 'Có' ? 'Có Backup' : 'Không Backup';
            if (backupKey) checkinRow.fields[backupKey] = backupValue;
            if (backupStatusKey) checkinRow.fields[backupStatusKey] = backupValue;
          }
          const row = checkinRow;
          if (row) {
            const oldDeviceKey = Object.keys(row.fields).find((key) => key.toLowerCase().includes('thu cũ check') || key.toLowerCase().includes('thu cu check'));
            const backupKey = Object.keys(row.fields).find((key) => key.toLowerCase().includes('backup check'));
            const oldDevice = oldDeviceKey ? String(row.fields[oldDeviceKey] ?? '').toLowerCase() : '';
            const backup = backupKey ? String(row.fields[backupKey] ?? '').toLowerCase() : checkBackup.toLowerCase();
            const completed = new Set(this.state.assignments.filter((item) => item.stt === stt && item.status === 'completed').map((item) => item.stage));
            const ready = completed.has('consult')
              && (!(oldDevice.includes('có') || oldDevice.includes('thu cũ') || oldDevice.includes('thu cu')) || completed.has('tradein'))
              && (!(backup.includes('có') || backup.includes('backup')) || completed.has('backup'));
            if (ready) {
              const endFlowKey = Object.keys(row.fields).find((key) => key.toLowerCase().includes('end flow'));
              if (endFlowKey) row.fields[endFlowKey] = 'End flow';
            }
          }
        }
        if (action === 'complete' && thuLaiMay === 'Thu máy ngay') {
          const checkinRow = this.state.baseTables.checkin.find((row) => Object.entries(row.fields).some(([key, value]) => key.trim().toLowerCase() === 'stt' && guestCellText(value) === stt));
          if (checkinRow) {
            const acceptedKey = Object.keys(checkinRow.fields).find((key) => key.trim().toLowerCase() === 'check nghiệm thu');
            if (acceptedKey) checkinRow.fields[acceptedKey] = incrementGuestNghiemThu(checkinRow.fields[acceptedKey]);
          }
        }
      }
      await this.save();
      return json({ code: 0, msg: 'success', data: this.state });
    }

    if (request.method === 'GET' && path === 'state') return json({ code: 0, msg: 'success', data: this.state });
    return json({ code: -1, msg: 'Guest room route không tồn tại.' }, 404);
  }

  async alarm() {
    await this.ready;
    if (this.state && this.state.expiresAt <= Date.now()) {
      this.state = null;
      await this.ctx.storage.deleteAll();
    } else if (this.state) {
      await this.save();
    }
  }
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    const segments = new URL(request.url).pathname.split('/').filter(Boolean);
    const table = segments[segments.length - 1];
    // Khớp theo 2 segment CUỐI, không phải full path: "API URL" người dùng cấu
    // hình có thể là `https://worker` hoặc `https://worker/api/lark` — cùng cơ
    // chế với việc lấy tên bảng ở segment cuối bên dưới.
    const route = segments.slice(-2).join('/');
    const host = (env.LARK_HOST || 'https://open.larksuite.com').replace(/\/+$/, '');

    if (segments[0] === 'guest-room') {
      if (request.method === 'POST' && segments[1] === 'create') {
        const code = guestRoomCode();
        const stub = env.GUEST_SIMULATION_ROOM.get(env.GUEST_SIMULATION_ROOM.idFromName(code));
        const created = await stub.fetch(new Request('https://guest-room/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: await request.text(),
        }));
        const body = await created.json();
        return json({ ...body, data: { ...body.data, roomCode: code } }, created.status);
      }
      const code = segments[1];
      if (!code) return json({ code: -1, msg: 'Thiếu mã phòng.' }, 400);
      const action = segments[2] || 'state';
      const stub = env.GUEST_SIMULATION_ROOM.get(env.GUEST_SIMULATION_ROOM.idFromName(code));
      return await stub.fetch(new Request(`https://guest-room/${action}`, request));
    }

    if (request.method === 'POST' && route === 'lark/events') {
      try {
        return await handleLarkEvent(request, env, ctx);
      } catch (e) {
        return json({ code: -1, msg: String(e?.message || e) }, 500);
      }
    }

    if (request.method === 'GET' && (route === 'realtime' || route === 'ws')) {
      try {
        return await dashboardSnapshotCoordinator(env).fetch(request);
      } catch (e) {
        return json({ code: -1, msg: String(e?.message || e) }, 500);
      }
    }

    // ── `GET /roster-check` — soi danh sách tài khoản mà worker ĐỌC ĐƯỢC ───
    //
    // Có route này vì lỗi "Sai tài khoản hoặc mật khẩu" không phân biệt được 3
    // nguyên nhân hoàn toàn khác nhau: worker chưa deploy, tên cột lệch (thừa
    // dấu cách, khác hoa/thường), hay ô công thức trả về hình dạng lạ. Route
    // này trả lời cả ba trong một lần mở.
    //
    // **KHÔNG trả về mật khẩu** — chỉ nói có/không, và chỉ trả tên tài khoản
    // (vốn là MSNV, đã nằm sẵn trong dữ liệu công khai của dashboard).
    if (request.method === 'GET' && (route.endsWith('roster-check') || table === 'roster-check')) {
      try {
        const token = await getToken(env, host);
        const appToken = await resolveAppToken(env, host, env.LARK_APP_TOKEN);
        const items = await readTableRecords(env, host, 'dsMaster', token, appToken, {
          includeSecrets: true,
        });

        // Mọi tên cột worker NHÌN THẤY — đối chiếu với tên trong Base để phát
        // hiện dấu cách thừa hoặc khác hoa/thường.
        const allColumns = new Set();
        for (const it of items) for (const k of Object.keys(it?.fields ?? {})) allColumns.add(k);

        const rows = [];
        let coPass = 0;
        for (const it of items) {
          const f = it?.fields ?? {};
          const user = cellText(pickField(f, ROSTER_FIELDS.user));
          if (!user) continue;
          const pass = cellText(pickField(f, ROSTER_FIELDS.pass));
          if (pass) coPass += 1;
          rows.push({
            user,
            coMatKhau: Boolean(pass),
            ten: cellText(pickField(f, ROSTER_FIELDS.name)),
            msnv: cellText(pickField(f, ROSTER_FIELDS.msnv)),
            ban: cellText(pickField(f, ROSTER_FIELDS.desk)).toUpperCase().replace(/\s+/g, ''),
            loai: cellText(pickField(f, ROSTER_FIELDS.loai)),
            vaiTro: roleFromRosterRow(
              cellText(pickField(f, ROSTER_FIELDS.loai)),
              cellText(pickField(f, ROSTER_FIELDS.desk)),
            ),
          });
        }

        // Hình dạng THÔ của ô công thức ở dòng đầu — để biết `cellText` có đọc
        // đúng kiểu dữ liệu Lark trả về hay không.
        const mauThoUser = items.length ? pickField(items[0]?.fields ?? {}, ROSTER_FIELDS.user) ?? null : null;

        // `NPI_AIO_User` lệch `MSNV` của CHÍNH dòng đó = công thức đang kéo mã
        // từ nơi khác. Khi đó mọi thứ tra theo tài khoản (tên NV, mã bàn, vai
        // trò) đều lấy nhầm dòng của người khác — sai âm thầm, không có lỗi.
        const dongLech = rows.filter((r) => r.msnv && r.user.toUpperCase() !== r.msnv.toUpperCase());

        // Cùng một tài khoản mà các dòng ghi mật khẩu khác nhau — người dùng
        // đổi mật khẩu ở một dòng rồi quên các dòng còn lại là ra tình trạng
        // này. Không chặn đăng nhập (khớp 1 dòng là đủ), nhưng nên biết.
        const soChoTheoTaiKhoan = new Map();
        for (const r of rows) {
          const key = r.user.toUpperCase();
          if (!soChoTheoTaiKhoan.has(key)) soChoTheoTaiKhoan.set(key, []);
          soChoTheoTaiKhoan.get(key).push(r.ban);
        }
        const taiKhoanNhieuCho = [...soChoTheoTaiKhoan]
          .filter(([, bans]) => bans.length > 1)
          .map(([user, bans]) => ({ user, cho: bans }));

        return json({
          code: 0,
          msg: 'success',
          data: {
            phienBan: 'roster-check-v5',
            soDong: items.length,
            soDongUserLechMsnv: dongLech.length,
            viDuLech: dongLech.slice(0, 5),
            taiKhoanNhieuCho,
            tenCotDangTim: { user: ROSTER_FIELDS.user, pass: ROSTER_FIELDS.pass },
            timThayCotUser: allColumns.has(ROSTER_FIELDS.user),
            timThayCotPass: allColumns.has(ROSTER_FIELDS.pass),
            cotGanGiong: [...allColumns].filter((c) => /aio|npi/i.test(c)),
            soTaiKhoanDocDuoc: rows.length,
            soTaiKhoanCoMatKhau: coPass,
            mauThoUser,
            taiKhoan: rows.slice(0, 50),
            tatCaTenCot: [...allColumns].sort(),
          },
        });
      } catch (e) {
        return json({ code: -1, msg: String(e?.message || e) }, 500);
      }
    }

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
      const password = String(body.password ?? '');

      // ── Đường CHÍNH: tài khoản trong `Master_DS` ────────────────────────
      //
      // Đặt TRƯỚC hai đường cũ để roster luôn là nguồn sự thật. Đọc Lark hỏng
      // (mạng, token, sai table id) thì KHÔNG chặn đăng nhập admin — rơi xuống
      // các nhánh dưới, vì admin là đường vào Cài đặt để sửa chính chỗ hỏng đó.
      if (username.toLowerCase() !== 'admin') {
        let account = null;
        try {
          account = matchRosterAccount(await readRoster(env, host), username, password);
        } catch (e) {
          return json({ code: -1, msg: `Không đọc được danh sách tài khoản (Master_DS): ${String(e?.message || e)}` }, 502);
        }
        if (account) {
          if (account.workspaces.length === 0) {
            // Nói thẳng nguyên nhân: dòng roster thiếu mã bàn thì có cho vào
            // cũng không mở được màn hình nào.
            return json(
              { code: -1, msg: `Tài khoản ${account.username} chưa có "STT bàn" trong Master_DS — báo quản trị điền mã bàn.` },
              403,
            );
          }
          const desks = account.workspaces.map((w) => w.desk);
          // Vai trò trong TOKEN chỉ để phân biệt với `admin` (quyền ghi cấu
          // hình); chỗ làm việc cụ thể do app chọn từ `workspaces`.
          const tokenRole = account.workspaces[0].role;
          return json({
            code: 0,
            msg: 'success',
            data: {
              token: await issueToken(env, tokenRole, desks.join(',')),
              ttlMs: SESSION_TTL_MS,
              role: tokenRole,
              // `desk` + `role` giữ tên cũ (chỗ đầu tiên) để bản web cũ còn
              // đang chạy ngoài sự kiện không vỡ khi worker deploy trước.
              desk: desks.length === 1 ? desks[0] : '',
              desks,
              workspaces: account.workspaces,
              username: account.username,
              msnv: account.msnv,
              name: account.name,
            },
          });
        }
        // Không khớp roster → thử nốt đường cũ (TV4 + STAFF_PASSWORD) bên dưới.
      }

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
        valid = safeEqual(password, env.ADMIN_PASSWORD);
      } else if (isStaffDesk(username) && env.STAFF_PASSWORD) {
        // Đường CŨ, giữ để link riêng từng bàn (`#/tv4`) đã phát ra ngoài không
        // chết giữa sự kiện: đăng nhập bằng chính mã bàn + mật khẩu dùng chung.
        // Xoá secret `STAFF_PASSWORD` là đường này tự tắt, còn lại đúng roster.
        valid = safeEqual(password, env.STAFF_PASSWORD);
        role = 'staff';
        desk = username.toUpperCase();
      }
      // Sai user và sai mật khẩu trả về CÙNG một thông báo — không tiết lộ
      // username nào có thật.
      if (!valid) {
        return json({ code: -1, msg: 'Sai tài khoản hoặc mật khẩu' }, 401);
      }
      return json({
        code: 0,
        msg: 'success',
        data: {
          token: await issueToken(env, role, desk),
          ttlMs: SESSION_TTL_MS,
          role,
          desk,
          desks: desk ? [desk] : [],
          username: role === 'admin' ? 'admin' : desk,
          msnv: '',
          name: '',
        },
      });
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
        const parsed = raw ? JSON.parse(raw) : { settings: null, updatedAt: null };
        if (new URL(request.url).searchParams.get('mode') === 'sleep') {
          return json({
            code: 0,
            msg: 'success',
            data: {
              sleepMode: Boolean(parsed.settings?.sleepMode),
              updatedAt: parsed.updatedAt ?? null,
            },
          });
        }
        return json({
          code: 0,
          msg: 'success',
          data: parsed,
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
            : // Cột SỐ leadtime cũng nằm ngoài map (worker tự sinh giá trị) —
              // không đưa vào đây thì đổi tên cột bên Base sẽ âm thầm mất số
              // mà `/fields` vẫn báo mọi thứ OK. Đã dính đúng bẫy này một lần.
              [
                (() => {
                  const m = meta.get(COT_LEADTIME_GIAY);
                  if (!m) return { key: 'leadtimeGiay (worker tính)', column: COT_LEADTIME_GIAY, ok: false, reason: 'bảng không có cột này' };
                  if (READONLY_FIELD_TYPES.has(m.type)) return { key: 'leadtimeGiay (worker tính)', column: COT_LEADTIME_GIAY, ok: false, reason: 'cột tính toán/hệ thống' };
                  if (m.type !== LARK_FIELD_NUMBER) return { key: 'leadtimeGiay (worker tính)', column: COT_LEADTIME_GIAY, ok: false, reason: `cột phải là kiểu Number, đang là type ${m.type}` };
                  return { key: 'leadtimeGiay (worker tính)', column: COT_LEADTIME_GIAY, ok: true, type: m.type, uiType: m.uiType ?? null };
                })(),
              ];
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
        const mediaRequest = new URL(request.url);
        const mediaTable = mediaRequest.searchParams.get('table') || 'master';
        const mediaRecordId = mediaRequest.searchParams.get('record_id') || '';
        const mediaFieldName = mediaRequest.searchParams.get('field') || 'Hình nghiệm thu máy cũ';
        const mediaTableEnv = TABLE_ENV[mediaTable];
        const mediaTableId = mediaTableEnv ? env[mediaTableEnv] : '';
        if (!mediaTableId || !mediaRecordId) return json({ code: -1, msg: 'Thiếu ngữ cảnh attachment: table và record_id' }, 400);
        const mediaAppToken = await resolveAppToken(env, host, env.LARK_APP_TOKEN);
        const mediaFields = await getRecordFieldMeta(env, host, mediaAppToken, bearerToken, mediaTableId);
        const mediaFieldId = mediaFields.get(mediaFieldName)?.id;
        if (!mediaFieldId) return json({ code: -1, msg: `Không tìm thấy cột attachment "${mediaFieldName}"` }, 500);
        const rev = mediaRequest.searchParams.get('rev');
        const extra = JSON.stringify({
          bitablePerm: {
            tableId: mediaTableId,
            ...(rev ? { rev: Number(rev) } : {}),
            attachments: { [mediaFieldId]: { [mediaRecordId]: [fileToken] } },
          },
        });
        const tmpEndpoint = new URL(`${host}/open-apis/drive/v1/medias/batch_get_tmp_download_url`);
        tmpEndpoint.searchParams.set('file_tokens', fileToken);
        tmpEndpoint.searchParams.set('extra', extra);
        const tmp = await fetch(tmpEndpoint, { headers: { Authorization: `Bearer ${bearerToken}` } });
        const tmpBody = await tmp.json().catch(() => null);
        const temporaryUrl = tmpBody?.data?.tmp_download_urls?.find((item) => item?.file_token === fileToken)?.tmp_download_url;
        const directEndpoint = new URL(`${host}/open-apis/drive/v1/medias/${encodeURIComponent(fileToken)}/download`);
        directEndpoint.searchParams.set('extra', extra);
        const r = temporaryUrl
          ? await fetch(temporaryUrl)
          : await fetch(directEndpoint, { headers: { Authorization: `Bearer ${bearerToken}` } });
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
        refreshDashboardSnapshotNow(env, ctx);
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

      // Payload cũ của app/k6 chỉ có `msnv`; payload hiện tại có `submitBy`.
      // Chuẩn hóa một lần trước khi map để cột Master luôn nhận đúng định danh.
      if (payload.submitBy == null || String(payload.submitBy).trim() === '') {
        payload.submitBy = payload.msnv;
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
        refreshDashboardSnapshotNow(env, ctx);
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
        if (r.ok) invalidateDashboardSnapshot(env, ctx);
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
        return await getSharedDashboardSnapshotResponse(request, env);
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
