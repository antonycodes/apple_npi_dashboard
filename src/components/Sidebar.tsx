/**
 * Sidebar — operational summary for the coordinator.
 *
 * Shows the total checked-in customers (from the Lark "Check in" table) and a
 * and the two interactive waiting zones moved outside the floor map.
 */
import WaitingPopover from '@/components/WaitingPopover';
import type { DashboardSummary, WaitingCustomer, WaitingZoneKey } from '@/types/desk';

interface SidebarProps {
  summary: DashboardSummary;
  waitingCheckin: WaitingCustomer[];
  waitingDispatch: WaitingCustomer[];
  selectedWaiting?: { zone: WaitingZoneKey; index: number } | null;
  onSelectWaiting?: (zone: WaitingZoneKey, index: number) => void;
  onCloseWaiting?: () => void;
  /** Bấm "DP" trong popup khách chờ — mở Form Điều phối với STT điền sẵn. */
  onDispatchWaiting?: (customer: WaitingCustomer) => void;
}

export default function Sidebar({
  summary,
  waitingCheckin,
  waitingDispatch,
  selectedWaiting,
  onSelectWaiting,
  onCloseWaiting,
  onDispatchWaiting,
}: SidebarProps) {
  const c = summary.customers;
  return (
    /*
      Rail on the right from `lg` up (tablet landscape / desktop); when it wraps
      under the board (tablet portrait) the three cards become one compact row so
      the summary never pushes the floor map off screen.
    */
    <aside className="w-full shrink-0 lg:self-stretch lg:w-56 xl:w-64">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:h-full lg:grid-cols-1 lg:grid-rows-[auto_minmax(0,1fr)_minmax(0,1fr)] lg:gap-4">
        {/* Customer funnel */}
        <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm xl:p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            Khách đã Check-in
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-neutral-800 xl:text-3xl">{c.checkedIn}</span>
            <span className="text-base font-semibold text-neutral-400 xl:text-lg">
              / {c.totalRegistered}
            </span>
          </div>
          <div className="mt-2 space-y-2 border-t border-neutral-100 pt-2 xl:mt-3 xl:pt-3">
            <Ratio label="Check-in / Tổng đăng ký" num={c.checkedIn} den={c.totalRegistered} numClass="text-neutral-800" barClass="bg-neutral-400" />
            <Ratio label="Đang tư vấn / Check-in" num={c.consulting} den={c.checkedIn} numClass="text-occupied" barClass="bg-occupied" />
            <Ratio label="Chưa được phục vụ / Check-in" num={c.notServed} den={c.checkedIn} numClass="text-amber-600" barClass="bg-amber-500" />
          </div>
        </div>

        <WaitingZoneCard
          label="Đã check-in"
          zone="checkin"
          items={waitingCheckin}
          selectedIndex={selectedWaiting?.zone === 'checkin' ? selectedWaiting.index : null}
          onSelect={onSelectWaiting}
          onClose={onCloseWaiting}
          onDispatch={onDispatchWaiting}
        />
        <WaitingZoneCard
          label="Chờ điều phối"
          zone="dispatch"
          items={waitingDispatch}
          selectedIndex={selectedWaiting?.zone === 'dispatch' ? selectedWaiting.index : null}
          onSelect={onSelectWaiting}
          onClose={onCloseWaiting}
          onDispatch={onDispatchWaiting}
        />

      </div>
    </aside>
  );
}

function WaitingZoneCard({
  label,
  zone,
  items,
  selectedIndex,
  onSelect,
  onClose,
  onDispatch,
}: {
  label: string;
  zone: WaitingZoneKey;
  items: WaitingCustomer[];
  selectedIndex?: number | null;
  onSelect?: (zone: WaitingZoneKey, index: number) => void;
  onClose?: () => void;
  onDispatch?: (customer: WaitingCustomer) => void;
}) {
  const selectedCustomer = selectedIndex == null ? null : items[selectedIndex] ?? null;

  return (
    <div className="relative min-h-28 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-3 text-center shadow-sm lg:min-h-0 xl:p-4">
      <div className="flex items-center justify-center gap-1 text-sm font-semibold uppercase tracking-wide text-amber-700">
        <span>{label}</span>
        {items.length > 0 && (
          <span className="rounded-full bg-amber-200/80 px-1.5 py-0.5 text-xs leading-none text-amber-800">{items.length}</span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {items.length === 0 ? (
          <span className="text-xs italic text-neutral-400">Không có khách</span>
        ) : (
          items.map((item, index) => (
            <button
              key={index}
              type="button"
              // Mốc để popup neo đúng chấm này và không đè lên nó.
              data-waiting-dot={index}
              title={`${item.stt ? `#${item.stt} · ` : ''}${item.name ?? ''}`}
              onClick={() => onSelect?.(zone, index)}
              className={[
                'flex h-7 min-w-7 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-bold leading-none text-white shadow ring-1 ring-white transition hover:scale-110',
                // This selected STT must remain above its popup if the popup
                // has to flip upward near the bottom of the viewport.
                selectedIndex === index ? 'relative z-[60] scale-110 ring-2 ring-blue-500 ring-offset-1' : '',
              ].join(' ')}
            >
              {item.stt ?? '•'}
            </button>
          ))
        )}
      </div>
      {selectedCustomer && onClose && selectedIndex != null && (
        <WaitingPopover
          zoneLabel={label}
          zone={zone}
          customer={selectedCustomer}
          index={selectedIndex}
          onDispatch={onDispatch ? () => onDispatch(selectedCustomer) : undefined}
          onClose={onClose}
        />
      )}
    </div>
  );
}

function Ratio({
  label,
  num,
  den,
  numClass,
  barClass,
}: {
  label: string;
  num: number;
  den: number;
  numClass: string;
  barClass: string;
}) {
  const pct = den > 0 ? Math.min(100, (num / den) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs leading-tight text-neutral-500">{label}</span>
        <span className="shrink-0 whitespace-nowrap text-sm font-semibold">
          <span className={numClass}>{num}</span>
          <span className="text-neutral-400"> / {den}</span>
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-100">
        <div
          className={`h-full rounded-full ${barClass}`}
          style={{ width: `${pct}%` }}
          title={`${Math.round(pct)}%`}
        />
      </div>
    </div>
  );
}
