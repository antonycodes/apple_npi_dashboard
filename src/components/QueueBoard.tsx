/**
 * QueueBoard — grid of "STT hiện tại / STT tiếp theo" cards for one cluster.
 *
 * Used only by the standalone queue-display pages (/tuvanview, /thucuview,
 * /backupview).
 * Kept separate from LayoutDashboard/Desk (the coordinator's interactive
 * floor map) on purpose — this is a simpler, large-type view meant for a
 * monitor at each physical area, not the main dashboard.
 */
import { useEffect, useState } from 'react';
import { formatElapsed } from '@/config/staffTimers';
import { LEADTIME_WARNING_MINUTES } from '@/config/larkSettings';
import type { DeskQueueState } from '@/services/queueMapper';

function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);

  return now;
}

function ServiceTimer({ startedAt, now, leadtimeMinutes }: { startedAt: number | null | undefined; now: number; leadtimeMinutes: number }) {
  if (!startedAt || !Number.isFinite(startedAt)) return null;
  const elapsed = Math.max(0, now - startedAt);
  const leadtime = Math.max(1, leadtimeMinutes) * 60_000;
  const warningAt = Math.max(0, leadtimeMinutes - LEADTIME_WARNING_MINUTES) * 60_000;
  const tone = elapsed >= leadtime ? 'bg-red-100 text-red-700' : elapsed >= warningAt ? 'bg-amber-100 text-amber-700' : 'bg-neutral-100 text-neutral-700';

  return (
    <span className={`rounded-full px-2 py-0.5 font-mono text-sm font-bold tabular-nums ${tone}`} title="Từ lúc Tiếp nhận trong Base">
      {formatElapsed(elapsed)}
    </span>
  );
}

function DeskQueueCard({ desk, leadtimeMinutes }: { desk: DeskQueueState; leadtimeMinutes: number }) {
  const busy = desk.current.length > 0;
  const currentPrimary = desk.current[0]?.stt ?? null;
  const extraCurrent = desk.current.slice(1);
  const nextPrimary = desk.next[0]?.stt ?? null;
  const extraNextCount = desk.next.length - (desk.next.length > 0 ? 1 : 0);
  const now = useNow(busy);

  return (
    <div
      className={[
        'flex flex-col items-center gap-2 rounded-2xl border-2 bg-white p-4 shadow-sm',
        busy ? 'border-occupied/40' : 'border-vacant/40',
      ].join(' ')}
    >
      <div className="text-xl font-extrabold text-neutral-700">{desk.label}</div>

      <div className="flex flex-col items-center gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Đang phục vụ</span>
        <span className={`text-5xl font-black leading-none ${busy ? 'text-occupied' : 'text-neutral-300'}`}>
          {currentPrimary ?? '—'}
        </span>
        {busy && (
          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <span>Thời gian phục vụ</span>
            <ServiceTimer startedAt={desk.current[0]?.serviceStartedAt} now={now} leadtimeMinutes={leadtimeMinutes} />
          </div>
        )}
        {extraCurrent.length > 0 && (
          <span className="text-xs text-neutral-500" title="Các khách khác đang được phục vụ cùng bàn">
            + {extraCurrent.map((c) => c.stt ?? '•').join(', ')}
          </span>
        )}
      </div>

      <div className="w-full border-t border-dashed border-neutral-200" />

      <div className="flex flex-col items-center gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-500">STT tiếp theo</span>
        <span className={`text-3xl font-bold leading-none ${nextPrimary ? 'text-amber-600' : 'text-neutral-300'}`}>
          {nextPrimary ?? '—'}
        </span>
        {extraNextCount > 0 && <span className="text-xs text-amber-600">+{extraNextCount} đang chờ</span>}
      </div>
    </div>
  );
}

export default function QueueBoard({ desks, leadtimeMinutes = 20 }: { desks: DeskQueueState[]; leadtimeMinutes?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {desks.map((d) => (
        <DeskQueueCard key={d.id} desk={d} leadtimeMinutes={leadtimeMinutes} />
      ))}
    </div>
  );
}
