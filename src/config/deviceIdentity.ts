/**
 * deviceIdentity — "máy này là điều phối viên nào".
 *
 * Đây là thứ DUY NHẤT nên khác nhau giữa các máy: mỗi máy chọn 1 ID trong
 * danh sách dùng chung (admin quản ở `#/admin`), phần còn lại — tên, vị trí —
 * luôn đọc từ server nên admin sửa ở 1 chỗ là mọi máy cập nhật theo. Lưu ID
 * chứ không lưu cả object chính là để tránh cảnh mỗi máy giữ một bản tên/vị
 * trí cũ khác nhau.
 */
import { useSyncExternalStore } from 'react';

const LS_KEY = 'npievent-device-coordinator-v1';

function load(): string {
  try {
    return localStorage.getItem(LS_KEY) ?? '';
  } catch {
    return '';
  }
}

let coordinatorId = load();
const listeners = new Set<() => void>();

export const deviceIdentityStore = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },
  getSnapshot(): string {
    return coordinatorId;
  },
  set(id: string) {
    coordinatorId = id;
    try {
      if (id) localStorage.setItem(LS_KEY, id);
      else localStorage.removeItem(LS_KEY);
    } catch {
      /* ignore */
    }
    listeners.forEach((l) => l());
  },
};

/** React hook: ID điều phối viên của máy này ('' nếu chưa gán). */
export function useDeviceCoordinatorId(): string {
  return useSyncExternalStore(
    deviceIdentityStore.subscribe,
    deviceIdentityStore.getSnapshot,
    deviceIdentityStore.getSnapshot,
  );
}
