/**
 * LayoutDashboard — the interactive floor-plan board.
 *
 * Renders a 16:9 stage mirroring the event photo: fixed venue regions as a
 * backdrop plus the 36 interactive desks (driven by the `desks` array).
 * Waiting customers are rendered in the sidebar, outside the floor map.
 * "End Flow" (đã hoàn tất toàn bộ) is a separate table view, not a board zone.
 */
import { deskUiStatus, type DeskData } from '@/types/desk';
import { createPortal } from 'react-dom';
import Desk from './Desk';
import { isTradeInCustomer } from '@/utils/tradeInFilter';

interface LayoutDashboardProps {
  desks: DeskData[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Bấm 1 chấm STT khách (deskId + vị trí trong receivedCustomers). */
  onSelectCustomer?: (deskId: string, index: number) => void;
  /** Chấm khách đang chọn (viền nổi bật). */
  selectedCustomer?: { deskId: string; index: number } | null;
  alertedDeskIds?: ReadonlySet<string>;
  /** Optional overlay (e.g. the popover) drawn on top of the board. */
  overlay?: React.ReactNode;
  tradeInFilterActive?: boolean;
  tradeInByStt?: ReadonlyMap<string, boolean>;
}

/**
 * Số chấm STT hiển thị tối đa dưới 1 node — phần dư gộp thành "+n".
 * Bằng DESK_CAPACITY (2 khách/NV) nên bình thường không bao giờ bị gộp; giới hạn
 * này giữ cho hàng chấm luôn hẹp hơn khoảng cách giữa 2 bàn cạnh nhau, kể cả khi
 * dữ liệu Lark trả về nhiều khách bất thường trên cùng 1 bàn.
 */
const MAX_DESK_DOTS = 2;

/** Nền cụm bàn, giúp quét nhanh ba luồng vận hành mà không che node. */
function ClusterZone({ label, className }: { label: string; className: string }) {
  return (
    <div className={`pointer-events-none absolute rounded-xl border p-[1.25%] ${className}`}>
      <span className="text-[length:var(--label-fs)] font-bold uppercase leading-none tracking-wide">{label}</span>
    </div>
  );
}

export default function LayoutDashboard({
  desks,
  selectedId,
  onSelect,
  onSelectCustomer,
  selectedCustomer,
  alertedDeskIds,
  overlay,
  tradeInFilterActive = false,
  tradeInByStt,
}: LayoutDashboardProps) {
  return (
    <div className="board relative aspect-video w-full [@media(max-aspect-ratio:8/5)]:aspect-[2360/1640]">
      {/* Board visuals clip to the rounded card; popovers stay outside this
          layer (below) so they're never cut off near the board's edges. */}
      <div className="absolute inset-0 overflow-hidden rounded-xl border border-neutral-300 bg-neutral-50 shadow-inner">
        {/* ── Static venue backdrop ─────────────────────────────────── */}
        {/*
          Bỏ box "Cổng" (2026-08-12) và chia lại chiều dọc cho 3 cụm: trước đây
          Cổng chiếm 88–96% nên 3 cụm bị dồn lên trên, thừa một dải trống ở đáy.
          Nay chừa 5% mép trên/dưới đối xứng, gap giữa 2 tầng cụm 6%, và cụm Tư
          vấn (2 hàng, 8 cột) được phần cao hơn hẳn vì nó cần khoảng thở lớn
          nhất. Toạ độ node trong `layoutConfig.ts` đã chỉnh khớp với các hộp
          này — sửa một bên thì phải sửa bên kia.
        */}
        <ClusterZone
          label="Backup"
          className="left-[4%] top-[5%] h-[38%] w-[43%] border-sky-200 bg-sky-50/70 text-sky-700"
        />
        <ClusterZone
          label="Thu cũ"
          className="left-[53%] top-[5%] h-[38%] w-[43%] border-emerald-200 bg-emerald-50/70 text-emerald-700"
        />
        <ClusterZone
          label="Tư vấn"
          className="left-[4%] top-[49%] h-[46%] w-[92%] border-red-200 bg-red-50/70 text-red-700"
        />

        {/* ── Interactive desks (36) ────────────────────────────────── */}
        {desks.map((d) => (
          <Desk
            key={d.id}
            id={d.id}
            status={deskUiStatus(d)}
            staffName={d.staffName}
            nextWaitingStt={d.nextWaitingStt}
            nextWaitingTradeIn={d.nextWaitingStt ? tradeInByStt?.get(d.nextWaitingStt) : null}
            tradeInFilterActive={tradeInFilterActive}
            x={d.x}
            y={d.y}
            selected={selectedId === d.id}
            alert={alertedDeskIds?.has(d.id)}
            onClick={onSelect}
          />
        ))}

        {/* ── Chấm STT khách đã tiếp nhận (mọi cụm) — bấm để xem khách ──
            Luôn là 1 hàng chấm NGAY DƯỚI node (không còn badge đè lên node), đặt
            cách node đúng `--dot-offset` nên không bao giờ chồng lên nhãn bàn
            hay lên hàng bàn phía dưới. */}
        {desks.map((d) => {
          const list = d.receivedCustomers ?? [];
          if (list.length === 0) return null;
          const shown = list.slice(0, MAX_DESK_DOTS);
          const overflow = list.length - shown.length;

          return (
            <div
              key={`dots-${d.id}`}
              data-customer-dot-row={d.id}
              className="absolute z-20 flex -translate-x-1/2 -translate-y-1/2 items-center gap-[var(--dot-gap)]"
              style={{ left: `${d.x}%`, top: `calc(${d.y}% + var(--dot-offset))` }}
            >
              {shown.map((c, i) => {
                const active = selectedCustomer?.deskId === d.id && selectedCustomer?.index === i;
                return (
                  <button
                    key={i}
                    type="button"
                    title={`${c.stt ? `#${c.stt} · ` : ''}${c.name ?? ''}`}
                    onClick={() => onSelectCustomer?.(d.id, i)}
                    className={[
                      'flex h-[var(--dot)] min-w-[var(--dot)] shrink-0 items-center justify-center',
                      // ĐỎ = khách ĐANG ĐƯỢC TIẾP NHẬN tại bàn, cùng màu với
                      // node occupied. Khác hẳn badge VÀNG ở góc trên node
                      // ("STT tiếp theo" — khách đang CHỜ, xem `Desk.tsx`);
                      // trước đây cả hai đều vàng nên không phân biệt được.
                      'rounded-full px-[2px] text-[length:var(--dot-fs)] font-bold leading-none',
                      tradeInFilterActive ? (isTradeInCustomer(c) ? 'bg-red-600' : 'bg-neutral-400') : 'bg-occupied',
                      'text-white shadow ring-1 ring-white transition hover:scale-125',
                      active ? 'z-30 scale-125 ring-2 ring-blue-500 ring-offset-1' : '',
                    ].join(' ')}
                  >
                    {c.stt ?? '•'}
                  </button>
                );
              })}
              {overflow > 0 && (
                <span
                  title={`Thêm ${overflow} khách — bấm vào bàn để xem đầy đủ`}
                  className="flex h-[var(--dot)] items-center justify-center rounded-full bg-red-800 px-[3px] text-[length:var(--dot-fs)] font-bold leading-none text-white shadow ring-1 ring-white"
                >
                  +{overflow}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Render popovers at the document root. The dashboard column scrolls
          vertically, which also clips horizontal overflow in CSS. A portal
          keeps wide cards visible while their placement still follows the
          measured desk node. */}
      {overlay && typeof document !== 'undefined' ? createPortal(overlay, document.body) : overlay}
    </div>
  );
}
