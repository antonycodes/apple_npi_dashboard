/**
 * staffTimers — đồng hồ "đang phục vụ khách này bao lâu rồi", tính từ lúc NV
 * bấm **Tiếp nhận** tới lúc bấm **Hoàn tất** (yêu cầu user 2026-08-12).
 *
 * Vì 2 nút chỉ là hyperlink mở Lark (app không ghi gì vào Base), Lark KHÔNG
 * trả về mốc "bắt đầu tiếp nhận" nào để đọc — nên mốc này được ghi ngay trên
 * bộ nhớ phiên của trang. Mốc nghiệp vụ chính thức nên nằm trong record Lark;
 * app không lưu timer vào trình duyệt/local.
 *
 * Khoá là `${mã bàn}|${STT}` chứ không phải chỉ mã bàn: 1 NV có thể phục vụ
 * nhiều khách cùng lúc, mỗi khách 1 đồng hồ riêng.
 *
 * `approx` = mốc SUY RA, không phải lúc bấm nút: xảy ra khi màn hình mở lên và
 * thấy sẵn 1 khách đang ở bàn (khách được tiếp nhận từ máy khác, hoặc trước
 * khi có tính năng này). Hiển thị kèm dấu `~` để không ai nhầm là số đo thật.
 */
import { useSyncExternalStore } from 'react';

export interface TimerEntry {
  /** epoch ms — lúc bấm Tiếp nhận (hoặc lúc màn hình thấy khách nếu `approx`). */
  startedAt: number;
  approx: boolean;
}

type TimerMap = Record<string, TimerEntry>;

function keyOf(deskId: string, stt: string): string {
  return `${deskId}|${stt}`;
}

function load(): TimerMap {
  return {};
}

let timers: TimerMap = load();
const listeners = new Set<() => void>();

function commit(next: TimerMap) {
  timers = next;
  listeners.forEach((l) => l());
}

export const staffTimerStore = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },
  getSnapshot(): TimerMap {
    return timers;
  },
  get(deskId: string, stt: string | null): TimerEntry | undefined {
    return stt ? timers[keyOf(deskId, stt)] : undefined;
  },
  /** Bắt đầu đếm. Đã có mốc THẬT rồi thì giữ nguyên; mốc `approx` bị mốc thật ghi đè. */
  start(deskId: string, stt: string | null, approx = false) {
    if (!stt) return;
    const k = keyOf(deskId, stt);
    const prev = timers[k];
    if (prev && (prev.approx === approx || !prev.approx)) return;
    commit({ ...timers, [k]: { startedAt: Date.now(), approx } });
  },
  /** Đặt lại nguyên 1 mốc đã lưu — dùng để HOÀN TÁC khi gửi webhook thất bại. */
  restore(deskId: string, stt: string | null, entry: TimerEntry | undefined) {
    if (!stt || !entry) return;
    commit({ ...timers, [keyOf(deskId, stt)]: entry });
  },
  /** Dừng & xoá (bấm Hoàn tất, hoặc khách đã rời bàn). */
  stop(deskId: string, stt: string | null) {
    if (!stt) return;
    const k = keyOf(deskId, stt);
    if (!timers[k]) return;
    const next = { ...timers };
    delete next[k];
    commit(next);
  },
  /**
   * Xoá đồng hồ của mọi khách KHÔNG còn ở bàn này nữa (Lark đã ghi Hoàn tất,
   * hoặc khách được chuyển bàn) — giữ `localStorage` khỏi phình theo cả sự kiện.
   */
  pruneDesk(deskId: string, keepStts: Array<string | null>) {
    const keep = new Set(keepStts.filter((s): s is string => Boolean(s)).map((s) => keyOf(deskId, s)));
    const prefix = `${deskId}|`;
    const next: TimerMap = {};
    let changed = false;
    for (const [k, v] of Object.entries(timers)) {
      if (k.startsWith(prefix) && !keep.has(k)) {
        changed = true;
        continue;
      }
      next[k] = v;
    }
    if (changed) commit(next);
  },
};

/** React hook: toàn bộ map đồng hồ (re-render khi có thay đổi). */
export function useStaffTimers(): TimerMap {
  return useSyncExternalStore(
    staffTimerStore.subscribe,
    staffTimerStore.getSnapshot,
    staffTimerStore.getSnapshot,
  );
}

/** "07:12" / "1:03:44" — bỏ giờ khi chưa tới 1 tiếng cho gọn màn hình. */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
