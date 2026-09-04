/**
 * ThuMayModal — sheet "chỉ thu máy", tách khỏi luồng Tiếp nhận → Hoàn tất.
 *
 * Vì sao có màn này: khách chọn "Thu máy sau" ở khâu Thu cũ (còn cần máy để
 * thanh toán ở Tư vấn), xong Tư vấn nhưng bàn Tư vấn KHÔNG có chỗ chứa máy —
 * phải mang sang Thu cũ hoặc Backup gửi. Đi đường thường thì phải Điều phối
 * khách sang bàn đó, bấm Tiếp nhận, rồi bấm Hoàn tất: ba bước cho một việc duy
 * nhất là cầm cái máy.
 *
 * Ở đây chỉ còn 1 chạm: ảnh + QR + IMEI đã ghi ở khâu trước được điền sẵn, NV
 * kiểm rồi bấm xác nhận. Sửa được nếu lệch, nhưng KHÔNG bắt buộc nhập gì.
 */
import { useEffect, useState } from 'react';
import QrScanButton from '@/components/QrScanButton';
import SerialScanButton from '@/components/SerialScanButton';
import { workerBaseUrl } from '@/services/adminApi';
import { guestMediaUrl } from '@/services/guestMedia';
import type { PrevImage, StaffCustomer } from '@/services/staffMapper';
import PhotoSlotPicker, { type PhotoSlot } from '@/components/PhotoSlotPicker';

export interface ThuMayValues {
  /** Ảnh đã ghi lần trước mà NV giữ lại cho record mới. */
  anhGiuLai: PrevImage[];
  /** Ảnh vừa chụp/chọn thêm. */
  anhMoi: File[];
  scanQr: string;
  imei: string;
}

const MAX_ANH = 3;

function mediaUrl(image: PrevImage): string {
  const guestUrl = guestMediaUrl(image.fileToken);
  if (guestUrl) return guestUrl;
  const query = image.sourceRecordId
    ? `?table=master&record_id=${encodeURIComponent(image.sourceRecordId)}&field=${encodeURIComponent('Hình nghiệm thu máy cũ')}${image.sourceRevision ? `&rev=${image.sourceRevision}` : ''}`
    : '';
  return `${workerBaseUrl()}/media/${encodeURIComponent(image.fileToken)}${query}`;
}

