/**
 * Hạn giờ cho MỘT lượt đọc trong vòng polling.
 *
 * Vì sao cần (2026-08-19, sau sự cố thật): `fetch` không có hạn mặc định, mà
 * `startSerializedPolling` chỉ hẹn lượt sau KHI lượt hiện tại xong. Nên một
 * request treo không làm chậm màn hình — nó giết luôn vòng lặp: màn hình đứng
 * im ở dữ liệu cũ, KHÔNG báo lỗi, đồng hồ "Cập nhật hh:mm:ss" ngừng nhảy, phải
 * tải lại trang mới sống. Giữa hội trường thì không ai kịp nhận ra, mà nhân
 * viên vẫn bấm Tiếp nhận/Hoàn tất dựa trên những gì đang thấy.
 *
 * Đã đo được `/dashboard/snapshot` của worker không trả lời quá 25 giây ở 4/6
 * lượt gọi, nên đây không phải phòng xa.
 *
 * CHỈ áp cho đường ĐỌC. Đường ghi (Tiếp nhận/Hoàn tất/Điều phối/Bàn giao) không
 * dùng cái này: cắt giữa chừng một lượt POST thì không biết Lark đã tạo record
 * hay chưa, và gửi lại là tạo record trùng.
 */

/** 20 giây — gấp ~2.5 lần lượt đọc chậm nhất còn chấp nhận được, sau đó bỏ lượt. */
export const POLL_REQUEST_TIMEOUT_MS = 20_000;

export interface PollRequest {
  /** Truyền vào `fetch`/`fetchLarkData`. */
  signal: AbortSignal;
  /** true = bị cắt vì HẾT GIỜ, không phải do effect dọn dẹp (đổi bàn, rời trang). */
  timedOut: () => boolean;
  /** Gọi trong `finally` — dọn timer và listener. */
  done: () => void;
}

export function withRequestTimeout(
  parent: AbortSignal,
  ms: number = POLL_REQUEST_TIMEOUT_MS,
): PollRequest {
  const ctl = new AbortController();
  const onParentAbort = () => ctl.abort();
  parent.addEventListener('abort', onParentAbort);
  const timer = setTimeout(() => ctl.abort(), ms);

  return {
    signal: ctl.signal,
    timedOut: () => ctl.signal.aborted && !parent.aborted,
    done() {
      clearTimeout(timer);
      parent.removeEventListener('abort', onParentAbort);
    },
  };
}

/** Câu báo lỗi dùng chung cho mọi màn hình, để nhân viên đọc là hiểu. */
export const TIMEOUT_MESSAGE = `Máy chủ không trả lời trong ${
  POLL_REQUEST_TIMEOUT_MS / 1000
} giây — đang tự thử lại.`;
