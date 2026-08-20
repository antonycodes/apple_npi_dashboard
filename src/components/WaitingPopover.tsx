/**
 * WaitingPopover — thông tin 1 khách đang ở khu vực chờ ngoài bàn (chưa gán
 * vào bàn cụ thể): "Chờ check-in" hoặc "Chờ điều phối".
 *
 * Cùng phong cách với `CustomerPopover` — neo ngay dưới chấm STT vừa bấm,
 * thay vì xuống đáy cả vùng chờ. Card canh mép phải theo đúng chấm STT, tự lật
 * lên/sang bên và kẹp trong viewport, và luôn nằm NGOÀI chấm vừa bấm (không
 * bao giờ che chính nó).
 */
import { useEffect, useRef } from 'react';
import type { ClusterKey, WaitingCustomer, WaitingZoneKey } from '@/types/desk';
import { unionRect, useAnchoredPlacement } from './popoverPlacement';

interface WaitingPopoverProps {
  zoneLabel: string;
  zone: WaitingZoneKey;
  customer: WaitingCustomer;
  /** Vị trí chấm STT vừa bấm trong danh sách — dùng để đo lại node khi layout đổi. */
  index: number;
  /** Bấm "DP" — mở Form Điều phối với STT của khách này điền sẵn. */
  onDispatch?: () => void;
  onClose: () => void;
}

/** Fallback nếu Check-in chưa có "Done in Flow" — suy từ cụm vừa hoàn tất. */
const STAGE_NAME: Record<ClusterKey, string> = {
  tradein: 'Thu cũ',
  consult: 'Tư vấn',
  backup: 'Backup',
};

/** "Done in Flow" cũng dùng giá trị này cho khách chưa xong khâu nào — không tính là tên khâu. */
const NOT_A_STAGE = 'check in';

function statusTextFor(zone: WaitingZoneKey, customer: WaitingCustomer): string {
  if (zone === 'checkin') return 'Đã check-in — chờ điều phối vào bàn';
  const doneInFlow = customer.doneInFlow?.trim().toLowerCase() === NOT_A_STAGE ? null : customer.doneInFlow;
  const stage = doneInFlow || (customer.fromCluster ? STAGE_NAME[customer.fromCluster] : null);
  return stage ? `Đã hoàn tất "Khâu ${stage}"` : 'Đã hoàn tất 1 khâu — chờ điều phối';
}

/**
 * "Thu cũ check" / "Backup check" đều là single-select — số lựa chọn tuỳ event
 * (vd "Không thu cũ" / "Có thu cũ" / "Thu cũ sau", có thể đổi trong Lark) nên
 * tô màu theo TỪ KHOÁ trong nhãn thay vì so khớp cứng 1 chuỗi cố định.
 */
function oldDeviceCheckTone(value: string | null | undefined): 'red' | 'amber' | undefined {
  const s = value?.toLowerCase() ?? '';
  if (!s || s.includes('không')) return undefined;
  if (s.includes('sau')) return 'amber';
  if (s.includes('có')) return 'red';
  return undefined;
}

/**
 * Dòng "Nhân sự" — nguyên văn 3 cột mã bàn trong `Master Điều phối` (DS Tư
 * vấn/DS Thu cũ/DS Backup), theo đúng cú pháp user yêu cầu (2026-08-06):
 * "(DS Tư vấn)(DS Thu cũ)(DS Backup)" — rỗng thì để trống giữa 2 ngoặc, KHÔNG
 * gộp/lược bớt, để điều phối viên thấy ngay cột nào đang có/không có giá trị.
 * CHỈ hiện ở đây (khách CHƯA tiếp nhận — xem thông tin Điều phối GÁN cho ai)
 * — khác `CustomerPopover` (khách ĐÃ tiếp nhận), ở đó dòng "Nhân viên"
 * (`desk.staffName`) đã đủ trả lời "ai đang phục vụ", không cần dòng này nữa
 * (2026-08-06, tiếp, theo yêu cầu rõ của user).
 */
