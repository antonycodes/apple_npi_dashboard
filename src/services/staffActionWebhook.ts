/**
 * staffActionWebhook — gửi 2 thao tác "Tiếp nhận" / "Hoàn tất" của nhân viên
 * ra webhook Lark để automation TẠO RECORD trong `SS_Master`.
 *
 * Đường GHI MỘT CHIỀU, tách hẳn khỏi luồng đọc: app không đọc lại phản hồi để
 * dựng UI — trạng thái thật vẫn do vòng polling 5s đọc từ Lark quyết định (xem
 * `StaffDeskScreen`). Webhook chỉ là cách ghi thay cho việc mở hyperlink.
 *
 * Đích thật nằm trong secret `LARK_WEBHOOK_URL2` của worker; app chỉ trỏ vào
 * `https://<worker>/webhook2` nên URL Lark không lộ trong bundle và worker
 * không thành open proxy (xem `cloudflare-worker.js`).
 *
 * **CORS**: y hệt `dispatchWebhook.ts` — qua worker thì đọc được HTTP status
 * (`confirmed: true`); trỏ thẳng URL Lark thì phải gửi lại kiểu "simple
 * request" (`no-cors`), Lark vẫn nhận nhưng trình duyệt không đọc được gì
 * (`confirmed: false`). UI nói đúng sự thật thay vì báo thành công chắc nịch.
 */
import { adminSessionStore } from '@/config/adminSession';

/** Payload gửi lên webhook — key ASCII không dấu, để map trong Lark cho gọn. */
export interface StaffActionPayload {
  /**
   * Nhánh xử lý bên worker/automation. KHÔNG ghi vào cột nào của Base.
   *
   * `thu_may` = thao tác "chỉ thu máy cũ" (xem `ThuMayModal`). Vẫn ghi
   * `trangThai: 'Hoàn tất'` như thường, nhưng để `action` riêng vì worker chỉ
   * tính leadtime khi `action === 'hoan_tat'` — thao tác thu máy KHÔNG phải một
   * khâu phục vụ, để nó rơi vào nhánh đó là worker đi tìm dòng "Tiếp nhận"
   * cùng khâu rồi ghi ra một con số vô nghĩa (khoảng cách từ lúc nhận khách ở
   * khâu trước tới lúc cầm máy), làm hỏng chính số liệu leadtime dùng để đánh
   * giá hiệu quả.
   */
  action: 'tiep_nhan' | 'hoan_tat' | 'thu_may';
  /** Trạng thái ghi vào `SS_Master."Trạng thái"` — gửi luôn để automation khỏi tự nối. */
  trangThai: 'Tiếp nhận' | 'Hoàn tất';
  /** STT khách (từ `Master_Check in`). */
  stt: string;
  /** Họ và tên khách — khoá join của mọi bảng bên Lark. */
  hoTen: string;
  /** Mã bàn, khớp `SS_Master."TV_MãNV"` (vd "TV4", "TC1", "BK3"). */
  maBan: string;
  /** MSNV lấy từ Master_DS, không cho sửa trên form nhân viên. */
  msnv: string;
  /** "Tư vấn" | "Thu cũ" | "Backup" — cùng bộ giá trị với `SS_Master."Loại 2"`. */
  phanLoai: string;
  /** Tên NV đang ngồi bàn đó (rỗng nếu dashboard chưa biết). */
  nhanSu: string;
  /** Username/email Lark của nhân viên tương ứng với mã bàn. */
  submitBy: string;
  /** Thời điểm bấm nút, ISO 8601. */
  thoiGian: string;
  /**
   * "Có" | "Không" — CHỈ gửi khi HOÀN TẤT (mọi khâu: Tư vấn, Thu cũ, Backup —
   * mở rộng 2026-08-12 theo yêu cầu user, ban đầu chỉ Tư vấn): NV tự xác nhận
   * khách này có dùng Backup không, độc lập với cột "Backup check" (Check-in,
   * do khâu khác ghi). Tiếp nhận thì KHÔNG có field này trong payload.
   */
  checkBackup?: 'Có' | 'Không';
  /**
   * "Thu máy ngay" | "Thu máy sau" — CHỈ khi Hoàn tất ở khâu THU CŨ/BACKUP
   * (yêu cầu user 2026-08-12, tiếp). Chọn option nào cũng mở ra 3 field dưới.
   */
  thuLaiMay?: 'Thu máy ngay' | 'Thu máy sau';
  /**
   * Danh sách `file_token` do Lark cấp cho ảnh nghiệm thu — KHÔNG phải URL hay
   * base64. App upload từng ảnh qua `POST /upload` của worker trước, gom token
   * rồi mới gửi kèm ở đây; `/record` bọc thành `[{file_token}, …]` để đưa vào
   * cột đính kèm (xem `larkUpload.ts` + `cloudflare-worker.js`).
   *
   * Là MẢNG vì NV chọn được nhiều ảnh 1 lần (yêu cầu user 2026-08-12). Không
   * có ảnh nào thì key này biến mất khỏi payload.
   */
  hinhNghiemThu?: string[];
  /** Nội dung QR máy thu cũ NV vừa quét (hoặc gõ tay). */
  scanQr?: string;
  /** IMEI máy thu cũ. */
  imei?: string;
  /**
   * Thời gian phục vụ khách này tại bàn, tính bằng GIÂY — từ lúc bấm Tiếp nhận
   * tới lúc bấm Hoàn tất. CHỈ gửi khi Hoàn tất và máy này có mốc bắt đầu.
   *
   * Đây là số dùng để tính toán; `leadtimeHienThi` chỉ để người đọc.
   */
  leadtimeGiay?: number;
  /** Cùng khoảng thời gian trên, dạng "07:12" hoặc "1:03:44" cho dễ đọc. */
  leadtimeHienThi?: string;
  /**
   * "Có" = mốc bắt đầu là SUY RA, không phải lúc bấm Tiếp nhận thật.
   *
   * Xảy ra khi màn hình mở lên và thấy sẵn khách ở bàn — khách được tiếp nhận
   * từ máy khác, hoặc NV tải lại trang giữa chừng (đồng hồ chỉ nằm trong bộ
   * nhớ phiên, xem `staffTimers.ts`). Khi đó con số ĐO THIẾU so với thực tế.
   *
   * BẮT BUỘC lọc bỏ những dòng này trước khi tính hiệu suất, nếu không trung
   * bình sẽ thấp hơn sự thật một cách có hệ thống.
   */
  leadtimeUocLuong?: 'Có' | 'Không';
}

