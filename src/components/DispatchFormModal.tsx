/**
 * DispatchFormModal — form "Điều phối", mở từ nút cạnh "End Flow".
 *
 * CHỈ GHI RA NGOÀI: nội dung form được POST thẳng lên webhook Lark Base
 * (`services/dispatchWebhook.ts`) để Lark tự ghi vào Base. Dashboard KHÔNG đọc
 * lại, KHÔNG đổi state bàn/khách nào theo dữ liệu nhập ở đây — sơ đồ vẫn chỉ
 * phản ánh dữ liệu đồng bộ từ Lark như trước.
 *
 * **Nguồn 2 ô select là roster `Master_DS`** (`RosterEntry`), KHÔNG phải các
 * bàn trên sơ đồ (2026-08-11, sửa sau ca test thật của user):
 *   - "Phân loại" = các giá trị "Loại" CÓ THẬT trong roster ("Tư vấn"/"Thu
 *     cũ"/"Backup"/"Kho") → khớp nguyên văn field single-select bên Base,
 *     không phải hardcode rồi cầu cho trùng. "Kho" không có trên sơ đồ nên
 *     danh sách này KHÔNG thể dựng từ `layoutConfig` được.
 *   - "Nhân sự" = NV được phân công cho mã bàn đó, có kể cả khi bàn đang
 *     trống. Bản đầu lấy tên từ bàn ĐANG CÓ KHÁCH (`staffName`) nên gửi lên
 *     Lark toàn `nhanSu: ""` mỗi khi điều phối vào bàn rảnh — đúng ca hay gặp
 *     nhất.
 * `desks` vẫn nhận vào để lấp tên NV đang thật sự ngồi bàn khi roster bỏ
 * trống ô đó (vd TV7–TV16 chưa gán ai trong `Master_DS`).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAdminInfo } from '@/config/adminSession';
import { dispatchWebhookUrl, useLarkSettings } from '@/config/larkSettings';
import { sendDispatchForm } from '@/services/dispatchWebhook';
import type { DeskData, RosterEntry } from '@/types/desk';
import { useGuestSimulation } from '@/guest/GuestSimulationContext';

interface DispatchFormModalProps {
  desks: DeskData[];
  /** Roster nhân sự từ `Master_DS` — nguồn chính của 2 ô select. */
  roster: RosterEntry[];
  /**
   * STT điền sẵn khi mở form từ nút "DP" trong popup khách đang chờ — điều
   * phối viên khỏi phải nhớ rồi gõ lại số vừa nhìn thấy.
   */
  initialStt?: string;
  onClose: () => void;
  simulation?: boolean;
}

/**
 * Roster rỗng (mất kết nối `Master_DS`, hoặc bảng chưa có dữ liệu) → vẫn cho
 * điều phối bằng mã bàn trên sơ đồ thay vì khoá cứng form giữa event. Tên NV
 * lúc đó chỉ có nếu bàn đang có khách.
 */
const FALLBACK_LOAI: Record<string, string> = {
  consult: 'Tư vấn',
  tradein: 'Thu cũ',
  backup: 'Backup',
};

const KHACH_DOI_Y_OPTIONS = [
  'Không thu cũ nữa',
  'Không backup nữa',
  'Muốn thu cũ',
  'Muốn backup',
] as const;

/*
  Ô nhập dùng chung: `text-base` = 16px là NGƯỠNG của Safari iOS — dưới mức đó
  trình duyệt tự phóng to trang khi focus vào input, làm lệch cả sơ đồ phía
  sau. `py-3` cho vùng chạm cao ~48px, đủ lớn để bấm bằng ngón trên iPad.
*/
const FIELD_BASE = 'w-full rounded-lg border px-3 py-3 text-base';

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; confirmed: boolean }
  | { kind: 'error'; msg: string };

