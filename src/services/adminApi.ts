/**
 * adminApi — đăng nhập admin + đọc/ghi cấu hình dùng chung qua worker.
 *
 * **Mật khẩu không nằm trong bundle**: file này chỉ GỬI username/password lên
 * `/admin/login`; việc so khớp làm hoàn toàn ở worker (secret
 * `ADMIN_PASSWORD_HASH`). Xem cả `cloudflare-worker.js`. Đừng bao giờ thêm
 * mật khẩu/hash vào đây — mọi thứ trong `src/` đều tải về được từ trình duyệt.
 *
 * Token trả về có hạn 12h, giữ trong `config/adminSession.ts`. Hết hạn thì
 * worker từ chối và UI bắt đăng nhập lại — client không tự phán đoán quyền.
 */
import { adminSessionStore } from '@/config/adminSession';
import { larkSettingsStore } from '@/config/larkSettings';
import type { CoordinatorConfig } from '@/types/coordinator';

/** Base URL của worker — dùng chung ô "API URL" ở trang Cài đặt. */
function baseUrl(): string {
  const url = larkSettingsStore.getSnapshot().apiUrl.trim().replace(/\/+$/, '');
  if (!url) {
    throw new Error('Chưa cấu hình API URL (Cài đặt Lark → 2 · Kết nối Lark).');
  }
  return url;
}

async function parse(res: Response): Promise<{ data?: unknown }> {
  let body: { code?: number; msg?: string; data?: unknown };
  try {
    body = await res.json();
  } catch {
    throw new Error(`Máy chủ trả về dữ liệu không hợp lệ (HTTP ${res.status})`);
  }
  if (!res.ok || body.code !== 0) throw new Error(body.msg || `HTTP ${res.status}`);
  return body;
}

export async function login(username: string, password: string): Promise<string> {
  const res = await fetch(`${baseUrl()}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const body = await parse(res);
  const data = body.data as { token: string; ttlMs: number };
  adminSessionStore.set(data.token, data.ttlMs);
  return data.token;
}

/** Đọc công khai — máy điều phối gọi được mà không cần đăng nhập admin. */
export async function fetchCoordinators(signal?: AbortSignal): Promise<CoordinatorConfig> {
  const res = await fetch(`${baseUrl()}/config/coordinators`, { signal });
  const body = await parse(res);
  return body.data as CoordinatorConfig;
}

/** Ghi — bắt buộc có token admin còn hạn. */
export async function saveCoordinators(config: CoordinatorConfig): Promise<CoordinatorConfig> {
  const token = adminSessionStore.getSnapshot();
  if (!token) throw new Error('Phiên đăng nhập đã hết hạn — đăng nhập lại.');
  const res = await fetch(`${baseUrl()}/config/coordinators`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ coordinators: config.coordinators }),
  });
  const body = await parse(res);
  return body.data as CoordinatorConfig;
}
