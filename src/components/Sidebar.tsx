/**
 * Sidebar — operational summary for the coordinator.
 *
 * Shows the total checked-in customers (from the Lark "Check in" table) and a
 * and the two interactive waiting zones moved outside the floor map.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import WaitingPopover from '@/components/WaitingPopover';
import type { DashboardSummary, WaitingCustomer, WaitingZoneKey } from '@/types/desk';
import { tradeInTone } from '@/utils/tradeInFilter';

/** Số hàng chấm STT tối đa hiện trong thẻ, phần dư gom vào 1 chấm "+N". */
const MAX_CHIP_ROWS = 4;

interface SidebarProps {
  summary: DashboardSummary;
  waitingCheckin: WaitingCustomer[];
  waitingDispatch: WaitingCustomer[];
  selectedWaiting?: { zone: WaitingZoneKey; index: number } | null;
  onSelectWaiting?: (zone: WaitingZoneKey, index: number) => void;
  onCloseWaiting?: () => void;
  /** Bấm "DP" trong popup khách chờ — mở Form Điều phối với STT điền sẵn. */
  onDispatchWaiting?: (customer: WaitingCustomer) => void;
  /** Bộ lọc read-only cho ba màn STT độc lập. Dashboard chính không truyền prop này. */
  tradeInFilter?: {
    active: boolean;
    onToggle: () => void;
  };
}

export default function Sidebar({
  summary,
  waitingCheckin,
  waitingDispatch,
  selectedWaiting,
  onSelectWaiting,
  onCloseWaiting,
  onDispatchWaiting,
  tradeInFilter,
}: SidebarProps) {
  const c = summary.customers;
  return (
    /*
      Rail on the right from `lg` up (tablet landscape / desktop); when it wraps
      under the board (tablet portrait) the three cards become one compact row so
      the summary never pushes the floor map off screen.
    */
    <aside className="w-full shrink-0 lg:self-stretch lg:w-56 xl:w-64">
      {/* Trên `lg` các thẻ co theo NỘI DUNG (`auto` + `content-start`), không
          còn chia đều `1fr`: khu chờ nào chỉ có vài STT thì trước đây vẫn bị
          kéo cao bằng khu kia, để lại một mảng vàng trống hoác. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:h-full lg:grid-cols-1 lg:grid-rows-[auto_auto_auto] lg:content-start lg:gap-4">
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
          {tradeInFilter && (
            <button
              type="button"
              aria-pressed={tradeInFilter.active}
              onClick={tradeInFilter.onToggle}
              className={[
                'mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border px-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
                tradeInFilter.active
                  ? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'border-neutral-300 bg-white text-emerald-800 hover:border-emerald-500 hover:bg-emerald-50',
              ].join(' ')}
            >
              <span
                aria-hidden="true"
                className={[
                  'h-2.5 w-2.5 rounded-full border',
                  tradeInFilter.active ? 'border-white bg-white' : 'border-emerald-600 bg-emerald-500',
                ].join(' ')}
              />
              Lọc Có thu cũ
            </button>
          )}
        </div>

        <WaitingZoneCard
          label="Đã check-in"
          zone="checkin"
          items={waitingCheckin}
          selectedIndex={selectedWaiting?.zone === 'checkin' ? selectedWaiting.index : null}
          onSelect={onSelectWaiting}
          onClose={onCloseWaiting}
          onDispatch={onDispatchWaiting}
          tradeInFilterActive={tradeInFilter?.active ?? false}
        />
        <WaitingZoneCard
          label="Chờ điều phối"
          zone="dispatch"
          items={waitingDispatch}
          selectedIndex={selectedWaiting?.zone === 'dispatch' ? selectedWaiting.index : null}
          onSelect={onSelectWaiting}
          onClose={onCloseWaiting}
          onDispatch={onDispatchWaiting}
          tradeInFilterActive={tradeInFilter?.active ?? false}
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
  tradeInFilterActive,
}: {
  label: string;
  zone: WaitingZoneKey;
  items: WaitingCustomer[];
  selectedIndex?: number | null;
  onSelect?: (zone: WaitingZoneKey, index: number) => void;
  onClose?: () => void;
  onDispatch?: (customer: WaitingCustomer) => void;
  tradeInFilterActive: boolean;
}) {
  const selectedCustomer = selectedIndex == null ? null : items[selectedIndex] ?? null;
  const [showAll, setShowAll] = useState(false);
  const { chipsRef, visibleCount } = useChipRowLimit(items.length);
  const hiddenCount = items.length - visibleCount;

  // Danh sách ngắn lại (khách được điều phối xong) thì popup "xem tất cả" không
  // còn lý do tồn tại — đóng luôn thay vì để 1 lớp phủ mồ côi che sơ đồ.
  useEffect(() => {
    if (hiddenCount <= 0) setShowAll(false);
  }, [hiddenCount]);

  const openCustomer = (index: number) => {
    setShowAll(false);
    onSelect?.(zone, index);
  };

  // Chấm đang hiện trong thẻ. Nếu khách được chọn nằm trong phần bị ẩn sau
  // "+N" (chọn từ popup), THAY chấm cuối bằng chính khách đó: `WaitingPopover`
  // neo vào `[data-waiting-dot="<index>"]` trong thẻ này, không tìm thấy là nó
  // render `visibility: hidden` — bấm xong không thấy gì. Thay chứ không chèn
  // thêm, để số chấm không đổi và không tràn sang hàng thứ 5.
  const shown = items.slice(0, visibleCount).map((item, index) => ({ item, index }));
  if (selectedIndex != null && selectedIndex >= visibleCount && shown.length > 0) {
    shown[shown.length - 1] = { item: items[selectedIndex], index: selectedIndex };
  }

  return (
    <div className="relative min-h-28 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-3 text-center shadow-sm lg:min-h-0 xl:p-4">
      <div className="flex items-center justify-center gap-1 text-sm font-semibold uppercase tracking-wide text-amber-700">
        <span>{label}</span>
        {items.length > 0 && (
          <span className="rounded-full bg-amber-200/80 px-1.5 py-0.5 text-xs leading-none text-amber-800">{items.length}</span>
        )}
      </div>
      <div ref={chipsRef} className="mt-3 flex flex-wrap justify-center gap-2">
        {items.length === 0 ? (
          <span className="text-xs italic text-neutral-400">Không có khách</span>
        ) : (
          <>
            {shown.map(({ item, index }) => (
              <WaitingChip
                key={index}
                item={item}
                index={index}
                selected={selectedIndex === index}
                tradeInFilterActive={tradeInFilterActive}
                onClick={() => onSelect?.(zone, index)}
              />
            ))}
          </>
        )}
      </div>
      {/* "+N" nằm RIÊNG một dòng dưới, không chen vào lưới chấm: chen vào thì
          hàng thứ 4 lệch nhịp so với 3 hàng trên. Thấp và nhạt hơn chấm STT để
          đọc ra là nút "xem thêm", đồng thời chỉ tốn thêm chút chiều cao. */}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          title={`Xem tất cả ${items.length} STT`}
          className="mx-auto mt-2 flex h-8 items-center justify-center rounded-full border border-amber-300 bg-amber-200/90 px-5 text-sm font-bold leading-none text-amber-900 shadow-sm transition hover:bg-amber-300"
        >
          +{hiddenCount}
        </button>
      )}

      {showAll && (
        <AllSttModal
          label={label}
          items={items}
          tradeInFilterActive={tradeInFilterActive}
          selectedIndex={selectedIndex ?? null}
          onPick={openCustomer}
          onClose={() => setShowAll(false)}
        />
      )}
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

