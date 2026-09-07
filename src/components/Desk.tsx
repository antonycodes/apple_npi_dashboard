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
  nextWaitingTradeIn?: boolean | null;
  tradeInFilterActive?: boolean;
  /** Node center position (percent of board). */
  x: number;
  y: number;
  selected?: boolean;
  alert?: boolean;
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
  nextWaitingTradeIn = null,
  tradeInFilterActive = false,
  x,
  y,
  selected = false,
  alert = false,
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
        alert ? 'ring-2 ring-amber-400 ring-offset-2 shadow-[0_0_14px_rgba(245,158,11,0.7)]' : '',
        TONE[status],
      ].join(' ')}
    >
      {alert && (
        <span
          aria-label="HELP — Cần Điều phối hỗ trợ"
          style={{ bottom: 'calc(var(--node) * 0.04 - 1px)' }}
          className="absolute left-1/2 z-20 flex h-[calc(var(--node)*0.28)] min-w-[calc(var(--node)*0.78)] -translate-x-1/2 items-center justify-center rounded-[calc(var(--node)*0.07)] bg-amber-400 px-1 text-[length:calc(var(--node)*0.18)] font-black leading-none text-white shadow-[0_1px_3px_rgba(245,158,11,0.22)]"
        >
          HELP
        </span>
      )}
      <span className="relative z-10">{id}</span>
      {nextWaitingStt && (
        <span
          data-desk-badge=""
          // VÀNG = "STT tiếp theo" (khách đang chờ tới lượt). Giữ nguyên vàng
          // để phân biệt với chấm ĐỎ dưới node (khách đang được tiếp nhận,
          // xem `LayoutDashboard.tsx`).
          // Sits just outside the top-right edge — never on top of the label.
          style={{ right: 'calc(var(--dot) * -0.55)', top: 'calc(var(--dot) * -0.45)' }}
          className={`absolute flex h-[var(--dot)] min-w-[var(--dot)] items-center justify-center rounded-full px-[2px] text-[length:var(--dot-fs)] font-bold leading-none text-white shadow ring-1 ring-white ${tradeInFilterActive && nextWaitingTradeIn != null ? (nextWaitingTradeIn ? 'bg-red-600' : 'bg-neutral-400') : 'bg-amber-500'}`}
          title={`STT tiếp theo: ${nextWaitingStt}`}
        >
          {nextWaitingStt}
        </span>
      )}
    </button>
  );
}
