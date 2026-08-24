/**
 * StaffReceiveFormModal — form "recheck trước khi gửi" của 2 nút **Tiếp nhận**
 * và **Hoàn tất**
 * (yêu cầu user 2026-08-12).
 *
 * Bấm một trong hai nút KHÔNG gửi ngay: mở sheet này để NV soi lại thông tin khách
 * tiếp và sửa được nếu lệch (vd khách đổi chỗ, STT gõ sai bên check-in), rồi
 * mới POST ra webhook để Lark tạo record `SS_Master`.
 *
 * Ô nào **sửa được = ô đó được GỬI ĐI**; phần sản phẩm/ghi chú/thu cũ chỉ hiện
 * để đối chiếu (read-only) và không nằm trong payload — giữ đúng bộ field đã
 * khai với automation bên Lark, thêm bớt tuỳ tiện sẽ làm map field bên đó lệch.
 *
 * Layout điện thoại: sheet trượt từ đáy, chiếm tối đa 92% chiều cao, nội dung
 * cuộn được, nút hành động dính đáy trong tầm ngón cái + chừa safe area.
 */
import { useEffect, useState } from 'react';
import QrScanButton from '@/components/QrScanButton';
import { workerBaseUrl } from '@/services/adminApi';
import type { PrevImage, StaffCustomer } from '@/services/staffMapper';
import type { ClusterKey } from '@/types/desk';

export interface ReceiveFormValues {
  stt: string;
  hoTen: string;
  maBan: string;
  msnv: string;
  phanLoai: string;
  nhanSu: string;
  submitBy: string;
  /** "Có" | "Không" | "" (chưa chọn) — chỉ có ý nghĩa khi Hoàn tất (mọi khâu). */
  checkBackup: string;
  /** "Thu máy ngay" | "Thu máy sau" | "" — chỉ Hoàn tất ở khâu Thu cũ/Backup. */
  thuLaiMay: string;
  /** Ảnh nghiệm thu NV vừa chụp/chọn (chọn được NHIỀU) — upload lấy `file_token` lúc submit. */
  hinhNghiemThu: File[];
  /**
   * Ảnh đã ghi vào Base từ lần trước mà NV muốn GIỮ LẠI. Bỏ 1 ảnh khỏi mảng
   * này = không đưa vào record mới (ảnh cũ vẫn còn ở record cũ, xem README).
   */
  anhGiuLai: PrevImage[];
  /** Nội dung QR máy thu cũ (quét bằng camera hoặc gõ tay). */
  scanQr: string;
  /** IMEI máy thu cũ. */
  imei: string;
}

