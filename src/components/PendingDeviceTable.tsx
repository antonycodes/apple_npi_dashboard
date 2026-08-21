/**
 * PendingDeviceTable — bảng khách còn máy cũ CHƯA THU, mở từ nút "Chờ thu máy"
 * cạnh nút End Flow trên dashboard điều phối.
 *
 * Điều phối cần biết còn bao nhiêu máy chưa cầm về để nhắc bàn nào rảnh thì
 * thu; NV tại bàn thì thao tác bằng nút "Thu máy" trên màn hình của họ
 * (`StaffDeskScreen`). Ở đây CHỈ ĐỌC — không có nút thu, vì máy phải giao tận
 * tay NV mới ghi nhận được.
 */
import { useEffect } from 'react';
import type { StaffCustomer } from '@/services/staffMapper';

export default function PendingDeviceTable({
  customers,
  onClose,
}: {
  customers: StaffCustomer[];
  onClose: () => void;
}) {
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
        className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-4 shadow-xl"
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
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-400">
                <tr>
                  <th className="py-2 pr-3">STT</th>
                  <th className="py-2 pr-3">Họ và tên</th>
                  <th className="py-2 pr-3">IMEI</th>
                  <th className="py-2">QR máy cũ</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.stt ?? c.name} className="border-b border-neutral-100 last:border-0">
                    <td className="py-2 pr-3">
                      <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-amber-500 px-2 text-xs font-bold text-white">
                        {c.stt ?? '—'}
                      </span>
                    </td>
                    <td className="py-2 pr-3 font-medium text-neutral-800">{c.name ?? '—'}</td>
                    <td className="py-2 pr-3 font-mono text-xs text-neutral-600">
                      {c.prevDevice?.imei || '—'}
                    </td>
                    <td className="py-2 font-mono text-xs text-neutral-600">
                      {c.prevDevice?.scanQr || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
