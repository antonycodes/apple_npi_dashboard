/**
 * staffLink — link RIÊNG cho từng bàn (`/tv4`, `/tc1`, `/bk2`…) mà điều
 * phối/admin gửi cho từng nhân viên.
 *
 * Cấu hình không nằm trong link: mọi máy bootstrap từ Worker trung tâm rồi đọc
 * cấu hình Live Base trong KV. `?api=` cũ vẫn được hiểu để tương thích, nhưng
 * link mới luôn sạch.
 *
 * URL proxy không phải bí mật (chính dashboard cũng gọi thẳng từ trình duyệt,
 * và worker chỉ cho ĐỌC công khai — mọi đường ghi đều đòi Bearer token admin,
 * xem `cloudflare-worker.js`).
 */
import { larkSettingsStore } from './larkSettings';

/** Query của link mới (`/tv4?api=…`) và link hash cũ. */
function hashQuery(hash: string = window.location.hash): URLSearchParams {
  const q = hash.indexOf('?');
  return new URLSearchParams(q >= 0 ? hash.slice(q + 1) : '');
}

function routeQuery(): URLSearchParams {
  const params = new URLSearchParams(window.location.search);
  const legacy = hashQuery();
  legacy.forEach((value, key) => params.set(key, value));
  return params;
}

/** Phần path legacy trong hash, đã bỏ `#/` và query. */
export function hashPath(hash: string = window.location.hash): string {
  const noHash = hash.replace(/^#\/?/, '');
  const q = noHash.indexOf('?');
  return (q >= 0 ? noHash.slice(0, q) : noHash).trim();
}

/**
 * Nhận `?api=…` (và `?mock=1` để test) từ link, lưu vào settings rồi xoá tham
 * số khỏi URL. Trả về true nếu vừa đổi cấu hình (caller không cần làm gì thêm —
 * `larkSettingsStore` tự báo cho mọi hook đang nghe).
 */
export function applyLinkConfigFromHash(): boolean {
  const params = routeQuery();
  const api = params.get('api')?.trim();
  const mock = params.get('mock');
  if (!api && !mock) return false;

  const current = larkSettingsStore.getSnapshot();
  const next = { ...current };
  if (api) {
    next.apiUrl = api;
    next.useMock = false;
  }
  if (mock === '1') next.useMock = true;
  const changed = next.apiUrl !== current.apiUrl || next.useMock !== current.useMock;
  if (changed) larkSettingsStore.save(next);

  // Dọn URL: giữ nguyên path, bỏ hết query — dùng replaceState để không thêm
  // 1 bước vào lịch sử (nút back của NV không quay lại link có tham số).
  const cleanParams = new URLSearchParams(window.location.search);
  cleanParams.delete('api');
  cleanParams.delete('mock');
  const query = cleanParams.toString();
  const legacyPath = hashPath();
  const cleanPath = legacyPath ? `/${legacyPath}` : window.location.pathname || '/';
  const clean = `${cleanPath}${query ? `?${query}` : ''}`;
  window.history.replaceState(null, '', clean);
  return changed;
}

/** Link đầy đủ để copy/gửi cho nhân viên của bàn `deskId`. */
export function deskLinkFor(deskId: string): string {
  return `${window.location.origin}/${deskId.toLowerCase()}`;
}