export default function StaffReceiveFormModal({
  customer,
  deskLabel,
  cluster,
  khoaThuMaySau = false,
  defaults,
  action,
  busy,
  error,
  onSubmit,
  onClose,
}: {
  /** Khách kế tiếp — dùng cho phần đối chiếu read-only. */
  customer: StaffCustomer | null;
  deskLabel: string;
  /** Cụm của bàn đang thao tác — quyết định có hiện câu hỏi Check Backup không. */
  cluster: ClusterKey;
  /**
   * Khoá nút "Thu máy sau" (xám, bấm không được). Bật khi ở bàn Backup mà dữ
   * liệu máy cũ đã đủ cả 3 — máy đã cầm trên tay nên chọn "sau" là sai, khoá
   * để NV khỏi bấm nhầm (yêu cầu user 2026-08-12). Xem `buildDeviceDefaults`.
   */
  khoaThuMaySau?: boolean;
  defaults: ReceiveFormValues;
  action: 'tiep_nhan' | 'hoan_tat';
  busy: boolean;
  error: string | null;
  onSubmit: (values: ReceiveFormValues) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState<ReceiveFormValues>(defaults);
  const [staffDetailsOpen, setStaffDetailsOpen] = useState(false);
  const set = <K extends keyof ReceiveFormValues>(key: K, v: ReceiveFormValues[K]) =>
    setValues((p) => ({ ...p, [key]: v }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  // Check Backup khi HOÀN TẤT, TRỪ chính bàn Backup (yêu cầu user 2026-08-12,
  // tiếp): hỏi "khách có dùng Backup không" ngay tại bàn Backup là thừa.
  const showBackupCheck = action === 'hoan_tat' && cluster !== 'backup';
  // "Thu lại máy" + 3 field máy thu cũ: CHỈ Hoàn tất ở khâu Thu cũ/Backup.
  const showThuLaiMay = action === 'hoan_tat' && (cluster === 'tradein' || cluster === 'backup');
  // 3 field chỉ bung ra sau khi chọn 1 trong 2 option (yêu cầu user).
  const showDeviceFields = showThuLaiMay && values.thuLaiMay.length > 0;
  // Check Backup VẪN bắt buộc (quyết định 2026-08-12, giờ áp cho mọi khâu);
  // riêng "Thu lại máy" + 3 field máy thu cũ thì KHÔNG bắt buộc (yêu cầu user).
  const canSubmit =
    values.stt.trim().length > 0 &&
    values.maBan.trim().length > 0 &&
    (!showBackupCheck || values.checkBackup.length > 0) &&
    !busy;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" role="dialog" aria-modal="true">
      <div className="flex max-h-[92dvh] w-full max-w-[430px] flex-col rounded-t-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-neutral-900">
              {action === 'tiep_nhan' ? 'Xác nhận tiếp nhận' : 'Xác nhận hoàn tất'}
            </h2>
            <p className="truncate text-xs text-neutral-500">
              Kiểm tra lại thông tin trước khi ghi vào Lark · Bàn {deskLabel}
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
          <Field label="STT khách" value={values.stt} onChange={(v) => set('stt', v)} inputMode="numeric" />
          <Field label="Họ và tên" value={values.hoTen} onChange={(v) => set('hoTen', v)} />

          {showBackupCheck && (
            <div>
              <span className="text-xs font-semibold text-neutral-500">Khách có Backup/Chuyển dữ liệu không?</span>
              <div className="mt-1 flex gap-2">
                {(['Có', 'Không'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => set('checkBackup', opt)}
                    className={`min-h-11 flex-1 rounded-xl border text-base font-bold ${
                      values.checkBackup === opt
                        ? opt === 'Có'
                          ? 'border-red-600 bg-red-600 text-white'
                          : 'border-neutral-700 bg-neutral-700 text-white'
                        : 'border-neutral-300 bg-white text-neutral-600'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showThuLaiMay && (
            <div>
              <span className="text-xs font-semibold text-neutral-500">Thu lại máy</span>
              <div className="mt-1 flex gap-2">
                {(['Thu máy ngay', 'Thu máy sau'] as const).map((opt) => {
                  const khoa = khoaThuMaySau && opt === 'Thu máy sau';
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={khoa}
                      onClick={() => set('thuLaiMay', opt)}
                      className={`min-h-11 flex-1 rounded-xl border px-2 text-sm font-bold ${
                        khoa
                          ? 'cursor-not-allowed border-neutral-200 bg-neutral-100 text-neutral-400'
                          : values.thuLaiMay === opt
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-neutral-300 bg-white text-neutral-600'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3 field máy thu cũ — bung ra sau khi chọn 1 trong 2 option trên.
              Đều KHÔNG bắt buộc: NV điền được gì thì điền, thiếu vẫn gửi được. */}
          {showDeviceFields && (
            <div className="space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
              <div>
                <span className="text-xs font-semibold text-neutral-500">Ảnh nghiệm thu sản phẩm (tối đa 3 ảnh)</span>

                {/* Ảnh đã ghi ở lần "Thu máy sau" trước đó. Thumbnail lấy qua
                    `GET /media/<token>` của worker — token KHÔNG phải URL, và
                    link `url`/`tmp_url` Lark trả về thì đòi Bearer nên thẻ
                    <img> không hiển thị thẳng được. */}
                {values.anhGiuLai.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {values.anhGiuLai.map((img) => (
                      <div key={img.fileToken} className="relative">
                        <img
                          src={`${workerBaseUrl()}/media/${encodeURIComponent(img.fileToken)}`}
                          alt={img.name ?? 'Ảnh nghiệm thu'}
                          className="h-20 w-20 rounded-xl border border-neutral-300 object-cover"
                        />
                        <button
                          type="button"
                          aria-label="Bỏ ảnh này"
                          onClick={() =>
                            set(
                              'anhGiuLai',
                              values.anhGiuLai.filter((x) => x.fileToken !== img.fileToken),
                            )
                          }
                          className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-neutral-800 text-sm leading-none text-white"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {/* `multiple` = chọn/chụp nhiều ảnh 1 lần (tối đa 3 ảnh cả ảnh cũ giữ lại).
                    KHÔNG đặt `capture` cùng `multiple`: trên iOS `capture` ép mở
                    thẳng camera và chỉ nhận ĐÚNG 1 ảnh, mất luôn khả năng chọn
                    nhiều. Bỏ đi thì iOS hiện bảng chọn "Chụp ảnh / Thư viện" —
                    vẫn chụp được, mà chọn nhiều cũng được. */}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const remaining = Math.max(0, 3 - values.anhGiuLai.length);
                    const selected = Array.from(e.target.files ?? []).slice(0, remaining);
                    set('hinhNghiemThu', selected);
                    e.currentTarget.value = '';
                  }}
                  className="mt-1 block w-full text-sm text-neutral-600 file:mr-3 file:min-h-11 file:rounded-xl file:border-0 file:bg-neutral-700 file:px-4 file:text-sm file:font-bold file:text-white"
                  disabled={values.anhGiuLai.length >= 3}
                />
                {values.anhGiuLai.length >= 3 && (
                  <p className="mt-1 text-xs font-semibold text-amber-700">Đã đủ 3 ảnh nghiệm thu.</p>
                )}
                {values.hinhNghiemThu.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    <p className="text-xs font-semibold text-emerald-700">
                      Đã chọn {values.hinhNghiemThu.length + values.anhGiuLai.length}/3 ảnh
                    </p>
                    {values.hinhNghiemThu.map((f, i) => (
                      <p key={`${f.name}-${i}`} className="truncate text-[11px] text-neutral-500">
                        {f.name}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <span className="text-xs font-semibold text-neutral-500">Scan QR máy thu cũ</span>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    value={values.scanQr}
                    onChange={(e) => set('scanQr', e.target.value)}
                    placeholder="Quét QR hoặc gõ tay"
                    className="min-h-11 w-full rounded-xl border border-neutral-300 px-3 text-base"
                  />
                  <QrScanButton onScan={(v) => set('scanQr', v)} label="Quét QR máy thu cũ" />
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-neutral-500">IMEI máy</span>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    value={values.imei}
                    onChange={(e) => set('imei', e.target.value)}
                    inputMode="numeric"
                    placeholder="Quét mã hoặc gõ tay"
                    className="min-h-11 w-full rounded-xl border border-neutral-300 px-3 text-base"
                  />
                  {/* Tem IMEI trên hộp máy hay là mã vạch 1D, không phải QR —
                      mở thêm các định dạng đó cho trình duyệt nào hỗ trợ. */}
                  <QrScanButton
                    onScan={(v) => set('imei', v)}
                    formats={['qr_code', 'code_128', 'code_39', 'ean_13', 'itf']}
                    label="Quét IMEI"
                    barcodeFrame
                  />
                </div>
              </div>
            </div>
          )}

          <section className="rounded-2xl border border-neutral-200 bg-neutral-50">
            <button
              type="button"
              onClick={() => setStaffDetailsOpen((open) => !open)}
              aria-expanded={staffDetailsOpen}
              className="flex min-h-11 w-full items-center justify-between gap-3 px-3 text-left"
            >
              <span className="min-w-0 truncate text-xs font-bold text-neutral-600">
                Nhân viên · {values.maBan || '—'} · {values.nhanSu || 'Chưa có tên'} · MSNV {values.msnv || '—'}
              </span>
              <span className="shrink-0 text-xs font-semibold text-neutral-500">
                {staffDetailsOpen ? 'Thu gọn' : 'Mở rộng'} {staffDetailsOpen ? '⌃' : '⌄'}
              </span>
            </button>
            {staffDetailsOpen && (
              <div className="space-y-2 border-t border-neutral-200 px-3 pb-3 pt-2">
                <Field label="Mã bàn · Master_DS" value={values.maBan} onChange={() => undefined} readOnly compact />
                <Field label="Phân loại · Master_DS.Loại" value={values.phanLoai} onChange={() => undefined} readOnly compact />
                <Field label="Nhân sự · Master_DS.NV Tư vấn" value={values.nhanSu} onChange={() => undefined} readOnly compact />
                {/* 1 dòng thôi: `msnv` và `submitBy` luôn cùng giá trị (xem
                    `StaffDeskScreen.submitAction`), hiện 2 dòng chỉ gây rối. */}
                <Field label="Submit by · MSNV nhân viên" value={values.msnv} onChange={() => undefined} readOnly compact />
              </div>
            )}
          </section>

          {/* Chỉ để đối chiếu — không gửi đi, xem module doc. */}
          <div className="rounded-2xl bg-neutral-50 p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-400">
              Thông tin check-in (chỉ để đối chiếu)
            </p>
            <ReadRow label="Sản phẩm" value={customer?.productName} />
            <ReadRow label="Ghi chú thanh toán" value={customer?.paymentNote} />
            <ReadRow label="Thu cũ check" value={customer?.oldDeviceCheck} />
            <ReadRow label="Backup check" value={values.checkBackup || customer?.backupCheck} />
            <ReadRow label="Check nghiệm thu" value={customer?.deviceAcceptedText} />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">✗ {error}</p>
          )}
        </div>

        <div className="flex gap-2 border-t border-neutral-200 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="min-h-[56px] flex-1 rounded-2xl border border-neutral-300 text-base font-semibold text-neutral-600 active:bg-neutral-100 disabled:opacity-40"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={() => onSubmit(values)}
            disabled={!canSubmit}
            className={`min-h-[56px] flex-[2] rounded-2xl text-base font-bold text-white shadow-sm active:opacity-80 disabled:bg-neutral-200 disabled:text-neutral-900 ${action === 'tiep_nhan' ? 'bg-emerald-600' : 'bg-red-600'}`}
          >
            {busy ? 'Đang gửi…' : action === 'tiep_nhan' ? 'Gửi Tiếp nhận' : 'Gửi Hoàn tất'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  inputMode,
  readOnly,
  compact,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: 'numeric' | 'text';
  readOnly?: boolean;
  compact?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-neutral-500">{label}</span>
      <input
        value={value}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        className={`${compact ? 'min-h-9 text-sm' : 'min-h-[52px] text-base'} rounded-xl border border-neutral-300 px-3 focus:border-brand focus:outline-none ${readOnly ? 'bg-neutral-100 text-neutral-600' : ''}`}
      />
    </label>
  );
}

function ReadRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start justify-between gap-3 border-t border-neutral-200/70 py-1.5 first:border-t-0">
      <span className="shrink-0 text-xs text-neutral-500">{label}</span>
      <span className="min-w-0 break-words text-right text-xs font-semibold text-neutral-700">
        {value && value.trim() ? value : '—'}
      </span>
    </div>
  );
}
