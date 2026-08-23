/**
 * staffDeskIdentity — "điện thoại này là bàn nào".
 *
 * Dùng cho
 * màn hình nhân viên `#/nv`: mỗi máy chỉ lưu MÃ BÀN (vd "TV7"), mọi thứ khác —
 * tên NV, khách, STT — luôn đọc từ Lark. Link nhân viên dùng mã bàn trong URL;
 * bản `#/nv` chỉ giữ lựa chọn trong phiên hiện tại, không lưu localStorage.
 */
import { useSyncExternalStore } from 'react';

function load(): string {
  return '';
}

let deskId = load();
const listeners = new Set<() => void>();

export const staffDeskStore = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },
  getSnapshot(): string {
    return deskId;
  },
  set(id: string) {
    deskId = id;
    listeners.forEach((l) => l());
  },
};

/** React hook: mã bàn của máy này ('' nếu chưa chọn). */
export function useStaffDeskId(): string {
  return useSyncExternalStore(staffDeskStore.subscribe, staffDeskStore.getSnapshot, staffDeskStore.getSnapshot);
}
