/**
 * KhoHandoverForm — màn luân chuyển máy của Kho: giao máy cho TV hoặc nhận máy
 * TV trả lại khi không bán được.
 *
 * Hai khối theo đúng thứ tự tay làm — bàn TV liên quan → ảnh — rồi mới tới nút xác
 * nhận. KHÔNG có ô STT khách (bỏ 2026-08-19 theo yêu cầu user): kho bàn giao
 * theo NGƯỜI NHẬN chứ không theo từng khách, nên dòng ghi ra không gắn STT.
 *
 * **QR bàn TV chứa MÃ BÀN** (`TV1`, `TV2`…), nên app chuẩn hoá qua
 * `normalizeDeskCode` rồi tra roster `Master_DS` ra tên + MSNV để kho NHÌN
 * XÁC NHẬN đúng người trước khi bấm. Quét trúng mã không có
 * trong roster thì báo đỏ và chặn submit — thà bắt quét lại còn hơn ghi vào
 * Base một mã bàn không tồn tại.
 *
 * QR bàn và ảnh đi vào đúng các cột Master đang có (`Scan QR máy cũ`, `Hình
 * nghiệm thu máy cũ`).
 * Đường gửi nằm ở `KhoAppPage.submit` (dùng lại `sendStaffAction`).
 */
import { useMemo, useState } from 'react';
import QrScanButton from '@/components/QrScanButton';
import { normalizeDeskCode } from '@/services/larkMapper';
import type { KhoStaffInfo } from '@/services/khoMapper';
import PhotoSlotPicker from '@/components/PhotoSlotPicker';
import type { WarehouseMachineDirection } from '@/types/warehouse';

export interface KhoHandoverValues {
  direction: WarehouseMachineDirection;
  /** Mã bàn TV liên quan, đã chuẩn hoá (vd "TV4"). */
  deskCode: string;
  /** Nội dung QR bàn ĐÚNG NHƯ ĐÃ QUÉT — ghi vào cột `Scan QR máy cũ`. */
  scanQr: string;
  anh: File[];
}

const MAX_ANH = 3;

/** Nhãn nhỏ dùng lại cho cả 3 khối. */
function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-semibold text-neutral-500">{children}</span>;
}

