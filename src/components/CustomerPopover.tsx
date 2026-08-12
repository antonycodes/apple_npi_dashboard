/**
 * CustomerPopover — thông tin 1 khách khi bấm vào chấm STT.
 *
 * Neo theo đúng chấm STT đã bấm: card canh mép phải theo chấm, tự kẹp trong
 * viewport và luôn nằm NGOÀI cả cụm node (ô bàn + badge + hàng chấm STT) nên
 * không bao giờ che chính bàn/chấm vừa bấm — kể cả khi phải lật lên trên.
 * Đóng bằng cách bấm vào card, nút ×, hoặc Escape.
 *
 * Dòng "Nhân sự" (2026-08-06, chốt lại sau vài lượt sửa qua lại): LUÔN hiện
 * nguyên văn mã Điều phối "(DS Tư vấn)(DS Thu cũ)(DS Backup)" — CÙNG định
 * dạng với `WaitingPopover`/`EndFlowTable`, không đổi sang tên NV dù khách đã
 * tiếp nhận (tên NV đã có sẵn ở dòng "Nhân viên" ngay phía trên).
 */
import { useEffect, useRef } from 'react';
import { CLUSTER_LABELS } from '@/config/layoutConfig';
import type { DeskCustomer, DeskData } from '@/types/desk';
import { deskAnchorRect, useAnchoredPlacement } from './popoverPlacement';

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

/** Dòng "Nhân sự" — nguyên văn 3 cột mã bàn Điều phối, cùng cú pháp với `WaitingPopover`/`EndFlowTable`. */
function dispatchSummary(customer: DeskCustomer): string {
  return `(${customer.dsTuVan ?? ''})(${customer.dsThuCu ?? ''})(${customer.dsBackup ?? ''})`;
}

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
            className="flex h-7 w-7 items-center justify-center rounded text-lg leading-none text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            ×
          </button>
        </div>

        <dl className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-x-4 gap-y-2 border-t border-neutral-100 pt-3 text-left text-sm">
          <Row label="Vị trí" value={`${CLUSTER_LABELS[cluster]} · ${label}`} />
          <Row label="Nhân viên" value={staffName ?? null} />
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
