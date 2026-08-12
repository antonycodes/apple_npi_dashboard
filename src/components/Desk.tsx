/**
 * Desk — a single interactive desk node on the floor map.
 *
 * Props follow the spec: `id`, `type`, `status`, `staffName`, `customerSTT`
 * (+ `waiting` bottleneck count and selection/click handlers). Color:
 *   occupied → red, available → green (kể cả khi Lark chưa có dữ liệu).
 */
import type { DeskUiStatus } from '@/types/desk';

export interface DeskProps {
  id: string;
  status: DeskUiStatus;
  staffName?: string | null;
  /** `DS Master.STT tiếp theo` — shown as the small badge above the desk. */
  nextWaitingStt?: string | null;
  /** Node center position (percent of board). */
  x: number;
  y: number;
  selected?: boolean;
  /** Dimmed by an active filter — faded and non-interactive. */
  dimmed?: boolean;
  onClick?: (id: string) => void;
}

const TONE: Record<DeskUiStatus, string> = {
  available: 'bg-vacant border-green-700 text-white',
  occupied: 'bg-occupied border-red-800 text-white',
};

export default function Desk({
  id,
  status,
  nextWaitingStt,
  x,
  y,
  selected = false,
  dimmed = false,
  onClick,
}: DeskProps) {
  const interactive = Boolean(onClick) && !dimmed;
  return (
    <button
      type="button"
      // Mốc để popup đo đúng vùng node và không bao giờ đè lên nó.
      data-desk-id={id}
      aria-label={`Bàn ${id} — ${status}`}
      title={id}
      disabled={!interactive}
      onClick={() => interactive && onClick?.(id)}
      style={{ left: `${x}%`, top: `${y}%` }}
      className={[
        'absolute -translate-x-1/2 -translate-y-1/2',
        // Sized from the board scale (index.css) so the gap to the STT dots of
        // the row above stays proportional on every screen, iPad included.
        'flex h-[var(--node)] w-[var(--node)] items-center justify-center px-[0.2em] rounded-md',
        'text-[length:var(--node-fs)] font-semibold leading-none',
        'border shadow-sm transition',
        interactive ? 'cursor-pointer hover:scale-110 hover:shadow-md' : 'cursor-default',
        dimmed ? 'pointer-events-none opacity-15' : '',
        selected ? 'z-20 scale-110 ring-2 ring-blue-500 ring-offset-1' : 'z-10',
        TONE[status],
      ].join(' ')}
    >
      {id}
      {nextWaitingStt && (
        <span
          data-desk-badge=""
          // VÀNG = "STT tiếp theo" (khách đang chờ tới lượt). Giữ nguyên vàng
          // để phân biệt với chấm ĐỎ dưới node (khách đang được tiếp nhận,
          // xem `LayoutDashboard.tsx`).
          // Sits just outside the top-right edge — never on top of the label.
          style={{ right: 'calc(var(--dot) * -0.55)', top: 'calc(var(--dot) * -0.45)' }}
          className="absolute flex h-[var(--dot)] min-w-[var(--dot)] items-center justify-center rounded-full bg-amber-500 px-[2px] text-[length:var(--dot-fs)] font-bold leading-none text-white shadow ring-1 ring-white"
          title={`STT tiếp theo: ${nextWaitingStt}`}
        >
          {nextWaitingStt}
        </span>
      )}
    </button>
  );
}
