/**
 * adminApi — đăng nhập admin + đọc/ghi cấu hình dùng chung qua worker.
 *
 * MỌI tài khoản đều gửi mật khẩu lên `/admin/login` để worker kiểm tra — admin
 * so với secret `ADMIN_PASSWORD`, nhân viên so với `STAFF_PASSWORD`. Không đặt
 * secret/hash vào bundle web — mọi thứ trong `src/` đều tải về được từ trình
 * duyệt.
 *
 * Token trả về có hạn 12h, giữ trong `config/adminSession.ts`. Hết hạn thì
 * worker từ chối và UI bắt đăng nhập lại — client không tự phán đoán quyền.
 */
import {
  adminSessionStore,
  type SessionRole,
  type StoredSession,
  type Workspace,
} from '@/config/adminSession';
import { larkSettingsStore } from '@/config/larkSettings';
import type { CoordinatorConfig } from '@/types/coordinator';

/** Base URL của worker — dùng chung ô "API URL" ở trang Cài đặt. */
export function workerBaseUrl(): string {
  const url = larkSettingsStore.getSnapshot().apiUrl.trim().replace(/\/+$/, '');
  return url || 'https://api.vhws.online';
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

/**
 * Đăng nhập. Tài khoản `admin` so với secret của worker; mọi tài khoản khác so
 * với `NPI_AIO_User`/`NPI_AIO_Pass` trong `Master_DS` — user đổi mật khẩu bên
 * Base là có hiệu lực sau tối đa 1 phút, không cần deploy lại.
 */
export async function login(username: string, password: string): Promise<StoredSession> {
  const res = await fetch(`${workerBaseUrl()}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const body = await parse(res);
  const data = body.data as {
    token: string;
    ttlMs: number;
    role?: SessionRole;
    desk?: string;
    desks?: string[];
    workspaces?: Workspace[];
    username?: string;
    msnv?: string;
    name?: string;
  };
  adminSessionStore.set(data.token, data.ttlMs, data.role ?? 'admin', data.desk ?? '', {
    desks: data.desks,
    workspaces: data.workspaces,
    username: data.username,
    msnv: data.msnv,
    name: data.name,
  });
  const session = adminSessionStore.getInfo();
  if (!session) throw new Error('Không lưu được phiên đăng nhập trên máy này.');
  return session;
}

/** Đọc công khai — máy điều phối gọi được mà không cần đăng nhập admin. */
export async function fetchCoordinators(signal?: AbortSignal): Promise<CoordinatorConfig> {
  const res = await fetch(`${workerBaseUrl()}/config/coordinators`, { signal });
  const body = await parse(res);
  return body.data as CoordinatorConfig;
}

/** Ghi — bắt buộc có token admin còn hạn. */
export async function saveCoordinators(config: CoordinatorConfig): Promise<CoordinatorConfig> {
  const token = adminSessionStore.getSnapshot();
  if (!token) throw new Error('Phiên đăng nhập đã hết hạn — đăng nhập lại.');
  const res = await fetch(`${workerBaseUrl()}/config/coordinators`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ coordinators: config.coordinators }),
  });
  const body = await parse(res);
  return body.data as CoordinatorConfig;
}
