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

function load(): string {
  const main = new URLSearchParams(window.location.search).get('dp')?.trim();
  if (main) return main;
  const queryIndex = window.location.hash.indexOf('?');
  if (queryIndex < 0) return '';
  return new URLSearchParams(window.location.hash.slice(queryIndex + 1)).get('dp')?.trim() ?? '';
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
    coordinatorId = id.trim();
    // Không dùng localStorage: danh tính máy đi theo query URL chính `?dp=...`,
    // nên đổi route/refresh vẫn giữ đúng người đã gán.
    const mainParams = new URLSearchParams(window.location.search);
    if (coordinatorId) mainParams.set('dp', coordinatorId);
    else mainParams.delete('dp');

    // Xoá bản dp cũ trong hash nếu có (tương thích link đã gán trước đây).
    const hash = window.location.hash || '#/';
    const [path, query = ''] = hash.split('?');
    const hashParams = new URLSearchParams(query);
    hashParams.delete('dp');
    const nextHash = `${path}${hashParams.toString() ? `?${hashParams.toString()}` : ''}`;
    window.history.replaceState(null, '', `${window.location.pathname}${mainParams.toString() ? `?${mainParams.toString()}` : ''}${nextHash}`);
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
