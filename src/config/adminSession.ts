/**
 * adminSession — phiên đăng nhập của MÁY NÀY (admin / nhân viên bàn / kho).
 *
 * Chỉ giữ token do worker cấp (hạn 12h) + thông tin nhận dạng đi kèm. **Không
 * có mật khẩu, không có hash** ở phía web — xem `services/adminApi.ts`.
 *
 * Từ 2026-08-19 tài khoản đến từ `Master_DS` (`NPI_AIO_User`/`NPI_AIO_Pass`),
 * nên phiên giữ thêm: `desks` (mọi bàn của người này — một MSNV có thể trực
 * nhiều bàn), `desk` (bàn đang chọn), `msnv` và `name` để điền sẵn vào record
 * app ghi ra thay vì tra lại từ dashboard.
 *
 * Cổng đăng nhập ở `App.tsx` chỉ chặn ở mức giao diện; thứ thật sự bảo vệ dữ
 * liệu là worker: ghi danh sách điều phối viên VÀ gửi form Điều phối đều bắt
 * buộc Bearer token hợp lệ, nên máy chưa đăng nhập thì có sửa localStorage
 * cũng không submit được gì.
 */
import { useSyncExternalStore } from 'react';

const LS_KEY = 'npievent-admin-token-v1';

export type SessionRole = 'admin' | 'staff' | 'kho' | 'dieuphoi' | 'checkin';

const SMS_SENDER_IDS = new Set(['S12196', 'S02791']);

/**
 * Một CHỖ LÀM VIỆC của tài khoản — mỗi dòng roster trong `Master_DS` là một
 * chỗ. Cùng một MSNV có thể vừa đứng bàn TV4, vừa có dòng Kho (roster thật:
 * S12504 = TV4 + TC4 + BK4 + KHO1), nên không thể quy về một vai trò duy nhất:
 * app phải hỏi hôm nay họ đang trực chỗ nào.
 */
export interface Workspace {
  /** Mã bàn / mã chỗ: "TV4", "TC1", "BK2", "KHO1", "DP3". */
  desk: string;
  /** Cột `Loại` nguyên văn — hiện lên cho người chọn đọc. */
  loai: string;
  role: 'staff' | 'kho' | 'dieuphoi';
  /**
   * Tên và MSNV lấy theo ĐÚNG DÒNG roster của chỗ này, không phải "tên của tài
   * khoản": mỗi dòng là một bàn với cột `NV Tư vấn` riêng. Chọn chỗ nào thì
   * app hiện — và ghi vào record — tên của chỗ đó.
   */
  name: string;
  msnv: string;
}

export interface StoredSession {
  token: string;
  expiresAt: number;
  role: SessionRole;
  /** Bàn ĐANG mở. Rỗng với admin và kho. */
  desk: string;
  /** Mọi bàn tài khoản này được vào — nhiều hơn 1 thì app hỏi chọn chỗ. */
  desks: string[];
  /** Chi tiết từng chỗ (bàn + Loại + vai trò) — nguồn để dựng màn chọn chỗ. */
  workspaces: Workspace[];
  /** Tài khoản đã đăng nhập (MSNV, hoặc "admin"). */
  username: string;
  /** MSNV để ghi vào cột `Submit by`. */
  msnv: string;
  /** Tên nhân sự, hiện trên thanh tiêu đề. */
  name: string;
}

/** Chỉ admin và hai MSNV được phép tạo yêu cầu SMS. */
export function canSendSms(session: StoredSession | null): boolean {
  if (!session) return false;
  if (session.role === 'admin') return true;
  return SMS_SENDER_IDS.has(String(session.msnv || session.username || '').trim().toUpperCase());
}

/** Tên cũ, giữ cho code đang import. */
export type StoredToken = StoredSession;

