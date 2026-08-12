/**
 * larkUpload — đưa ảnh nghiệm thu (form Hoàn tất khâu Thu cũ/Backup) lên Lark
 * và lấy về `file_token`.
 *
 * **Vì sao phải qua worker, không POST thẳng lên Lark**: cột đính kèm bên
 * Bitable chỉ nhận `file_token` do chính Lark cấp — không nhận URL, không nhận
 * base64 trong JSON. Mà API cấp token (`drive/v1/medias/upload_all`) đòi
 * `tenant_access_token`, tức phải có `app_id`/`app_secret` — 2 thứ TUYỆT ĐỐI
 * không được nằm trong bundle web. Nên đường đi là:
 *
 *   điện thoại NV → `POST <worker>/upload` (multipart) → worker ký bằng tenant
 *   token → Lark trả `file_token` → app gắn vào JSON gửi `/webhook2`.
 *
 * Xem `cloudflare-worker.js` (route `upload`) và `staffActionWebhook.ts`
 * (field `hinhNghiemThu`).
 */
import { workerBaseUrl } from './adminApi';

/**
 * Upload 1 ảnh, trả `file_token`.
 *
 * Ném Error với thông báo đọc được cho NV (hiện thẳng trong form) — caller
 * quyết định có chặn submit hay vẫn gửi thiếu ảnh, vì 3 field mới đều KHÔNG
 * bắt buộc (yêu cầu user 2026-08-12).
 */
export async function uploadNghiemThuImage(file: File, signal?: AbortSignal): Promise<string> {
  const form = new FormData();
  form.append('file', file, file.name || 'nghiem-thu.jpg');

  // KHÔNG tự đặt Content-Type: trình duyệt phải tự sinh boundary cho multipart.
  const res = await fetch(`${workerBaseUrl()}/upload`, { method: 'POST', body: form, signal });

  let body: { code?: number; msg?: string; data?: { fileToken?: string } };
  try {
    body = await res.json();
  } catch {
    throw new Error(`Upload ảnh lỗi (HTTP ${res.status})`);
  }
  if (!res.ok || body.code !== 0 || !body.data?.fileToken) {
    throw new Error(body.msg || `Upload ảnh lỗi (HTTP ${res.status})`);
  }
  return body.data.fileToken;
}
