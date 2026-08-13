/**
 * dispatchWebhook — gửi form "Điều phối" ra webhook Lark Base.
 *
 * Đây là đường GHI MỘT CHIỀU, tách hẳn khỏi luồng dữ liệu dashboard: không
 * hook nào đọc lại kết quả, `useDashboardData` vẫn chỉ đọc Lark như cũ. Form
 * chỉ POST 1 JSON rồi quên — sai/thiếu ở đây không làm sơ đồ bàn lệch đi.
 *
 * **CORS**: URL webhook gốc của Lark (`.../flow/api/trigger-webhook/...`,
 * `.../anycross/trigger/callback/...`) KHÔNG trả header CORS, nên request có
 * `Content-Type: application/json` bị chặn ngay ở bước preflight. Vì vậy:
 *   1. thử gửi kiểu thường trước — nếu qua được (vd webhook đi qua Cloudflare
 *      Worker proxy) thì đọc được HTTP status ⇒ xác nhận chắc chắn;
 *   2. bị CORS chặn thì gửi lại dạng "simple request" (`mode: 'no-cors'` +
 *      `text/plain`, không preflight) — Lark vẫn nhận và parse được body JSON,
 *      nhưng trình duyệt trả response opaque nên KHÔNG biết server nói gì.
 * Trường hợp (2) trả `confirmed: false` để UI nói đúng sự thật ("đã gửi,
 * không đọc được phản hồi") thay vì báo thành công chắc nịch.
 *
 * **Token**: khi Webhook URL trỏ vào worker (`/webhook`), worker BẮT BUỘC
 * Bearer token admin — máy chưa đăng nhập không submit được. Trỏ thẳng vào
 * URL Lark thì không có ràng buộc đó (Lark không biết token của ta), lúc đó
 * cổng đăng nhập chỉ còn tác dụng ở mức giao diện.
 */
import { adminSessionStore } from '@/config/adminSession';

/** Payload gửi lên webhook — key ASCII, không dấu, để map trong Lark cho gọn. */
export interface DispatchFormPayload {
  /** STT khách, nguyên văn người dùng nhập. */
  stt: string;
  /** "Tư vấn" | "Thu cũ" | "Backup" — cùng bộ giá trị với `Master."Loại 2"`. */
  phanLoai: string;
  /** Mã bàn của nhân sự được chọn (vd "TV7"). */
  maBan: string;
  /** Tên NV đang ngồi bàn đó (rỗng nếu dashboard chưa biết). */
  nhanSu: string;
  /** MSNV lấy từ `Master_DS.MSNV`, không nhập tay trên form. */
  msnv: string;
  /** Thời điểm bấm gửi, ISO 8601. */
  thoiGian: string;
  /** Máy nào gửi — ID điều phối viên gán ở `#/admin` (xem `config/deviceIdentity.ts`). */
  dieuPhoiId: string;
  dieuPhoiTen: string;
  dieuPhoiViTri: string;
  /** Giá trị ghi vào cột "Submit by" bên Lark — chính là MSNV nhân viên. */
  submitBy: string;
}

export interface DispatchSendResult {
  /** true = đọc được HTTP status 2xx; false = đã gửi nhưng response opaque (CORS). */
  confirmed: boolean;
}

export async function sendDispatchForm(
  url: string,
  payload: DispatchFormPayload,
): Promise<DispatchSendResult> {
  if (!url) {
    throw new Error('Chưa cấu hình Webhook URL — vào "Cài đặt Lark" → mục Webhook Điều phối.');
  }

  const body = JSON.stringify(payload);
  const token = adminSessionStore.getSnapshot();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(url, { method: 'POST', headers, body });
    if (res.status === 401) {
      adminSessionStore.clear();
      throw new Error('Phiên đăng nhập đã hết hạn — đăng nhập lại rồi gửi lại.');
    }
    if (!res.ok) {
      // Hiện nguyên văn `msg` của worker thay vì chỉ mã số. Với route ghi
      // thẳng `/dispatch-record`, lỗi hay gặp nhất là lệch tên cột và worker
      // nói rõ cột nào — nuốt mất câu đó thì điều phối viên chỉ thấy "HTTP
      // 400" và không ai biết phải sửa gì.
      let detail = '';
      try {
        const raw = await res.text();
        const parsed = JSON.parse(raw) as { msg?: string; data?: { body?: string } };
        detail = parsed.msg ?? parsed.data?.body ?? raw;
      } catch {
        /* response không phải JSON */
      }
      throw new Error(`Webhook trả về HTTP ${res.status}${detail ? ` — ${detail}` : ''}`);
    }
    return { confirmed: true };
  } catch (err) {
    // Chỉ `TypeError` mới là "fetch không đi được" (CORS/mạng); lỗi HTTP ở
    // trên là Error thường → ném tiếp, không gửi lặp lần 2.
    if (!(err instanceof TypeError)) throw err;

    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body,
    });
    return { confirmed: false };
  }
}
