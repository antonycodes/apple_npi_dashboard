/**
 * CustomerPopover — thông tin 1 khách khi bấm vào chấm STT.
 *
 * Neo theo đúng chấm STT đã bấm: card canh mép phải theo chấm, tự kẹp trong
 * viewport và luôn nằm NGOÀI cả cụm node (ô bàn + badge + hàng chấm STT) nên
 * không bao giờ che chính bàn/chấm vừa bấm — kể cả khi phải lật lên trên.
 * Đóng bằng cách bấm vào card, nút ×, hoặc Escape.
 *
 * Dòng "Nhân sự" luôn giữ định dạng "(TV)(TC)(BK)". Mã ban đầu lấy từ
 * `Master Điều phối`; mã đã tiếp nhận lấy từ `Master` và được tô đỏ.
 */
import { useEffect, useRef } from 'react';
import { CLUSTER_LABELS } from '@/config/layoutConfig';
import type { DeskCustomer, DeskData } from '@/types/desk';
import DispatchSummary from '@/components/DispatchSummary';
import { deskAnchorRect, useAnchoredPlacement } from './popoverPlacement';
import ProductList from './ProductList';

interface CustomerPopoverProps {
  desk: DeskData;
  customer: DeskCustomer;
  onClose: () => void;
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

/** Dòng "Nhân sự" giữ nguyên ba ô mã bàn, tô đỏ mã đã được `Master` tiếp nhận. */
export default function CustomerPopover({ desk, customer, onClose }: CustomerPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Neo theo cả cụm node (bàn + badge + hàng chấm) chứ không riêng chấm STT:
  // nếu chỉ né hàng chấm thì khi lật lên trên card sẽ nằm đè lên ô bàn.
  const placement = useAnchoredPlacement(
    popoverRef,
    (board) => deskAnchorRect(board, desk.id),
    'right',
    [desk.id, customer],
  );

  const { label, cluster, staffName } = desk;

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
            <div className="min-w-0 truncate text-sm font-bold text-neutral-800">
              {customer.name ?? 'Khách'}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-7 w-7 items-center justify-center rounded text-lg leading-none text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            ×
          </button>
        </div>

        <dl className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-x-4 gap-y-2 border-t border-neutral-100 pt-3 text-left text-sm">
          <Row label="Vị trí" value={`${CLUSTER_LABELS[cluster]} · ${label}`} />
          <Row label="Nhân viên" value={staffName ?? null} />
          <ProductRow value={customer.productName ?? null} />
          <Row label="Ghi chú thanh toán" value={customer.paymentNote ?? null} />
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
            value={customer.backupStatus ?? customer.backupCheck ?? null}
            tone={oldDeviceCheckTone(customer.backupStatus ?? customer.backupCheck)}
          />
          <dt className="text-right leading-5 text-neutral-500">Nhân sự</dt>
          <dd className="min-w-0 break-words text-left font-medium leading-5 text-neutral-900">
            <DispatchSummary customer={customer} />
          </dd>
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

function ProductRow({ value }: { value: string | null | undefined }) {
  return <><dt className="text-right leading-5 text-neutral-500">Tên sản phẩm</dt><dd className="min-w-0 break-words text-left font-medium leading-5 text-neutral-800"><ProductList value={value} /></dd></>;
}