export default function KhoHandoverForm({
  direction,
  staffByDesk,
  loading,
  busy,
  error,
  okMessage,
  onSubmit,
}: {
  direction: WarehouseMachineDirection;
  staffByDesk: Map<string, KhoStaffInfo>;
  /** Đang tải roster lần đầu — chưa tra được thì KHÔNG được báo "không có bàn". */
  loading: boolean;
  busy: boolean;
  error: string | null;
  /** Thông báo "đã gửi" sau lần bàn giao gần nhất. */
  okMessage: string | null;
  onSubmit: (values: KhoHandoverValues) => void;
}) {
  const isReturn = direction === 'from_tv';
  const [scanQr, setScanQr] = useState('');
  const [anh, setAnh] = useState<File[]>([]);
  const [anhError, setAnhError] = useState<string | null>(null);

  const deskCode = useMemo(() => normalizeDeskCode(scanQr.trim()) ?? '', [scanQr]);
  const staff = deskCode ? staffByDesk.get(deskCode) ?? null : null;
  const chuaCoRoster = staffByDesk.size === 0;

  /**
   * Chỉ báo "không có bàn này" khi roster ĐÃ TẢI XONG và thật sự không có.
   *
   * Trước đây bảng tra rỗng lúc mới mở màn (đang tải, hoặc lỗi đồng bộ) cũng
   * ra đúng câu đó — gõ TV1 ngay khi mở app là bị báo sai, tưởng hỏng mã bàn
   * trong khi chỉ là chưa có dữ liệu.
   */
  const qrLoi =
    !scanQr.trim() || loading || chuaCoRoster
      ? null
      : staff
        ? null
        : /^TV\d+$/.test(deskCode)
          ? `Không có ${deskCode} trong cột "STT bàn" của Master_DS.`
          : 'Mã bàn phải là bàn Tư vấn (TV1, TV2…).';

  // Roster chưa về thì vẫn cho gửi nếu mã có dạng mã bàn: kho không nên đứng
  // chờ mạng giữa lúc đang bê máy. Bàn không có thật thì Base sẽ từ chối.
  const maHopLe = /^TV\d+$/.test(deskCode);
  const sanSang = Boolean(
    deskCode
      && (staff || ((loading || chuaCoRoster) && maHopLe))
      && !busy,
  );

  const reset = () => {
    setScanQr('');
    setAnh([]);
    setAnhError(null);
  };

  const submit = () => {
    if (!sanSang) return;
    onSubmit({ direction, deskCode: staff?.desk ?? deskCode, scanQr: scanQr.trim(), anh });
    reset();
  };

  return (
    <div className="mx-auto w-full max-w-[430px] space-y-3 px-4 py-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      {okMessage && (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
          ✓ {okMessage}
        </p>
      )}

      {/* ── 1. Bàn TV liên quan ──────────────────────────────────────── */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm">
        <Label>{isReturn ? 'QR bàn TV trả máy' : 'QR bàn TV nhận máy'}</Label>
        <div className="mt-1 flex items-center gap-2">
          <input
            value={scanQr}
            onChange={(e) => setScanQr(e.target.value)}
            placeholder="VD: TV4"
            className="min-h-12 w-full min-w-0 flex-1 rounded-xl border border-neutral-300 px-3 text-lg font-bold uppercase"
          />
          <QrScanButton
            onScan={(v) => setScanQr(v.trim())}
            label={isReturn ? 'Quét QR bàn TV trả máy' : 'Quét QR bàn TV nhận máy'}
          />
        </div>
        {staff ? (
          <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-emerald-50 px-3 py-2">
            <span className="min-w-0 truncate text-sm font-semibold text-emerald-800">
              {staff.desk} · {staff.name ?? 'chưa có tên trong roster'}
            </span>
            <span className="shrink-0 text-[11px] font-semibold text-emerald-700">
              {staff.msnv ?? '—'}
            </span>
          </div>
        ) : null}
        {qrLoi && <p className="mt-1 text-sm font-semibold text-red-600">✗ {qrLoi}</p>}
      </div>

      {/* ── 2. Ảnh xác nhận ──────────────────────────────────────────── */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm">
        <Label>{isReturn ? 'Ảnh nhận lại máy (bắt buộc · tối đa 3 ảnh)' : 'Ảnh bàn giao máy (bắt buộc · tối đa 3 ảnh)'}</Label>
        {/* KHÔNG đặt `capture` cùng `multiple`: trên iOS `capture` ép mở thẳng
            camera và chỉ nhận đúng 1 ảnh. */}
        <PhotoSlotPicker
          slots={anh.map((file) => ({ kind: 'new' as const, file }))}
          onPick={(_, file) => {
            setAnh((current) => [...current, file].slice(0, MAX_ANH));
            setAnhError(null);
          }}
          onRemove={(slot) => setAnh((current) => current.filter((_, index) => index !== slot))}
        />
        <p className="mt-1 text-xs font-semibold text-neutral-500">Đã có {anh.length}/{MAX_ANH} ảnh</p>
        {anhError && <p className="mt-1 text-sm font-semibold text-red-600">✗ {anhError}</p>}
      </div>

      {error && <p className="text-sm font-semibold text-red-600">✗ {error}</p>}

      <button
        type="button"
        onClick={() => {
          if (anh.length === 0) {
            setAnhError(isReturn ? 'Vui lòng thêm ít nhất 1 ảnh máy nhận lại.' : 'Vui lòng thêm ít nhất 1 ảnh bàn giao máy.');
            return;
          }
          submit();
        }}
        disabled={!sanSang}
        className="min-h-14 w-full rounded-2xl bg-emerald-600 text-base font-bold text-white disabled:opacity-40"
      >
        {busy ? 'Đang gửi…' : isReturn ? 'Xác nhận nhận máy từ TV' : 'Xác nhận bàn giao máy cho TV'}
      </button>
    </div>
  );
}
