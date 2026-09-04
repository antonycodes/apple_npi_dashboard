/**
 * PendingDeviceTable — bảng khách còn máy cũ CHƯA THU, mở từ nút "Chờ thu máy"
 * cạnh nút End Flow trên dashboard điều phối.
 *
 * Điều phối cần biết còn bao nhiêu máy chưa cầm về để nhắc bàn nào rảnh thì
 * thu; NV tại bàn thì thao tác bằng nút "Thu máy" trên màn hình của họ
 * (`StaffDeskScreen`). Ở đây CHỈ ĐỌC — không có nút thu, vì máy phải giao tận
 * tay NV mới ghi nhận được.
 */
import { useEffect, useState } from 'react';
import { workerBaseUrl } from '@/services/adminApi';
import { guestMediaUrl } from '@/services/guestMedia';
import type { StaffCustomer } from '@/services/staffMapper';

function mediaUrl(fileToken: string, recordId?: string, revision?: number): string {
  const guestUrl = guestMediaUrl(fileToken);
  if (guestUrl) return guestUrl;
  const query = recordId ? `?table=master&record_id=${encodeURIComponent(recordId)}&field=${encodeURIComponent('Hình nghiệm thu máy cũ')}${revision ? `&rev=${revision}` : ''}` : '';
  return `${workerBaseUrl()}/media/${encodeURIComponent(fileToken)}${query}`;
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="8.5" cy="9" r="1.25" />
      <path d="m5.5 17 4.2-4.2a1.2 1.2 0 0 1 1.7 0l2.1 2.1 1.4-1.4a1.2 1.2 0 0 1 1.7 0l1.9 1.9" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function DeviceImagesModal({
  customer,
  onClose,
}: {
  customer: StaffCustomer;
  onClose: () => void;
}) {
  const images = customer.prevDevice?.images ?? [];
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') setSelected((value) => Math.max(0, value - 1));
      if (event.key === 'ArrowRight') setSelected((value) => Math.min(images.length - 1, value + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [images.length, onClose]);

  if (images.length === 0) return null;
  const current = images[selected] ?? images[0];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-950/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Ảnh máy cũ STT ${customer.stt ?? ''}`}
      onClick={onClose}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col gap-3 rounded-2xl bg-white p-3 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-neutral-900">Ảnh máy cũ · STT {customer.stt ?? '—'}</h3>
            <p className="truncate text-xs text-neutral-500">{customer.name ?? 'Chưa có tên khách'} · {selected + 1}/{images.length}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng ảnh" className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700">
            <CloseIcon />
          </button>
        </div>
        <div className="flex min-h-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-100">
          <img
            src={mediaUrl(current.fileToken, current.sourceRecordId ?? customer.prevDevice?.sourceRecordId, current.sourceRevision ?? customer.prevDevice?.sourceRevision)}
            alt={current.name ?? `Ảnh máy cũ ${selected + 1}`}
            className="max-h-[68vh] max-w-full object-contain"
          />
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto px-1 pb-1">
            {images.map((image, index) => (
              <button
                key={image.fileToken}
                type="button"
                onClick={() => setSelected(index)}
                aria-label={`Xem ảnh ${index + 1}`}
                className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 ${index === selected ? 'border-brand' : 'border-transparent'}`}
              >
                <img src={mediaUrl(image.fileToken, image.sourceRecordId ?? customer.prevDevice?.sourceRecordId, image.sourceRevision ?? customer.prevDevice?.sourceRevision)} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PendingDeviceTable({
  customers,
  onClose,
}: {
  customers: StaffCustomer[];
  onClose: () => void;
}) {
  const [imageCustomer, setImageCustomer] = useState<StaffCustomer | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-label="Chờ thu máy"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-5xl overflow-auto rounded-xl bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-neutral-800">
            Chờ thu máy — máy cũ chưa cầm về ({customers.length})
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
        {customers.length === 0 ? (
          <p className="py-6 text-center text-sm italic text-neutral-400">
            Không còn máy nào chờ thu.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] table-fixed text-left text-sm">
              <thead className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-400">
                <tr>
                  <th className="w-1/5 whitespace-nowrap py-2 pr-3">STT</th>
                  <th className="w-1/5 whitespace-nowrap py-2 pr-3">Họ và tên</th>
                  <th className="w-1/5 whitespace-nowrap py-2 pr-3">Serial Number</th>
                  <th className="w-1/5 whitespace-nowrap py-2 pr-3">QR máy cũ</th>
                  <th className="w-1/5 whitespace-nowrap py-2 text-center">Ảnh nghiệm thu</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.stt ?? c.name} className="border-b border-neutral-100 last:border-0">
                    <td className="whitespace-nowrap py-2 pr-3">
                      <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-amber-500 px-2 text-xs font-bold text-white">
                        {c.stt ?? '—'}
                      </span>
                    </td>
                    <td className="max-w-0 truncate whitespace-nowrap py-2 pr-3 font-medium text-neutral-800" title={c.name ?? undefined}>{c.name ?? '—'}</td>
                    <td className="max-w-0 truncate whitespace-nowrap py-2 pr-3 font-mono text-xs text-neutral-600" title={c.prevDevice?.imei ?? undefined}>{c.prevDevice?.imei || '—'}</td>
                    <td className="max-w-0 truncate whitespace-nowrap py-2 pr-3 font-mono text-xs text-neutral-600" title={c.prevDevice?.scanQr ?? undefined}>
                      {c.prevDevice?.scanQr || '—'}
                    </td>
                    <td className="whitespace-nowrap py-2 text-center">
                      <button
                        type="button"
                        onClick={() => setImageCustomer(c)}
                        disabled={!c.prevDevice?.images.length}
                        aria-label={c.prevDevice?.images.length ? `Xem ảnh máy của STT ${c.stt ?? ''}` : 'Chưa có ảnh máy'}
                        title={c.prevDevice?.images.length ? `Xem ${c.prevDevice.images.length} ảnh máy` : 'Chưa có ảnh máy'}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500 shadow-sm transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:border-neutral-100 disabled:bg-neutral-50 disabled:text-neutral-300"
                      >
                        <ImageIcon />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {imageCustomer && <DeviceImagesModal customer={imageCustomer} onClose={() => setImageCustomer(null)} />}
    </div>
  );
}