function load(): StoredSession | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const t = JSON.parse(raw) as Partial<StoredSession>;
    if (!t?.token || !t.expiresAt || t.expiresAt <= Date.now()) {
      localStorage.removeItem(LS_KEY);
      return null;
    }
    // Phiên lưu từ bản trước không có `desks`/`msnv` — suy lại từ `desk` thay
    // vì vứt đi, để máy đang chạy giữa sự kiện không bị bắt đăng nhập lại sau
    // khi deploy bản mới.
    const desk = t.desk ?? '';
    const desks = t.desks?.length ? t.desks : desk ? [desk] : [];
    const role = t.role ?? 'admin';
    return {
      token: t.token,
      expiresAt: t.expiresAt,
      role,
      desk,
      desks,
      workspaces:
        t.workspaces?.length
          ? t.workspaces
          : desks.map((d) => ({
              desk: d,
              loai: '',
              role: role === 'admin' || role === 'checkin' ? 'staff' : role,
              name: t.name ?? '',
              msnv: t.msnv ?? '',
            })),
      username: t.username ?? (t.role === 'admin' ? 'admin' : desk),
      msnv: t.msnv ?? '',
      name: t.name ?? '',
    };
  } catch {
    return null;
  }
}

let current = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    if (current) localStorage.setItem(LS_KEY, JSON.stringify(current));
    else localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
}

function emit() {
  listeners.forEach((l) => l());
}

export const adminSessionStore = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },
  /** Chuỗi rỗng = chưa đăng nhập (hoặc token đã hết hạn). */
  getSnapshot(): string {
    if (current && current.expiresAt <= Date.now()) current = null;
    return current?.token ?? '';
  },
  set(
    token: string,
    ttlMs: number,
    role: SessionRole = 'admin',
    desk = '',
    extra: {
      desks?: string[];
      workspaces?: Workspace[];
      username?: string;
      msnv?: string;
      name?: string;
    } = {},
  ) {
    const desks = extra.desks?.length ? extra.desks : desk ? [desk] : [];
    const workspaces = extra.workspaces?.length
      ? extra.workspaces
      : desks.map(
          (d) =>
            ({
              desk: d,
              loai: '',
              role: role === 'admin' || role === 'checkin' ? 'staff' : role,
              name: extra.name ?? '',
              msnv: extra.msnv ?? '',
            }) as Workspace,
        );
    // Đúng MỘT chỗ thì vào thẳng; nhiều chỗ thì CHƯA chọn gì — app hiện bước
    // chọn chỗ ngay sau đăng nhập. Chộp đại chỗ đầu tiên là mở nhầm màn hình.
    const only = workspaces.length === 1 ? workspaces[0] : null;
    current = {
      token,
      expiresAt: Date.now() + ttlMs,
      role: only ? only.role : role,
      desk: only ? only.desk : '',
      desks,
      workspaces,
      username: extra.username ?? (role === 'admin' ? 'admin' : desk),
      // Vào thẳng 1 chỗ thì danh tính là của chỗ đó; nhiều chỗ thì tạm dùng
      // mức tài khoản cho tới khi người dùng chọn.
      msnv: only?.msnv || extra.msnv || '',
      name: only?.name || extra.name || '',
    };
    persist();
    emit();
  },
  /**
   * Chọn/đổi chỗ làm việc. Vai trò đi THEO chỗ được chọn — chọn dòng KHO1 là
   * vào màn kho, chọn TV4 là vào màn bàn, cùng một tài khoản.
   */
  chooseDesk(desk: string) {
    if (!current) return;
    const ws = current.workspaces.find((w) => w.desk === desk);
    if (!ws) return;
    current = {
      ...current,
      desk: ws.desk,
      role: ws.role,
      name: ws.name || current.name,
      msnv: ws.msnv || current.msnv,
    };
    persist();
    emit();
  },
  /** Snapshot ổn định cho useSyncExternalStore — không tạo object mới mỗi lần đọc. */
  getInfo(): StoredSession | null {
    if (current && current.expiresAt <= Date.now()) current = null;
    return current;
  },
  clear() {
    current = null;
    try {
      localStorage.removeItem(LS_KEY);
    } catch {
      /* ignore */
    }
    emit();
  },
};

/** React hook: token hiện tại ('' nếu chưa đăng nhập). */
export function useAdminToken(): string {
  return useSyncExternalStore(
    adminSessionStore.subscribe,
    adminSessionStore.getSnapshot,
    adminSessionStore.getSnapshot,
  );
}

export function useAdminInfo(): StoredSession | null {
  return useSyncExternalStore(
    adminSessionStore.subscribe,
    adminSessionStore.getInfo,
    adminSessionStore.getInfo,
  );
}