export default function DispatchFormModal({ desks, roster, initialStt = '', onClose, simulation = false }: DispatchFormModalProps) {
  const settings = useLarkSettings();
  const webhook = dispatchWebhookUrl(settings);
  // Danh tính lấy trực tiếp từ tài khoản đăng nhập; không còn gán theo máy.
  const session = useAdminInfo();
  const guestSimulation = useGuestSimulation();
  const coordinatorId = simulation ? 'Guest_DP' : session?.desk || session?.username || '';
  const coordinatorName = simulation ? 'Guest_DP' : session?.name || session?.username || '';
  const coordinatorSubmitBy = simulation ? 'Guest_DP' : session?.msnv || session?.username || '';

  const [stt, setStt] = useState(initialStt);
  const [loai, setLoai] = useState('');
  const [khachDoiY, setKhachDoiY] = useState('');
  const [deskId, setDeskId] = useState('');
  const [daySms, setDaySms] = useState(false);
  const [busyDeskConfirmOpen, setBusyDeskConfirmOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmProgress, setConfirmProgress] = useState(0);
  const confirmProgressRef = useRef(0);
  const [confirmCompleted, setConfirmCompleted] = useState(false);
  const [confirmSending, setConfirmSending] = useState(false);
  const confirmSliderRef = useRef<HTMLInputElement>(null);
  const [confirmSliderWidth, setConfirmSliderWidth] = useState(380);
  const confirmReleaseTimer = useRef<number | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (confirmOpen) {
        setConfirmOpen(false);
        if (confirmCompleted) onClose();
      }
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmCompleted, confirmOpen, onClose]);

  useEffect(() => {
    if (!confirmOpen || !confirmSliderRef.current) return;
    const slider = confirmSliderRef.current;
    const updateWidth = () => setConfirmSliderWidth(slider.getBoundingClientRect().width);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(slider);
    return () => observer.disconnect();
  }, [confirmOpen]);

  useEffect(() => () => {
    if (confirmReleaseTimer.current !== null) window.clearTimeout(confirmReleaseTimer.current);
  }, []);

  /*
    Đồng bộ lại STT khi `initialStt` đổi, KHÔNG chỉ dựa vào việc form unmount
    lúc đóng: nếu đóng rồi mở lại trong cùng một tick React (2 setState bị gộp)
    thì component không unmount và ô STT sẽ giữ nguyên số của khách trước —
    điều phối viên rất dễ gửi nhầm STT mà không để ý.
  */
  useEffect(() => {
    setStt(initialStt);
  }, [initialStt]);

  /** Tên NV đang THẬT SỰ ngồi mỗi bàn (chỉ có khi bàn đang tiếp khách) — lấp chỗ roster bỏ trống. */
  const liveStaffByDesk = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of desks) if (d.staffName) m.set(d.id, d.staffName);
    return m;
  }, [desks]);

  /** Roster thật; rỗng thì suy tạm từ các bàn trên sơ đồ (xem `FALLBACK_LOAI`). */
  const entries: RosterEntry[] = useMemo(() => {
    if (roster.length) return roster;
    return desks.map((d) => ({
      deskCode: d.id,
      loai: FALLBACK_LOAI[d.cluster] ?? d.cluster,
      staffName: d.staffName ?? '',
    }));
  }, [roster, desks]);

  /** Các "Loại" có thật, giữ nguyên thứ tự xuất hiện trong Lark. */
  const loaiChoices = useMemo(() => [...new Set(entries.map((e) => e.loai))], [entries]);

  const staffOptions = useMemo(
    () => (loai ? entries.filter((e) => e.loai === loai) : []),
    [entries, loai],
  );

  const selected = staffOptions.find((e) => e.deskCode === deskId) ?? null;
  const selectedDesk = desks.find((desk) => desk.id === deskId) ?? null;
  const selectedDeskCustomers = selectedDesk?.receivedCustomers ?? [];
  const selectedDeskBusy = Boolean(selectedDesk?.isOccupied || selectedDeskCustomers.length > 0);
  const staffNameOf = (e: RosterEntry) => e.staffName || liveStaffByDesk.get(e.deskCode) || '';
  const msnv = khachDoiY ? '' : selected?.staffId ?? '';
  const submitBy = coordinatorSubmitBy;
  const canSubmit = Boolean(stt.trim() && (khachDoiY || (loai && deskId))) && status.kind !== 'sending';

  const sendDispatch = async (): Promise<boolean> => {
    setStatus({ kind: 'sending' });
    try {
      if (simulation) {
        if (khachDoiY) {
          setStatus({ kind: 'sent', confirmed: true });
          setStt('');
          return true;
        }
        const stage = loai.toLowerCase().includes('backup')
          ? 'backup'
          : loai.toLowerCase().includes('thu cũ') || loai.toLowerCase().includes('thu cu')
            ? 'tradein'
            : 'consult';
        guestSimulation?.dispatch(stt.trim(), stage, deskId);
        setStatus({ kind: 'sent', confirmed: true });
        setStt('');
        setDeskId('');
        return true;
      }
      const res = await sendDispatchForm(webhook, {
        stt: stt.trim(),
        phanLoai: khachDoiY ? '' : loai,
        maBan: khachDoiY ? '' : deskId,
        nhanSu: khachDoiY || !selected ? '' : staffNameOf(selected),
        msnv,
        thoiGian: new Date().toISOString(),
        dieuPhoiId: coordinatorId,
        dieuPhoiTen: coordinatorName,
        dieuPhoiViTri: '',
        // Submit by là MSNV của tài khoản Điều phối đang đăng nhập.
        submitBy,
        ...(khachDoiY ? { khachDoiY } : {}),
        ...(daySms && !khachDoiY ? { daySms: true } : {}),
      });
      setStatus({ kind: 'sent', confirmed: res.confirmed });
      // Giữ nguyên "Phân loại" để nhập liên tiếp nhiều khách cùng khâu.
      setStt('');
      setDeskId('');
      return true;
    } catch (err) {
      setStatus({ kind: 'error', msg: err instanceof Error ? err.message : String(err) });
      return false;
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (khachDoiY) {
      confirmProgressRef.current = 0;
      setConfirmProgress(0);
      setConfirmCompleted(false);
      setConfirmSending(false);
      setConfirmOpen(true);
      return;
    }
    if (selectedDeskBusy) {
      setBusyDeskConfirmOpen(true);
      return;
    }
    await sendDispatch();
  };

  const updateConfirmProgress = (value: number) => {
    const nextValue = Math.max(0, Math.min(100, value));
    confirmProgressRef.current = nextValue;
    setConfirmProgress(nextValue);
  };

  const updateConfirmProgressFromPointer = (clientX: number, element: HTMLDivElement) => {
    const rect = element.getBoundingClientRect();
    if (!rect.width) return;
    updateConfirmProgress(((clientX - rect.left) / rect.width) * 100);
  };

  const releaseConfirmSlider = () => {
    if (confirmCompleted || confirmSending) return;
    if (confirmReleaseTimer.current !== null) window.clearTimeout(confirmReleaseTimer.current);
    if (confirmProgressRef.current < 85) {
      confirmProgressRef.current = 0;
      setConfirmProgress(0);
      return;
    }

    confirmProgressRef.current = 100;
    setConfirmProgress(100);
    setConfirmSending(true);
    confirmReleaseTimer.current = window.setTimeout(async () => {
      const delivered = await sendDispatch();
      setConfirmSending(false);
      confirmProgressRef.current = 0;
      setConfirmProgress(0);
      setConfirmCompleted(delivered);
      confirmReleaseTimer.current = null;
    }, 180);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-label="Form Điều phối"
      onClick={onClose}
    >
      <div
        className="max-h-[90dvh] w-full max-w-xl overflow-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-neutral-800 sm:text-2xl">Form Điều phối</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-2xl leading-none text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            ×
          </button>
        </div>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <Field label="STT">
            <input
              type="text"
              inputMode="numeric"
              value={stt}
              onChange={(e) => setStt(e.target.value)}
              placeholder="VD: 27"
              className={`${FIELD_BASE} border-neutral-300 focus:border-brand focus:outline-none`}
            />
          </Field>

          <Field label="Khách đổi ý">
            <select
              value={khachDoiY}
              onChange={(e) => {
                const value = e.target.value;
                setKhachDoiY(value);
                if (value) {
                  setLoai('');
                  setDeskId('');
                }
              }}
              className={`${FIELD_BASE} border-neutral-300 bg-white focus:border-brand focus:outline-none`}
            >
              <option value="">— Không có thay đổi —</option>
              {KHACH_DOI_Y_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>

          {!khachDoiY && (
            <>
              <Field label="Phân loại">
                <select
                  value={loai}
                  onChange={(e) => {
                    setLoai(e.target.value);
                    setDeskId(''); // bàn cũ không còn thuộc phân loại mới
                    setDaySms(false);
                  }}
                  className={`${FIELD_BASE} border-neutral-300 bg-white focus:border-brand focus:outline-none`}
                >
                  <option value="">— Chọn phân loại —</option>
                  {loaiChoices.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Danh sách Nhân sự">
                <select
                  value={deskId}
                  onChange={(e) => {
                    setDeskId(e.target.value);
                    setDaySms(false);
                  }}
                  disabled={!loai}
                  className={`${FIELD_BASE} border-neutral-300 bg-white focus:border-brand focus:outline-none disabled:bg-neutral-100 disabled:text-neutral-400`}
                >
                  <option value="">{loai ? '— Chọn nhân sự —' : '— Chọn phân loại trước —'}</option>
                  {staffOptions.map((e) => {
                    const name = staffNameOf(e);
                    return (
                      <option key={e.deskCode} value={e.deskCode}>
                        {name ? `${e.deskCode} — ${name}` : `${e.deskCode} (chưa gán NV)`}
                      </option>
                    );
                  })}
                </select>
              </Field>

              {loai && deskId && (
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm font-bold text-neutral-700">
                  <input
                    type="checkbox"
                    checked={daySms}
                    onChange={(e) => setDaySms(e.target.checked)}
                    className="h-5 w-5 rounded border-neutral-300 text-brand focus:ring-brand"
                  />
                  <span>Gửi SMS cho khách</span>
                </label>
              )}
            </>
          )}

          <Field label="Submit by">
            <input
              value={submitBy || '— Chưa có MSNV điều phối trong Master_DS —'}
              readOnly
              className={`${FIELD_BASE} ${submitBy ? 'border-neutral-200 bg-neutral-100 text-neutral-700' : 'border-amber-300 bg-amber-50 text-amber-700'}`}
            />
          </Field>

          {!webhook && (
            <p className="rounded bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Chưa cấu hình Webhook URL. Vào <b>Cài đặt → 4 · Webhook Điều phối</b> để dán URL
              webhook của Lark Base.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={!canSubmit}
              className="min-h-12 flex-1 rounded-lg bg-brand px-6 text-base font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-40 sm:flex-none"
            >
              {status.kind === 'sending' ? 'Đang gửi…' : 'Gửi lên Lark Base'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-12 rounded-lg border border-neutral-300 px-6 text-base font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Đóng
            </button>
          </div>

          {status.kind === 'sent' && (
            <p className={`text-sm ${status.confirmed ? 'text-emerald-700' : 'text-amber-700'}`}>
              {status.confirmed
                ? '✓ Đã gửi — Lark Base xác nhận nhận được.'
                : '✓ Đã gửi. Trình duyệt bị CORS chặn đọc phản hồi nên không xác nhận được kết quả — kiểm tra lại trong Base.'}
            </p>
          )}
          {status.kind === 'error' && (
            <p className="text-sm text-red-600" title={status.msg}>
              ✗ {status.msg}
            </p>
          )}
        </form>

        {confirmOpen && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Xác nhận khách đổi ý"
            onClick={() => {
              setConfirmOpen(false);
              if (confirmCompleted) onClose();
            }}
            onKeyDown={(e) => e.key === 'Escape' && setConfirmOpen(false)}
          >
            <div
              className="max-h-[90dvh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Khách đổi ý</p>
                  <h3 className="mt-1 text-2xl font-bold text-neutral-900 sm:text-3xl">Xác nhận thao tác</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmOpen(false);
                    onClose();
                  }}
                  aria-label="Hủy xác nhận"
                  className="flex h-10 w-10 items-center justify-center rounded-full text-2xl leading-none text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                >
                  ×
                </button>
              </div>

              <img
                src="/confirm-change-shield.png"
                alt=""
                aria-hidden="true"
                className="mx-auto mt-3 h-20 w-20 object-contain sm:h-24 sm:w-24"
              />

              <div className="mt-6 flex items-center gap-3 rounded-xl bg-neutral-100 px-4 py-3">
                <span className="text-sm font-semibold text-neutral-500">STT {stt || '—'}</span>
                <span className="h-1 w-1 rounded-full bg-neutral-400" aria-hidden="true" />
                <span className="text-sm font-semibold text-neutral-700">{khachDoiY}</span>
              </div>

              <div className="mx-auto mt-8 w-full max-w-[380px]">
                <label htmlFor="confirm-change-slider" className="sr-only">
                  Kéo để xác nhận khách đồng ý thay đổi
                </label>
                <div
                  className="relative touch-none select-none"
                  onPointerDown={(e) => {
                    if (confirmCompleted || confirmSending) return;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    updateConfirmProgressFromPointer(e.clientX, e.currentTarget);
                  }}
                  onPointerMove={(e) => {
                    if (!e.currentTarget.hasPointerCapture(e.pointerId) || confirmCompleted || confirmSending) return;
                    updateConfirmProgressFromPointer(e.clientX, e.currentTarget);
                  }}
                  onPointerUp={(e) => {
                    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
                    releaseConfirmSlider();
                  }}
                  onPointerCancel={(e) => {
                    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
                    confirmProgressRef.current = 0;
                    setConfirmProgress(0);
                  }}
                >
                  <input
                    id="confirm-change-slider"
                    ref={confirmSliderRef}
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={confirmProgress}
                    disabled={confirmCompleted || status.kind === 'sending'}
                    onChange={(e) => updateConfirmProgress(Number(e.target.value))}
                    onKeyUp={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') releaseConfirmSlider();
                    }}
                    aria-valuetext={confirmCompleted ? 'Đã xác nhận thành công' : confirmSending ? 'Đang gửi về Lark' : 'Chưa xác nhận'}
                    className="confirm-slider pointer-events-none"
                    style={{
                      background: `linear-gradient(90deg, #dc2626 0%, #f87171 100%) 0 0 / ${confirmSliderWidth * (confirmProgress / 100)}px 100% no-repeat, #b91c1c`,
                    }}
                  />
                  <span
                    aria-hidden="true"
                    className="confirm-slider-handle"
                    style={{ left: `${28 + (Math.max(confirmSliderWidth, 56) - 56) * (confirmProgress / 100)}px` }}
                  >
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="8.25" />
                      {confirmCompleted ? <path d="m8 12 2.5 2.5L16 9" /> : <><path d="M8 12h7" /><path d="m12 8 4 4-4 4" /></>}
                    </svg>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute inset-y-0 left-14 right-3 z-[2] flex items-center justify-center text-sm font-semibold text-white transition-opacity duration-200 ${confirmProgress > 0 && !confirmCompleted && !confirmSending ? 'opacity-0' : 'opacity-90'}`}
                  >
                    {confirmCompleted ? 'Đã xác nhận thành công' : confirmSending ? 'Đang gửi về Lark…' : 'Xác nhận khách đồng ý thay đổi'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {busyDeskConfirmOpen && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Xác nhận điều phối vào bàn đang phục vụ"
            onClick={() => setBusyDeskConfirmOpen(false)}
          >
            <div
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-7"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 3 2.8 19a1.5 1.5 0 0 0 1.3 2.2h15.8a1.5 1.5 0 0 0 1.3-2.2L12 3Z" />
                    <path d="M12 9v4M12 17h.01" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-neutral-900">Bàn đang tiếp nhận khách</h3>
                  <p className="mt-1 text-sm leading-5 text-neutral-600">
                    {deskId} đang phục vụ {selectedDeskCustomers.length || 1} khách. Bạn vẫn muốn điều phối thêm khách vào bàn này?
                  </p>
                </div>
              </div>

              {selectedDeskCustomers.length > 0 && (
                <div className="mt-4 rounded-xl bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
                  {selectedDeskCustomers.map((customer) => (
                    <div key={customer.stt ?? customer.name} className="flex items-center gap-2 py-1">
                      <span className="font-bold">STT {customer.stt ?? '—'}</span>
                      <span className="truncate">{customer.name ?? 'Chưa có tên khách'}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setBusyDeskConfirmOpen(false)}
                  className="min-h-12 flex-1 rounded-xl border border-neutral-300 px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Quay lại
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBusyDeskConfirmOpen(false);
                    void sendDispatch();
                  }}
                  className="min-h-12 flex-[1.4] rounded-xl bg-brand px-4 text-sm font-bold text-white hover:opacity-90"
                >
                  Xác nhận điều phối
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold uppercase tracking-wide text-neutral-500">{label}</span>
      {children}
    </label>
  );
}