export default function ThuMayModal({
  candidates,
  deskLabel,
  busy,
  error,
  onSubmit,
  onClose,
}: {
  /** Khách còn máy chưa thu — NV gõ STT để tra trong đây. */
  candidates: StaffCustomer[];
  deskLabel: string;
  busy: boolean;
  error: string | null;
  onSubmit: (customer: StaffCustomer, values: ThuMayValues) => void;
  onClose: () => void;
}) {
  /**
   * Hai bước trong CÙNG một sheet: gõ STT → tra ra khách → xác nhận.
   *
   * Cố ý KHÔNG liệt kê sẵn danh sách khách chờ thu ở đây (yêu cầu user
   * 2026-08-18): NV bàn chỉ cần xử đúng người đang đứng trước mặt, còn bức
   * tranh toàn cảnh là việc của Điều phối — xem `PendingDeviceTable`.
   */
  const [chon, setChon] = useState<StaffCustomer | null>(null);
  const [sttNhap, setSttNhap] = useState('');
  const [loiTra, setLoiTra] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<PrevImage | null>(null);

  const [values, setValues] = useState<ThuMayValues>({
    anhGiuLai: [],
    anhMoi: [],
    scanQr: '',
    imei: '',
  });
  const set = <K extends keyof ThuMayValues>(k: K, v: ThuMayValues[K]) =>
    setValues((p) => ({ ...p, [k]: v }));

  const tra = () => {
    const stt = sttNhap.trim();
    if (!stt) return;
    const found = candidates.find((c) => (c.stt ?? '').trim() === stt);
    if (!found) {
      setLoiTra(`Không có khách STT ${stt} trong danh sách chờ thu máy.`);
      return;
    }
    setLoiTra(null);
    setChon(found);
    // Điền sẵn dữ liệu máy đã ghi ở khâu trước ngay khi tra được khách.
    setValues({
      anhGiuLai: found.prevDevice?.images ?? [],
      anhMoi: [],
      scanQr: found.prevDevice?.scanQr ?? '',
      imei: found.prevDevice?.imei ?? '',
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || busy) return;
      if (previewImage) setPreviewImage(null);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose, previewImage]);

  const conTrong = Math.max(0, MAX_ANH - values.anhGiuLai.length);
  const photoSlots: PhotoSlot[] = [
    ...values.anhGiuLai.map((image) => ({ kind: 'existing' as const, image })),
    ...values.anhMoi.map((file) => ({ kind: 'new' as const, file })),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" role="dialog" aria-modal="true">
      <div className="flex max-h-[92dvh] w-full max-w-[430px] flex-col rounded-t-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-neutral-900">Thu máy cũ</h2>
            <p className="truncate text-xs text-neutral-500">
              {chon
                ? `STT ${chon.stt ?? '—'} · ${chon.name ?? 'chưa rõ tên'} · Bàn ${deskLabel}`
                : `Nhập STT khách cần thu máy · Bàn ${deskLabel}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Đóng"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-2xl leading-none text-neutral-400 active:bg-neutral-100 disabled:opacity-40"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {!chon && (
            <div>
              <span className="text-xs font-semibold text-neutral-500">STT khách</span>
              <div className="mt-1 flex items-center gap-2">
                <input
                  autoFocus
                  value={sttNhap}
                  onChange={(e) => {
                    setSttNhap(e.target.value);
                    setLoiTra(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && tra()}
                  inputMode="numeric"
                  placeholder="VD: 15"
                  // `min-w-0`: input trong flex mặc định không co nhỏ hơn kích
                  // thước nội dung, nên trên iPhone 375px nó đẩy nút "Tra" tràn
                  // ra ngoài mép sheet (đo được lệch 10px).
                  className="min-h-14 w-full min-w-0 flex-1 rounded-xl border border-neutral-300 px-3 text-2xl font-bold"
                />
                <button
                  type="button"
                  onClick={tra}
                  disabled={!sttNhap.trim()}
                  className="min-h-14 rounded-xl bg-neutral-800 px-5 text-base font-bold text-white disabled:opacity-40"
                >
                  Tra
                </button>
              </div>
              {loiTra ? (
                <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                  ✗ {loiTra}
                </p>
              ) : null}
            </div>
          )}

          {chon && (
          <>
          <div>
            <span className="text-xs font-semibold text-neutral-500">
              Ảnh nghiệm thu (tối đa {MAX_ANH} ảnh)
            </span>
            <PhotoSlotPicker
              slots={photoSlots}
              mediaUrl={mediaUrl}
              onPreview={(image) => setPreviewImage(image)}
              onPick={(_, file) => set('anhMoi', [...values.anhMoi, file].slice(0, conTrong))}
              onRemove={(slot) => slot < values.anhGiuLai.length
                ? set('anhGiuLai', values.anhGiuLai.filter((_, index) => index !== slot))
                : set('anhMoi', values.anhMoi.filter((_, index) => index !== slot - values.anhGiuLai.length))}
            />
            <p className="mt-1 text-xs font-semibold text-neutral-500">Đã có {photoSlots.length}/3 ảnh</p>
          </div>

          <div>
            <span className="text-xs font-semibold text-neutral-500">Scan QR máy thu cũ</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                value={values.scanQr}
                onChange={(e) => set('scanQr', e.target.value)}
                className="min-h-11 flex-1 rounded-xl border border-neutral-300 px-3 text-base"
              />
              <QrScanButton onScan={(v) => set('scanQr', v.trim())} />
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-neutral-500">Serial Number</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                value={values.imei}
                onChange={(e) => set('imei', e.target.value)}
                inputMode="text"
                className="min-h-11 flex-1 rounded-xl border border-neutral-300 px-3 text-base"
              />
              <SerialScanButton onScan={(v) => set('imei', v.trim())} />
            </div>
          </div>

          </>
          )}

          {error && <p className="text-sm font-semibold text-red-600">✗ {error}</p>}
        </div>

        <div className="flex gap-2 border-t border-neutral-200 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="min-h-14 flex-1 rounded-2xl border-2 border-neutral-300 text-base font-bold text-neutral-700 disabled:opacity-40"
          >
            Huỷ
          </button>
          {chon && (
            <button
              type="button"
              onClick={() => onSubmit(chon, values)}
              disabled={busy}
              className="min-h-14 flex-[2] rounded-2xl bg-emerald-600 text-base font-bold text-white disabled:opacity-40"
            >
              {busy ? 'Đang gửi…' : 'Xác nhận đã thu máy'}
            </button>
          )}
        </div>
      </div>
      {previewImage && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Xem ảnh nghiệm thu"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative flex max-h-[92dvh] max-w-[96vw] items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={mediaUrl(previewImage)}
              alt={previewImage.name ?? 'Ảnh nghiệm thu'}
              className="max-h-[92dvh] max-w-[96vw] rounded-xl object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              aria-label="Đóng ảnh lớn"
              className="absolute -right-2 -top-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-2xl leading-none text-neutral-700 shadow-lg"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
