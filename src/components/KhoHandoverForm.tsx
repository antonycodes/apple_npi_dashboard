/**
 * KhoHandoverForm — màn BÀN GIAO của kho: kho giao máy mới cho nhân viên Tư
 * vấn, quét QR của nhân viên đó rồi chụp ảnh nghiệm thu làm bằng chứng.
 *
 * Hai khối theo đúng thứ tự tay làm — giao cho ai → ảnh — rồi mới tới nút xác
 * nhận. KHÔNG có ô STT khách (bỏ 2026-08-19 theo yêu cầu user): kho bàn giao
 * theo NGƯỜI NHẬN chứ không theo từng khách, nên dòng ghi ra không gắn STT.
 *
 * **QR nhân viên chứa MÃ BÀN** (`TV1`, `TV2`…, chốt với user 2026-08-19), nên
 * app chuẩn hoá qua `normalizeDeskCode` rồi tra roster `Master_DS` ra tên +
 * MSNV để kho NHÌN XÁC NHẬN đúng người trước khi bấm. Quét trúng mã không có
 * trong roster thì báo đỏ và chặn submit — thà bắt quét lại còn hơn ghi vào
 * Base một mã bàn không tồn tại.
 *
 * Nội dung QR và ảnh đi vào ĐÚNG hai cột mà khâu Thu cũ đang dùng (`Scan QR
 * máy cũ`, `Hình nghiệm thu máy cũ`) — yêu cầu user; đường gửi nằm ở
 * `KhoAppPage.submit` (dùng lại `sendStaffAction` của màn hình nhân viên).
 */
import { useMemo, useState } from 'react';
import QrScanButton from '@/components/QrScanButton';
import { normalizeDeskCode } from '@/services/larkMapper';
import type { KhoStaffInfo } from '@/services/khoMapper';

export interface KhoHandoverValues {
  /** Mã bàn nhận máy, đã chuẩn hoá (vd "TV4"). */
  deskCode: string;
  /** Nội dung QR ĐÚNG NHƯ ĐÃ QUÉT — ghi thẳng vào cột `Scan QR máy cũ`. */
  scanQr: string;
  anh: File[];
}

const MAX_ANH = 3;

/** Nhãn nhỏ dùng lại cho cả 3 khối. */
function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-semibold text-neutral-500">{children}</span>;
}

export default function KhoHandoverForm({
  staffByDesk,
  loading,
  busy,
  error,
  okMessage,
  onSubmit,
}: {
  staffByDesk: Map<string, KhoStaffInfo>;
  /** Đang tải roster lần đầu — chưa tra được thì KHÔNG được báo "không có bàn". */
  loading: boolean;
  busy: boolean;
  error: string | null;
  /** Thông báo "đã gửi" sau lần bàn giao gần nhất. */
  okMessage: string | null;
  onSubmit: (values: KhoHandoverValues) => void;
}) {
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
        : /^(TV|TC|BK|KHO|DP)\d+$/.test(deskCode)
          ? `Không có ${deskCode} trong cột "STT bàn" của Master_DS.`
          : `“${scanQr.trim()}” không phải mã bàn (TV1, TV2…). Quét lại QR nhân viên.`;

  // Roster chưa về thì vẫn cho gửi nếu mã có dạng mã bàn: kho không nên đứng
  // chờ mạng giữa lúc đang bê máy. Bàn không có thật thì Base sẽ từ chối.
  const maHopLe = /^(TV|TC|BK|KHO|DP)\d+$/.test(deskCode);
  const sanSang = Boolean(deskCode && (staff || ((loading || chuaCoRoster) && maHopLe)) && !busy);

  const reset = () => {
    setScanQr('');
    setAnh([]);
    setAnhError(null);
  };

  const submit = () => {
    if (!sanSang) return;
    onSubmit({ deskCode: staff?.desk ?? deskCode, scanQr: scanQr.trim(), anh });
    reset();
  };

  return (
    <div className="mx-auto w-full max-w-[430px] space-y-3 px-4 py-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      {okMessage && (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
          ✓ {okMessage}
        </p>
      )}

      {/* ── 1. Giao cho ai ───────────────────────────────────────────── */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm">
        <Label>QR nhân viên nhận máy</Label>
        <div className="mt-1 flex items-center gap-2">
          <input
            value={scanQr}
            onChange={(e) => setScanQr(e.target.value)}
            placeholder="VD: TV4"
            className="min-h-12 w-full min-w-0 flex-1 rounded-xl border border-neutral-300 px-3 text-lg font-bold uppercase"
          />
          <QrScanButton onScan={(v) => setScanQr(v.trim())} label="Quét QR nhân viên" />
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
        {staff && staff.loai && !/tư vấn/i.test(staff.loai) && (
          <p className="mt-1 text-xs font-semibold text-amber-700">
            Lưu ý: bàn {staff.desk} thuộc “{staff.loai}”, không phải Tư vấn.
          </p>
        )}
      </div>

      {/* ── 2. Ảnh nghiệm thu ────────────────────────────────────────── */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm">
        <Label>Ảnh nghiệm thu (bắt buộc · tối đa {MAX_ANH} ảnh)</Label>
        {/* KHÔNG đặt `capture` cùng `multiple`: trên iOS `capture` ép mở thẳng
            camera và chỉ nhận đúng 1 ảnh. */}
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []).slice(0, MAX_ANH);
            setAnh(files);
            setAnhError(files.length > 0 ? null : 'Vui lòng thêm ít nhất 1 ảnh nghiệm thu.');
            e.currentTarget.value = '';
          }}
          className="mt-1 block w-full text-sm text-neutral-600 file:mr-3 file:min-h-11 file:rounded-xl file:border-0 file:bg-neutral-700 file:px-4 file:text-sm file:font-bold file:text-white"
        />
        {anh.length > 0 && (
          <p className="mt-1 text-xs font-semibold text-emerald-700">Đã chọn {anh.length} ảnh</p>
        )}
        {anhError && <p className="mt-1 text-sm font-semibold text-red-600">✗ {anhError}</p>}
      </div>

      {error && <p className="text-sm font-semibold text-red-600">✗ {error}</p>}

      <button
        type="button"
        onClick={() => {
          if (anh.length === 0) {
            setAnhError('Vui lòng thêm ít nhất 1 ảnh nghiệm thu.');
            return;
          }
          submit();
        }}
        disabled={!sanSang}
        className="min-h-14 w-full rounded-2xl bg-emerald-600 text-base font-bold text-white disabled:opacity-40"
      >
        {busy ? 'Đang gửi…' : 'Xác nhận bàn giao'}
      </button>
    </div>
  );
}