function WaitingChip({
  item,
  index,
  selected,
  onClick,
  anchorable = true,
  tradeInFilterActive = false,
}: {
  item: WaitingCustomer;
  index: number;
  selected: boolean;
  onClick: () => void;
  /**
   * Gắn mốc neo `data-waiting-dot` hay không. Chấm trong popup "xem tất cả"
   * phải TẮT: popup nằm trong cùng thẻ, để cả hai nơi cùng mốc thì
   * `WaitingPopover` có thể neo nhầm vào chấm trong popup.
   */
  anchorable?: boolean;
  tradeInFilterActive?: boolean;
}) {
  return (
    <button
      type="button"
      // Mốc để popup neo đúng chấm này và không đè lên nó.
      data-waiting-dot={anchorable ? index : undefined}
      title={`${item.stt ? `#${item.stt} · ` : ''}${item.name ?? ''}`}
      onClick={onClick}
      className={[
        'flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-xs font-bold leading-none text-white shadow ring-1 ring-white transition hover:scale-110',
        tradeInFilterActive ? tradeInTone(true, item) : 'bg-amber-500',
        // This selected STT must remain above its popup if the popup
        // has to flip upward near the bottom of the viewport.
        selected ? 'relative z-[60] scale-110 ring-2 ring-blue-500 ring-offset-1' : '',
      ].join(' ')}
    >
      {item.stt ?? '•'}
    </button>
  );
}

/**
 * Số chấm STT vừa trong `MAX_CHIP_ROWS` hàng đầu tiên.
 *
 * ĐO DOM THẬT thay vì tính "mỗi hàng N chấm": bề rộng thẻ đổi theo breakpoint
 * (rail `lg:w-56`/`xl:w-64`, hay xếp ngang 3 cột khi màn hẹp) và chấm cũng rộng
 * hẹp khác nhau theo số chữ số của STT — mọi con số cố định đều sai ở đâu đó.
 *
 * Cách đo: render ĐỦ chấm, gom theo `offsetTop` để biết ranh giới hàng, rồi
 * đếm số chấm nằm trong 4 hàng đầu. KHÔNG trừ chỗ cho nút "+N" vì nút đó nằm
 * riêng một dòng bên dưới, không chen vào lưới chấm.
 */
function useChipRowLimit(total: number) {
  const chipsRef = useRef<HTMLDivElement | null>(null);
  const [visibleCount, setVisibleCount] = useState(total);

  // Danh sách đổi (khách mới check-in / vừa được điều phối) → quay về hiện ĐỦ
  // chấm để đo lại; nếu không sẽ kẹt mãi ở con số của lần đo trước.
  useLayoutEffect(() => {
    setVisibleCount(total);
  }, [total]);

  // CHỈ đo khi đang render đủ chấm, và chỉ RÚT BỚT — không bao giờ nới ra ở đây.
  // Đo trên bản đã rút gọn rồi nới lại sẽ thành vòng lặp vô tận: rút xuống 4
  // hàng → thấy "còn chỗ" → bung full → lại quá 4 hàng → rút → …
  useLayoutEffect(() => {
    if (visibleCount !== total) return;
    const el = chipsRef.current;
    if (!el) return;
    // Chỉ đo chấm STT: chấm "+N" và chữ "Không có khách" không phải phần tử đếm.
    const chips = [...el.querySelectorAll<HTMLElement>('[data-waiting-dot]')];
    if (chips.length === 0) return;

    const tops = [...new Set(chips.map((c) => c.offsetTop))].sort((a, b) => a - b);
    if (tops.length <= MAX_CHIP_ROWS) return;

    const lastAllowedTop = tops[MAX_CHIP_ROWS - 1];
    setVisibleCount(chips.filter((c) => c.offsetTop <= lastAllowedTop).length);
  }, [visibleCount, total]);

  // Đổi bề rộng (xoay máy, đổi breakpoint) → bung full 1 nhịp để hiệu ứng trên
  // đo lại. CHỈ nghe bề rộng: chiều cao đổi mỗi lần ta tự rút gọn, nghe cả hai
  // là tự kích hoạt lại chính mình.
  const lastWidth = useRef<number | null>(null);
  useEffect(() => {
    const el = chipsRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      const prev = lastWidth.current;
      lastWidth.current = width;
      // Lần bắn ĐẦU TIÊN (ngay khi `observe`) chỉ để ghi mốc bề rộng: hiệu ứng
      // đo ở trên vừa chạy xong rồi, bắt đo lại chỉ tốn thêm một vòng render
      // mà kết quả y hệt.
      if (prev === null || Math.abs(width - prev) < 1) return;
      setVisibleCount(total);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [total]);

  return { chipsRef, visibleCount: Math.min(visibleCount, total) };
}

/** Popup xem toàn bộ STT của 1 khu chờ — bấm 1 STT thì mở popover khách đó. */
function AllSttModal({
  label,
  items,
  selectedIndex,
  onPick,
  onClose,
  tradeInFilterActive,
}: {
  label: string;
  items: WaitingCustomer[];
  selectedIndex: number | null;
  onPick: (index: number) => void;
  onClose: () => void;
  tradeInFilterActive: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-label={`Tất cả STT — ${label}`}
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-xl bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-amber-700">
            {label} · {items.length} khách
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded px-2 py-1 text-lg leading-none text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            ×
          </button>
        </div>
        {/* Cuộn trong popup: 200+ khách vẫn không đẩy nút Đóng ra khỏi màn hình. */}
        <div className="mt-3 flex flex-wrap justify-center gap-2 overflow-y-auto">
          {items.map((item, index) => (
            <WaitingChip
              key={index}
              item={item}
              index={index}
              selected={selectedIndex === index}
              onClick={() => onPick(index)}
              anchorable={false}
              tradeInFilterActive={tradeInFilterActive}
            />
          ))}
        </div>
      </div>
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
