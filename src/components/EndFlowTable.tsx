/**
 * EndFlowTable — modal liệt kê toàn bộ khách đã hoàn tất toàn bộ quy trình
 * (Check-in "End flow" = "End flow"), dạng bảng thay vì chấm STT trên board.
 * Mở từ nút "End Flow" trên dashboard.
 */
import { useEffect, useState } from 'react';
import { workerBaseUrl } from '@/services/adminApi';
import { guestMediaUrl } from '@/services/guestMedia';
import type { WaitingCustomer } from '@/types/desk';

interface EndFlowTableProps {
  customers: WaitingCustomer[];
  onClose: () => void;
}

/**
 * Cột "Nhân sự" — nguyên văn 3 cột mã bàn Điều phối (DS Tư vấn/DS Thu
 * cũ/DS Backup, 2026-08-06), cùng cú pháp với `WaitingPopover` — khách đã
 * "End flow" không gắn cố định với 1 NV cụ thể nào trong dữ liệu hiện có
 * (có thể đã qua nhiều bàn/khâu), nên hiện đủ cả 3 mã bàn từng điều phối tới
 * thay vì chỉ 1 tên NV.
 */
function dispatchSummary(c: WaitingCustomer): string {
  return `(${c.dsTuVan ?? ''})(${c.dsThuCu ?? ''})(${c.dsBackup ?? ''})`;
}

function DeviceReceiptModal({ customer, onClose }: { customer: WaitingCustomer; onClose: () => void }) {
  const receipt = customer.deviceReceipt;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-neutral-900">Thông tin máy đã nghiệm thu</h3>
            <p className="text-sm text-neutral-500">STT {customer.stt ?? '—'} · {customer.name ?? '—'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="text-2xl leading-none text-neutral-400">×</button>
        </div>
        <div className="mt-4 grid gap-2 rounded-xl bg-neutral-50 p-4 text-sm sm:grid-cols-2">
          <div><span className="text-neutral-500">IMEI</span><p className="font-semibold text-neutral-800">{receipt?.imei || '—'}</p></div>
          <div><span className="text-neutral-500">QR máy cũ</span><p className="font-semibold text-neutral-800">{receipt?.scanQr || '—'}</p></div>
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-500">Ảnh nghiệm thu</p>
        {receipt?.images.length ? (
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {receipt.images.map((image) => {
              const query = image.sourceRecordId
                ? `?table=master&record_id=${encodeURIComponent(image.sourceRecordId)}&field=${encodeURIComponent('Hình nghiệm thu máy cũ')}${image.sourceRevision ? `&rev=${image.sourceRevision}` : ''}`
                : '';
              return <img key={image.fileToken} src={guestMediaUrl(image.fileToken) ?? `${workerBaseUrl()}/media/${encodeURIComponent(image.fileToken)}${query}`} alt={image.name ?? 'Ảnh nghiệm thu'} className="max-h-64 w-full rounded-xl object-contain" />;
            })}
          </div>
        ) : <p className="mt-2 text-sm text-neutral-400">Không có ảnh nghiệm thu.</p>}
      </div>
    </div>
  );
}

export default function EndFlowTable({ customers, onClose }: EndFlowTableProps) {
  const [deviceCustomer, setDeviceCustomer] = useState<WaitingCustomer | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-label="End Flow"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-3xl overflow-auto rounded-xl bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-neutral-800">
            End Flow — Đã hoàn tất toàn bộ ({customers.length})
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-lg leading-none text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            ×
          </button>
        </div>

        {customers.length === 0 ? (
          <p className="py-8 text-center text-sm italic text-neutral-400">
            Chưa có khách nào hoàn tất toàn bộ quy trình.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  <th className="py-2 pr-3">STT</th>
                  <th className="py-2 pr-3">Họ và tên</th>
                  <th className="py-2 pr-3">Tên sản phẩm</th>
                  <th className="py-2 pr-3">Ghi chú thanh toán</th>
                  <th className="py-2 pr-3">Check thu máy cũ</th>
                  <th className="py-2 pr-3">Khâu cuối</th>
                  <th className="py-2 pr-3">Thời gian</th>
                  <th className="py-2">Nhân sự</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c, i) => (
                  <tr key={i} className="border-b border-neutral-100 last:border-0">
                    <td className="py-2 pr-3 font-semibold text-neutral-800">{c.stt ?? '—'}</td>
                    <td className="py-2 pr-3 font-medium text-neutral-800">{c.name ?? '—'}</td>
                    <td className="py-2 pr-3 text-neutral-600">{c.productName ?? '—'}</td>
                    <td className="py-2 pr-3 text-neutral-600">{c.paymentNote ?? '—'}</td>
                    <td className={`py-2 pr-3 ${c.deviceAccepted ? 'font-bold text-red-600' : 'text-neutral-600'}`}>
                      {c.deviceAccepted ? (
                        <button type="button" onClick={() => setDeviceCustomer(c)} className="text-left underline decoration-dotted underline-offset-2">
                          {c.deviceAcceptedText ?? 'Đã nghiệm thu'}
                        </button>
                      ) : (c.deviceAcceptedText ?? '—')}
                    </td>
                    <td className="py-2 pr-3 text-neutral-600">{c.doneInFlow ?? '—'}</td>
                    <td className="py-2 pr-3 text-neutral-600">{c.endFlowTime ?? '—'}</td>
                    <td className="py-2 text-neutral-600">{dispatchSummary(c)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {deviceCustomer && <DeviceReceiptModal customer={deviceCustomer} onClose={() => setDeviceCustomer(null)} />}
    </div>
  );
}
