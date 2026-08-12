/**
 * Lark Base proxy — Cloudflare Worker (module syntax).
 *
 * Deploy: `npx wrangler deploy cloudflare-worker.js` (hoặc dán vào Workers editor).
 * Biến bí mật đặt bằng `wrangler secret put <NAME>` hoặc trong dashboard Workers:
 *   LARK_APP_ID, LARK_APP_SECRET, LARK_HOST, LARK_APP_TOKEN,
 *   TB_CHECKIN, TB_ORDERS, TB_MASTER, TB_DISPATCH, TB_DS_MASTER
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
// username/password lên `/admin/login`, worker so với `ADMIN_PASSWORD_HASH`
// (secret, là SHA-256 của `${PEPPER}:${username}:${password}`) rồi trả về 1
// token có hạn. Repo/HTML/JS tải về máy khách không chứa mật khẩu lẫn hash.
//
// Token là chuỗi tự xác thực `<hết hạn>.<HMAC-SHA256>` ký bằng secret
// `ADMIN_SESSION_SECRET` — worker không cần lưu session, và token cũ tự chết
// khi hết hạn. Đổi `ADMIN_SESSION_SECRET` = vô hiệu hoá tất cả token đang có.
const PEPPER = 'npievent-admin-v1';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const KV_COORDINATORS = 'coordinators';

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

async function issueToken(env) {
  const exp = Date.now() + SESSION_TTL_MS;
  return `${exp}.${await hmacHex(env.ADMIN_SESSION_SECRET, String(exp))}`;
}

async function verifyToken(env, token) {
  const [exp, sig] = String(token || '').split('.');
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  return safeEqual(sig, await hmacHex(env.ADMIN_SESSION_SECRET, exp));
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
      if (!env.ADMIN_PASSWORD_HASH || !env.ADMIN_SESSION_SECRET) {
        return json({ code: -1, msg: 'Chưa cấu hình ADMIN_PASSWORD_HASH / ADMIN_SESSION_SECRET' }, 500);
      }
      let body = {};
      try {
        body = await request.json();
      } catch {
        return json({ code: -1, msg: 'Body không phải JSON' }, 400);
      }
      const hash = await sha256Hex(`${PEPPER}:${body.username ?? ''}:${body.password ?? ''}`);
      // Sai user và sai mật khẩu trả về CÙNG một thông báo — không tiết lộ
      // username nào có thật.
      if (!safeEqual(hash, env.ADMIN_PASSWORD_HASH)) {
        return json({ code: -1, msg: 'Sai tài khoản hoặc mật khẩu' }, 401);
      }
      return json({ code: 0, msg: 'success', data: { token: await issueToken(env), ttlMs: SESSION_TTL_MS } });
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
        if (!(await verifyToken(env, bearer(request)))) {
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
        // Chuẩn hoá tại server: máy điều phối luôn đọc được đúng 3 field, dù
        // client gửi thừa/thiếu gì.
        const coordinators = body.coordinators.map((c) => ({
          id: String(c?.id ?? '').trim(),
          name: String(c?.name ?? '').trim(),
          position: String(c?.position ?? '').trim(),
        }));
        const payload = { coordinators, updatedAt: new Date().toISOString() };
        await env.CONFIG.put(KV_COORDINATORS, JSON.stringify(payload));
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
    if (request.method === 'POST' && table === 'webhook') {
      const target = env.LARK_WEBHOOK_URL;
      if (!target) return json({ code: -1, msg: 'Missing Cloudflare secret "LARK_WEBHOOK_URL"' }, 500);
      try {
        const r = await fetch(target, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: await request.text(),
        });
        const text = await r.text();
        return json({ code: r.ok ? 0 : -1, msg: r.ok ? 'success' : `Lark HTTP ${r.status}`, data: { body: text } }, r.ok ? 200 : 502);
      } catch (e) {
        return json({ code: -1, msg: String(e?.message || e) }, 500);
      }
    }

    if (table === '' || table === 'health') {
      return json({ code: 0, msg: 'ok', tables: Object.keys(TABLE_ENV) });
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
      let items = [];
      let pageToken;
      do {
        const u = new URL(`${host}/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`);
        u.searchParams.set('page_size', '500');
        if (pageToken) u.searchParams.set('page_token', pageToken);
        const r = await fetch(u, { headers: { Authorization: `Bearer ${token}` } });
        const jj = await r.json();
        if (jj.code !== 0) return json(jj);
        items = items.concat(jj.data?.items ?? []);
        pageToken = jj.data?.has_more ? jj.data.page_token : null;
      } while (pageToken);

      const fieldMaps = await getFieldOptionMaps(env, host, appToken, token, tableId);
      resolveOptionRefs(items, fieldMaps);

      return json({ code: 0, msg: 'success', data: { items, has_more: false, total: items.length } });
    } catch (e) {
      return json({ code: -1, msg: String(e?.message || e), data: { items: [] } }, 500);
    }
  },
};
