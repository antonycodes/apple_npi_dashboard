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
import { useEffect, useMemo, useState } from 'react';
import { useAdminInfo } from '@/config/adminSession';
import { dispatchWebhookUrl, useLarkSettings } from '@/config/larkSettings';
import { sendDispatchForm } from '@/services/dispatchWebhook';
import type { DeskData, RosterEntry } from '@/types/desk';

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

export default function DispatchFormModal({ desks, roster, initialStt = '', onClose }: DispatchFormModalProps) {
  const settings = useLarkSettings();
  const webhook = dispatchWebhookUrl(settings);
  // Danh tính lấy trực tiếp từ tài khoản đăng nhập; không còn gán theo máy.
  const session = useAdminInfo();
  const coordinatorId = session?.desk || session?.username || '';
  const coordinatorName = session?.name || session?.username || '';
  const coordinatorSubmitBy = session?.msnv || session?.username || '';

  const [stt, setStt] = useState(initialStt);
  const [loai, setLoai] = useState('');
  const [deskId, setDeskId] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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
  const staffNameOf = (e: RosterEntry) => e.staffName || liveStaffByDesk.get(e.deskCode) || '';
  const msnv = selected?.staffId ?? '';
  const submitBy = coordinatorSubmitBy;
  const canSubmit = Boolean(stt.trim() && loai && deskId) && status.kind !== 'sending';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus({ kind: 'sending' });
    try {
      const res = await sendDispatchForm(webhook, {
        stt: stt.trim(),
        phanLoai: loai,
        maBan: deskId,
        nhanSu: selected ? staffNameOf(selected) : '',
        msnv,
        thoiGian: new Date().toISOString(),
        dieuPhoiId: coordinatorId,
        dieuPhoiTen: coordinatorName,
        dieuPhoiViTri: '',
        // Submit by là MSNV của tài khoản Điều phối đang đăng nhập.
        submitBy,
      });
      setStatus({ kind: 'sent', confirmed: res.confirmed });
      // Giữ nguyên "Phân loại" để nhập liên tiếp nhiều khách cùng khâu.
      setStt('');
      setDeskId('');
    } catch (err) {
      setStatus({ kind: 'error', msg: err instanceof Error ? err.message : String(err) });
    }
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

          <Field label="Phân loại">
            <select
              value={loai}
              onChange={(e) => {
                setLoai(e.target.value);
                setDeskId(''); // bàn cũ không còn thuộc phân loại mới
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
              onChange={(e) => setDeskId(e.target.value)}
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
