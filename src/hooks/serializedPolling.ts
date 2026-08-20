/**
 * Vòng đọc TUẦN TỰ cho từng máy: chỉ hẹn lượt đọc kế tiếp SAU KHI lượt hiện tại
 * xong, thay cho `setInterval` vốn cứ đến hẹn là bắn thêm request dù lượt trước
 * còn treo. Khi Lark chậm (hay gặp lúc đông), `setInterval` khiến một máy tự
 * chồng nhiều vòng đọc lên nhau và làm tình hình tệ thêm.
 *
 * CHỈ áp cho đường ĐỌC. Không đụng gì tới POST — TV1 và TV2 vẫn phải Tiếp
 * nhận/Hoàn tất đồng thời được.
 */
export function startSerializedPolling(
  load: (initial: boolean) => Promise<void>,
  pollMs: number,
  isCancelled: () => boolean,
): () => void {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const delay = Math.max(1000, pollMs);

  const stop = () => {
    stopped = true;
    if (timer !== undefined) clearTimeout(timer);
  };

  /**
   * Nuốt lỗi rồi VẪN hẹn lượt sau. Hiện `load` của cả 3 hook đều có try/catch
   * bao trọn nên không bao giờ reject — nhưng nếu về sau có ai sửa làm nó
   * reject được thì vòng lặp sẽ chết IM LẶNG: màn hình đứng ở dữ liệu cũ,
   * không báo lỗi, phải tải lại trang mới sống. Kiểu hỏng đó cực khó lần ra
   * giữa sự kiện, nên chặn ngay tại đây thay vì tin vào caller.
   */
  const runOnce = async (initial: boolean) => {
    try {
      await load(initial);
    } catch {
      /* lỗi đã được hook tự xử lý; ở đây chỉ cần giữ cho vòng lặp sống */
    }
  };

  const schedule = (waitMs: number = delay) => {
    if (stopped || isCancelled()) return;
    timer = setTimeout(() => void loop(), waitMs);
  };

  const loop = async () => {
    if (stopped || isCancelled()) return;
    const startedAt = Date.now();
    await runOnce(false);
    schedule(Math.max(0, delay - (Date.now() - startedAt)));
  };

  const firstStartedAt = Date.now();
  void runOnce(true).then(() => schedule(Math.max(0, delay - (Date.now() - firstStartedAt))));

  return stop;
}