function dispatchSummary(customer: WaitingCustomer): string {
  return `(${customer.dsTuVan ?? ''})(${customer.dsThuCu ?? ''})(${customer.dsBackup ?? ''})`;
}

export default function WaitingPopover({ zoneLabel, zone, customer, index, onDispatch, onClose }: WaitingPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const placement = useAnchoredPlacement(
    popoverRef,
    (waitingCard) => unionRect([waitingCard.querySelector(`[data-waiting-dot="${index}"]`)]),
    'right',
    [index, customer],
  );

  return (
    <div
      ref={popoverRef}
      className="absolute z-50"
      style={placement ? { left: placement.left, top: placement.top } : { left: 0, top: 0, visibility: 'hidden' }}
      role="dialog"
      aria-label={`Khách STT ${customer.stt ?? ''}`}
    >
      <div
        onClick={onClose}
        style={{ maxHeight: placement?.maxHeight }}
        className="max-h-[calc(100dvh-2rem)] w-[min(30rem,calc(100vw-2rem))] cursor-pointer overflow-y-auto rounded-xl border border-amber-300 bg-white p-4 shadow-xl"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-bold text-white">
              {customer.stt ?? '•'}
            </span>
            <div className="min-w-0 truncate text-sm font-bold text-neutral-800">{customer.name ?? 'Khách'}</div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {onDispatch && (
              <button
                type="button"
                // Card cha có onClick=onClose; chặn bubble để chỉ chạy đúng
                // hành động này, việc đóng popup do handler bên ngoài lo.
                onClick={(e) => {
                  e.stopPropagation();
                  onDispatch();
                }}
                title={`Điều phối khách STT ${customer.stt ?? ''}`}
                className="rounded-lg bg-brand px-2.5 py-1 text-xs font-bold text-white shadow-sm hover:opacity-90"
              >
                DP
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="flex h-7 w-7 items-center justify-center rounded text-lg leading-none text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
            >
              ×
            </button>
          </div>
        </div>

        <dl className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-x-4 gap-y-2 border-t border-neutral-100 pt-3 text-left text-sm">
          <Row label="Khu vực" value={zoneLabel} />
          <Row label="Trạng thái" value={statusTextFor(zone, customer)} />
          <Row label="Tên sản phẩm" value={customer.productName ?? null} />
          <Row label="Ghi chú thanh toán" value={customer.paymentNote ?? null} />
          <LinkRow label="Hyperlink Master" value={customer.hyperlink} />
          <Row
            label="Check thu máy cũ"
            value={customer.deviceAcceptedText}
            tone={customer.deviceAccepted ? 'red' : undefined}
          />
          <Row
            label="Thu cũ check"
            value={customer.oldDeviceCheck ?? null}
            tone={oldDeviceCheckTone(customer.oldDeviceCheck)}
          />
          <Row
            label="Backup check"
            value={customer.backupCheck ?? null}
            tone={oldDeviceCheckTone(customer.backupCheck)}
          />
          <Row label="Nhân sự" value={dispatchSummary(customer)} />
        </dl>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | null | undefined;
  tone?: 'red' | 'amber';
}) {
  const cls =
    tone === 'red' ? 'font-bold text-red-600' : tone === 'amber' ? 'font-semibold text-amber-600' : 'font-medium text-neutral-800';
  return (
    <>
      <dt className="text-right leading-5 text-neutral-500">{label}</dt>
      <dd className={`min-w-0 break-words text-left leading-5 ${cls}`}>{value && value.trim() ? value : '—'}</dd>
    </>
  );
}

function LinkRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <>
      <dt className="text-right leading-5 text-neutral-500">{label}</dt>
      <dd className="min-w-0 truncate text-left font-medium leading-5 text-blue-600">
        {value ? <a href={value} target="_blank" rel="noreferrer" className="underline">Mở liên kết</a> : '—'}
      </dd>
    </>
  );
}
