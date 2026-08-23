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
import { workerBaseUrl } from '@/services/adminApi';
import type { PrevImage, StaffCustomer } from '@/services/staffMapper';

export interface ThuMayValues {
  /** Ảnh đã ghi lần trước mà NV giữ lại cho record mới. */
  anhGiuLai: PrevImage[];
  /** Ảnh vừa chụp/chọn thêm. */
  anhMoi: File[];
  scanQr: string;
  imei: string;
}

const MAX_ANH = 3;

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
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const conTrong = Math.max(0, MAX_ANH - values.anhGiuLai.length);

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
            {values.anhGiuLai.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-2">
                {values.anhGiuLai.map((img) => (
                  <div key={img.fileToken} className="relative">
                    {/* Token KHÔNG phải URL — phải đi qua `/media/<token>` của
                        worker, vì link Lark trả về đòi Bearer nên thẻ <img>
                        không tự tải được. */}
                    {img.fileToken.startsWith('guest-file-') ? (
                      <div
                        className="flex h-20 w-20 flex-col items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-1 text-center text-[10px] font-semibold text-emerald-700"
                        title={img.name ?? 'Ảnh mô phỏng'}
                      >
                        <span className="text-lg">▣</span>
                        <span className="line-clamp-2">Ảnh mô phỏng</span>
                      </div>
                    ) : (
                      <img
                        src={`${workerBaseUrl()}/media/${encodeURIComponent(img.fileToken)}`}
                        alt={img.name ?? 'Ảnh nghiệm thu'}
                        className="h-20 w-20 rounded-xl border border-neutral-300 object-cover"
                      />
                    )}
                    <button
                      type="button"
                      aria-label="Bỏ ảnh này"
                      onClick={() =>
                        set('anhGiuLai', values.anhGiuLai.filter((x) => x.fileToken !== img.fileToken))
                      }
                      className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-neutral-800 text-sm leading-none text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            {/* KHÔNG đặt `capture` cùng `multiple`: trên iOS `capture` ép mở
                thẳng camera và chỉ nhận đúng 1 ảnh. */}
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={conTrong === 0}
              onChange={(e) => {
                set('anhMoi', Array.from(e.target.files ?? []).slice(0, conTrong));
                e.currentTarget.value = '';
              }}
              className="mt-1 block w-full text-sm text-neutral-600 file:mr-3 file:min-h-11 file:rounded-xl file:border-0 file:bg-neutral-700 file:px-4 file:text-sm file:font-bold file:text-white"
            />
            {values.anhMoi.length > 0 && (
              <p className="mt-1 text-xs font-semibold text-emerald-700">
                Đã chọn thêm {values.anhMoi.length} ảnh
              </p>
            )}
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
            <span className="text-xs font-semibold text-neutral-500">IMEI máy</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                value={values.imei}
                onChange={(e) => set('imei', e.target.value)}
                inputMode="numeric"
                className="min-h-11 flex-1 rounded-xl border border-neutral-300 px-3 text-base"
              />
              <QrScanButton
                onScan={(v) => set('imei', v.trim())}
                formats={['code_128', 'code_39', 'ean_13', 'itf']}
                label="Quét barcode IMEI"
              />
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
    </div>
  );
}
