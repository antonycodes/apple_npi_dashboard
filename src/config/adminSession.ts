/**
 * adminSession — phiên đăng nhập admin của MÁY NÀY.
 *
 * Chỉ giữ token do worker cấp (hạn 12h) + thời điểm hết hạn. **Không có mật
 * khẩu, không có hash** ở phía web — xem `services/adminApi.ts`.
 *
 * Cổng đăng nhập ở `App.tsx` chỉ chặn ở mức giao diện; thứ thật sự bảo vệ dữ
 * liệu là worker: ghi danh sách điều phối viên VÀ gửi form Điều phối đều bắt
 * buộc Bearer token hợp lệ, nên máy chưa đăng nhập thì có sửa localStorage
 * cũng không submit được gì.
 */
import { useSyncExternalStore } from 'react';

const LS_KEY = 'npievent-admin-token-v1';

interface StoredToken {
  token: string;
  expiresAt: number;
}

function load(): StoredToken | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const t = JSON.parse(raw) as StoredToken;
    if (!t?.token || t.expiresAt <= Date.now()) {
      localStorage.removeItem(LS_KEY);
      return null;
    }
    return t;
  } catch {
    return null;
  }
}

let current = load();
const listeners = new Set<() => void>();

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
  set(token: string, ttlMs: number) {
    current = { token, expiresAt: Date.now() + ttlMs };
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(current));
    } catch {
      /* ignore */
    }
    emit();
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