export interface StaffActionResult {
  /** true = đọc được HTTP 2xx; false = đã gửi nhưng response opaque (CORS). */
  confirmed: boolean;
}

/** Tiếp nhận/Hoàn tất phải ghi thẳng vào SS_Master qua `/record`. */
function normalizeStaffActionUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    if (url.pathname.replace(/\/+$/, '') === '/webhook2') {
      url.pathname = '/record';
      return url.toString();
    }
  } catch {
    // Giữ nguyên để fetch trả lỗi cấu hình rõ ràng.
  }
  return rawUrl;
}

export async function sendStaffAction(
  url: string,
  payload: StaffActionPayload,
): Promise<StaffActionResult> {
  if (!url) throw new Error('Chưa cấu hình Webhook Tiếp nhận/Hoàn tất.');

  const body = JSON.stringify(payload);
  const actionUrl = normalizeStaffActionUrl(url);
  const token = adminSessionStore.getSnapshot();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(actionUrl, { method: 'POST', headers, body });
    if (res.status === 401) {
      adminSessionStore.clear();
      throw new Error('Phiên đăng nhập đã hết hạn — đăng nhập lại rồi bấm lại.');
    }
    if (!res.ok) {
      // Worker trả msg cụ thể khi thiếu secret; khi Lark workflow lỗi, body
      // thường chứa HTTP/status hoặc thông báo validation. Hiển thị nó thay
      // vì nuốt mất nguyên nhân thành "HTTP 500".
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
    // Chỉ `TypeError` mới là "fetch không đi được" (CORS/mạng); lỗi HTTP ở trên
    // là Error thường → ném tiếp, không gửi lặp lần 2 (tránh tạo record thừa).
    if (!(err instanceof TypeError)) throw err;

    await fetch(actionUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body,
    });
    return { confirmed: false };
  }
}
