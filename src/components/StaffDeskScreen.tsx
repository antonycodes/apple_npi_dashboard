/**
 * StaffDeskScreen — nội dung màn hình điện thoại của 1 nhân viên (`#/nv`).
 *
 * Thiết kế cho iPhone 17 (402 × 874 pt) cầm 1 tay: nội dung bó trong cột
 * `max-w-[430px]`, mọi vùng bấm ≥ 56px, 2 nút thao tác nằm cố định ở đáy trong
 * tầm ngón cái và chừa `env(safe-area-inset-*)` cho Dynamic Island / thanh
 * home. Trên máy rộng hơn (iPad/desktop) cột vẫn canh giữa, không vỡ layout.
 *
 * **Cả 2 nút cùng đi webhook**: Tiếp nhận và Hoàn tất đều mở
 * `StaffReceiveFormModal` cho NV soi/sửa lại thông tin, rồi POST ra workflow
 * Lark (`/webhook2` của worker) để automation TẠO RECORD trong SS_Master.
 * Cả 2 đường đều KHÔNG tự sửa dữ liệu hiển thị: trạng thái thật chỉ đổi sau khi
 * Lark ghi xong và vòng polling kế tiếp (5s) đọc về.
 *
 * **Tiếp nhận → hiện Hoàn tất**: nút Hoàn tất chỉ hiện khi bàn ĐANG có khách.
 * Giữa lúc NV vừa bấm Tiếp nhận và lúc Lark cập nhật kịp, `pending` giữ trạng
 * thái lạc quan để nút Hoàn tất hiện ra NGAY (kèm nhãn "đang chờ Lark cập
 * nhật"), không bắt NV đứng chờ 5 giây rồi mới thao tác tiếp được. `pending`
 * tự tan khi dữ liệu thật về khớp, hoặc sau `PENDING_TTL_MS` để không kẹt mãi
 * nếu NV mở link rồi bỏ ngang.
 *
 * **Đồng hồ phục vụ** (2026-08-12): chạy từ lúc bấm Tiếp nhận tới lúc bấm Hoàn
 * tất, mốc lưu trên máy (`config/staffTimers.ts`) vì Lark không trả về mốc bắt
 * đầu nào. Mở màn hình lên mà thấy sẵn khách ở bàn (tiếp nhận từ máy khác) thì
 * lấy tạm thời điểm nhìn thấy làm mốc và hiện dấu `~`.
 */
import { useEffect, useMemo, useState } from 'react';
import { staffActionWebhookUrl, useLarkSettings } from '@/config/larkSettings';
import { formatElapsed, staffTimerStore, useStaffTimers, type TimerEntry } from '@/config/staffTimers';
import { uploadNghiemThuImage } from '@/services/larkUpload';
import { sendStaffAction } from '@/services/staffActionWebhook';
import type { StaffCustomer, StaffDeskView } from '@/services/staffMapper';
import StaffReceiveFormModal, { type ReceiveFormValues } from './StaffReceiveFormModal';
import ThuMayModal, { type ThuMayValues } from './ThuMayModal';
import type { ClusterKey } from '@/types/desk';

/** Trạng thái lạc quan tự huỷ sau 2 phút (NV mở link rồi bỏ ngang). */
const PENDING_TTL_MS = 120_000;

/** Gửi webhook xong mà bấy nhiêu lâu Lark vẫn chưa hiện record → cảnh báo. */
const CONFIRM_WARN_MS = 15_000;

/** Cụm → giá trị cột `SS_Master."Loại 2"` bên Lark (KHÁC `CLUSTER_LABELS` dùng cho UI). */
const STAGE_LABEL: Record<ClusterKey, string> = {
  consult: 'Tư vấn',
  tradein: 'Thu cũ',
  backup: 'Backup',
};

/** Mốc đổi màu đồng hồ — phục vụ càng lâu, màu càng gắt (phút). */
const WARN_MINUTES = 10;
const LATE_MINUTES = 20;

interface Pending {
  action: 'receive' | 'complete';
  /**
   * STT của khách vừa thao tác — luôn khác null: khách không có STT (chưa khớp
   * được dòng Check-in) thì KHÔNG đặt trạng thái lạc quan, vì lọc theo `null`
   * sẽ ẩn nhầm mọi khách khác cũng đang thiếu STT.
   */
  stt: string;
  at: number;
}

/** Cùng quy ước tô màu với `CustomerPopover` — theo TỪ KHOÁ, không so chuỗi cứng. */
/**
 * Phần "máy thu cũ" của form Hoàn tất: giá trị điền sẵn + có khoá nút "Thu máy
 * sau" hay không.
 *
 * Tách riêng vì 2 thứ đó suy từ CÙNG một phép tính — để lặp lại logic ở 2 chỗ
 * là sớm muộn cũng lệch nhau.
 */
function buildDeviceDefaults(
  customer: StaffCustomer,
  cluster: ClusterKey,
  action: 'tiep_nhan' | 'hoan_tat',
) {
  const prev = customer.prevDevice;
  const hoanTat = action === 'hoan_tat';

  // Lần trước ghi "Thu máy sau" = máy chưa thu, khâu này thu nốt → cho NV thấy
  // lại những gì đã nhập và sửa được chỗ sai.
  const tiepTuc = hoanTat && prev?.thuLaiMay === 'Thu máy sau';

  // Ở bàn BACKUP, đủ cả 3 (ảnh + QR + IMEI) nghĩa là máy đã cầm trên tay rồi —
  // mặc định "Thu máy ngay" và KHOÁ luôn nút "Thu máy sau" để NV không bấm
  // nhầm (yêu cầu user 2026-08-12). Thiếu 1 trong 3 thì không khoá, vì lúc đó
  // chưa chắc máy đã thu.
  const duDuLieu = Boolean(
    prev && prev.images.length > 0 && prev.scanQr?.trim() && prev.imei?.trim(),
  );
  const backupDaThuMay = hoanTat && cluster === 'backup' && duDuLieu;
  const dienSan = tiepTuc || backupDaThuMay;

  return {
    values: {
      checkBackup: '',
      thuLaiMay: backupDaThuMay ? 'Thu máy ngay' : tiepTuc ? prev?.thuLaiMay ?? '' : '',
      hinhNghiemThu: [] as File[],
      anhGiuLai: dienSan ? prev?.images ?? [] : [],
      scanQr: dienSan ? prev?.scanQr ?? '' : '',
      imei: dienSan ? prev?.imei ?? '' : '',
    },
    khoaThuMaySau: backupDaThuMay,
  };
}

function checkTone(value: string | null | undefined): string {
  const s = value?.toLowerCase() ?? '';
  if (!s || s.includes('không')) return 'bg-neutral-100 text-neutral-600';
  if (s.includes('sau')) return 'bg-amber-100 text-amber-700';
  if (s.includes('có')) return 'bg-red-100 text-red-700';
  return 'bg-neutral-100 text-neutral-600';
}

/** Đồng hồ nhảy mỗi giây — chỉ chạy khi màn hình thật sự có khách để đếm. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

function ElapsedBadge({
  entry,
  now,
  size = 'lg',
}: {
  entry: TimerEntry | undefined;
  now: number;
  size?: 'sm' | 'lg';
}) {
  if (!entry) return null;
  const minutes = (now - entry.startedAt) / 60_000;
  const tone =
    minutes >= LATE_MINUTES
      ? 'bg-red-100 text-red-700'
      : minutes >= WARN_MINUTES
        ? 'bg-amber-100 text-amber-700'
        : 'bg-neutral-100 text-neutral-600';
  return (
    <span
      title={
        entry.approx
          ? 'Mốc suy ra từ lúc màn hình này thấy khách (khách được tiếp nhận ở máy khác)'
          : 'Tính từ lúc bấm Tiếp nhận'
      }
      className={[
        'inline-flex items-center gap-1 rounded-full font-mono font-bold tabular-nums',
        size === 'lg' ? 'px-2.5 py-1 text-base' : 'px-2 py-0.5 text-xs',
        tone,
      ].join(' ')}
    >
      {entry.approx ? '~' : ''}
      {formatElapsed(now - entry.startedAt)}
    </span>
  );
}

/**
 * Danh sách sổ xuống "Khách đã tiếp nhận · Hoàn tất" (yêu cầu user 2026-08-12,
 * tiếp) — lịch sử phục vụ trong ngày của ĐÚNG bàn này, đọc từ
 * `StaffDeskView.completedHistory` (mới nhất trước, xem `larkMapper.ts`'s
 * `completedByDeskCode`). Đóng theo mặc định để không chiếm chỗ 2 khối chính
 * (đang tiếp nhận / STT tiếp theo) trên màn hình điện thoại; ẩn hẳn khi bàn
 * chưa hoàn tất khách nào.
 */
function CompletedHistorySection({ customers }: { customers: StaffCustomer[] }) {
  const [open, setOpen] = useState(false);
  if (customers.length === 0) return null;

  return (
    <section className="rounded-3xl border-2 border-neutral-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="text-xs font-bold uppercase tracking-wide text-neutral-400">
          Khách đã tiếp nhận · hoàn tất
          <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-600">
            {customers.length}
          </span>
        </span>
        <span className={`shrink-0 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="max-h-72 space-y-2 overflow-y-auto border-t border-neutral-100 px-4 pb-4 pt-3">
          {customers.map((c, i) => (
            <div key={`${c.stt}-${c.name}-${i}`} className="flex items-center gap-3 rounded-2xl bg-neutral-50 p-2.5">
              <span className="flex h-9 min-w-9 items-center justify-center rounded-xl bg-neutral-300 px-1.5 text-base font-black text-white">
                {c.stt ?? '•'}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-neutral-800">{c.name ?? 'Khách'}</p>
                <p className="truncate text-xs text-neutral-500">{c.productName ?? '—'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start justify-between gap-3 border-t border-neutral-100 py-2">
      <span className="shrink-0 text-sm text-neutral-500">{label}</span>
      <span className="min-w-0 break-words text-right text-sm font-semibold text-neutral-800">
        {value && value.trim() ? value : '—'}
      </span>
    </div>
  );
}

function CustomerCard({
  customer,
  tone,
  timer,
  now,
}: {
  customer: StaffCustomer;
  tone: 'current' | 'pending';
  timer: TimerEntry | undefined;
  now: number;
}) {
  return (
    <div className={tone === 'pending' ? 'opacity-70' : undefined}>
      <div className="flex items-center gap-3">
        <span className="flex h-16 min-w-16 items-center justify-center rounded-2xl bg-red-600 px-2 text-3xl font-black leading-none text-white">
          {customer.stt ?? '•'}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="min-w-0 truncate text-xl font-bold leading-tight text-neutral-900">
              {customer.name ?? 'Khách'}
            </span>
            <ElapsedBadge entry={timer} now={now} />
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {customer.oldDeviceCheck && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${checkTone(customer.oldDeviceCheck)}`}>
                {customer.oldDeviceCheck}
              </span>
            )}
            {customer.backupCheck && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${checkTone(customer.backupCheck)}`}>
                {customer.backupCheck}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3">
        <InfoRow label="Sản phẩm" value={customer.productName} />
        <InfoRow label="Ghi chú thanh toán" value={customer.paymentNote} />
        <InfoRow label="Check nghiệm thu" value={customer.deviceAcceptedText} />
      </div>
    </div>
  );
}

/**
 * Nút thao tác — 2 chế độ (xem module doc):
 *   - `onPress` (webhook): <button>, chống bấm đúp bằng `busy`.
 *   - `href` (hyperlink): <a> mở Lark ở tab mới.
 * Không có cả hai (thiếu link, chưa có khách chờ) → nút xám, không bấm được.
 */
function ActionButton({
  label,
  hint,
  href,
  variant,
  disabled,
  locked,
  busy,
  onPress,
  onOpen,
}: {
  label: string;
  hint?: string;
  href?: string | null;
  variant: 'receive' | 'complete';
  disabled?: boolean;
  locked?: boolean;
  busy?: boolean;
  onPress?: () => void;
  onOpen?: () => void;
}) {
  const base =
    'flex min-h-[56px] flex-1 flex-col items-center justify-center rounded-2xl px-3 py-2 text-center text-base font-bold shadow-sm transition-transform active:scale-[0.98]';
  const enabled = variant === 'receive' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white';
  const off = 'cursor-not-allowed bg-neutral-200 text-neutral-500 shadow-none';
  const lockedCls = 'cursor-not-allowed bg-black text-white shadow-none';

  if (onPress) {
    return (
      <button
        type="button"
        onClick={onPress}
        disabled={disabled || busy}
        className={`${base} ${locked ? lockedCls : disabled || busy ? off : enabled}`}
      >
        {busy ? 'Đang gửi…' : label}
        {hint && <span className="mt-0.5 text-[11px] font-medium opacity-90">{hint}</span>}
      </button>
    );
  }

  if (!href || disabled) {
    return (
      <span aria-disabled="true" className={`${base} ${off}`}>
        {label}
        {hint && <span className="mt-0.5 text-[11px] font-medium">{hint}</span>}
      </span>
    );
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" onClick={onOpen} className={`${base} ${enabled}`}>
      {label}
      {hint && <span className="mt-0.5 text-[11px] font-medium opacity-90">{hint}</span>}
    </a>
  );
}

export default function StaffDeskScreen({ view }: { view: StaffDeskView }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const markPending = (action: Pending['action'], stt: string | null) => {
    if (stt) setPending({ action, stt, at: Date.now() });
  };

  // Dữ liệu thật về rồi thì bỏ trạng thái lạc quan: khách đã xuất hiện ở bàn
  // (sau Tiếp nhận) hoặc đã rời bàn (sau Hoàn tất).
  useEffect(() => {
    if (!pending) return;
    const sttInDesk = new Set(view.current.map((c) => c.stt));
    const done = pending.action === 'receive' ? sttInDesk.has(pending.stt) : !sttInDesk.has(pending.stt);
    if (done) setPending(null);
  }, [view, pending]);

  useEffect(() => {
    if (!pending) return;
    const left = PENDING_TTL_MS - (Date.now() - pending.at);
    const timer = setTimeout(() => setPending(null), Math.max(0, left));
    return () => clearTimeout(timer);
  }, [pending]);

  // Khách vừa bấm Hoàn tất → ẩn ngay khỏi danh sách (chờ Lark xác nhận).
  const current = useMemo(
    () =>
      pending?.action === 'complete'
        ? view.current.filter((c) => c.stt !== pending.stt)
        : view.current,
    [view.current, pending],
  );

  // Khách vừa bấm Tiếp nhận nhưng Lark chưa ghi kịp → hiện tạm ở thẻ "đang tiếp nhận".
  const ghost: StaffCustomer | null =
    pending?.action === 'receive' && !current.some((c) => c.stt === pending.stt)
      ? view.next?.stt === pending.stt
        ? view.next
        : { stt: pending.stt, name: null }
      : null;

  const primary = current[0] ?? null;
  const extras = current.slice(1);
  const busy = Boolean(primary || ghost);

  /**
   * STT vừa thu máy xong trên MÁY NÀY → mốc thời gian. Ẩn khách khỏi danh sách
   * "Chờ thu máy" ngay lập tức, không đợi Lark cập nhật.
   *
   * Vì sao cần: công thức `Check nghiệm thu` bên Lark dùng `SUM()` trên MỌI
   * dòng "Thu máy ngay" của khách đó. Thu 2 lần là báo cáo hiện "Đã nghiệm thu
   * (2) / (1) máy". Danh sách chỉ tự sạch sau nhịp poll kế tiếp (5s) — thừa
   * thời gian để NV bấm lại lần nữa vì tưởng chưa ăn.
   *
   * CHỈ chặn trên cùng 1 máy. Hai bàn khác nhau cùng bấm trong 5 giây đó thì
   * vẫn lọt — chặn triệt để phải đếm duy nhất bên công thức Lark.
   */
  const [vuaThu, setVuaThu] = useState<Record<string, number>>({});

  // Bỏ khách vừa thu máy xong trên máy này (xem `vuaThu`). Mốc quá hạn thì thả
  // ra lại — gửi hỏng nửa chừng mà ẩn vĩnh viễn là mất luôn việc phải làm.
  // Chỉ còn phần lạc quan (`vuaThu`) ở đây — việc loại khách đang ngồi bàn này
  // nằm trong `staffMapper`, vì đó là logic dữ liệu chứ không phải trạng thái
  // màn hình.
  const pendingDevice = useMemo(
    () =>
      view.pendingDevice.filter((c) => {
        const at = c.stt ? vuaThu[c.stt] : undefined;
        return !at || Date.now() - at > PENDING_TTL_MS;
      }),
    [view.pendingDevice, vuaThu],
  );

  // ── Đồng hồ phục vụ ────────────────────────────────────────────────────
  const timers = useStaffTimers();
  const now = useNow(busy || Boolean(pending));
  useEffect(() => {
    // `current` (đã bỏ khách vừa bấm Hoàn tất) chứ không phải `view.current`:
    // Lark còn đang trả về khách đó vài giây nữa, dùng danh sách thô sẽ dựng
    // lại ngay cái đồng hồ vừa dừng.
    //
    // Khách đang ở bàn mà máy này chưa có mốc nào (được tiếp nhận từ máy khác,
    // hoặc trước khi có tính năng) → lấy tạm lúc nhìn thấy, đánh dấu `approx`.
    for (const c of current) staffTimerStore.start(view.id, c.stt, true);
    // Khách đã rời bàn thì bỏ đồng hồ — trừ khách vừa bấm Tiếp nhận, Lark chưa
    // kịp ghi (giữ lại thì đồng hồ mới không bị reset khi dữ liệu về).
    staffTimerStore.pruneDesk(view.id, [
      ...current.map((c) => c.stt),
      pending?.action === 'receive' ? pending.stt : null,
    ]);
  }, [view, current, pending]);
  const timerOf = (stt: string | null) => (stt ? timers[`${view.id}|${stt}`] : undefined);

  /** Bấm Tiếp nhận: bắt đầu đếm giờ + đánh dấu lạc quan. */
  const receiveCustomer = (stt: string | null) => {
    markPending('receive', stt);
    staffTimerStore.start(view.id, stt, false);
  };

  /** Bấm Hoàn tất: dừng (xoá) đồng hồ + đánh dấu lạc quan. */
  const completeCustomer = (stt: string | null) => {
    markPending('complete', stt);
    staffTimerStore.stop(view.id, stt);
  };

  // ── Nút Tiếp nhận qua webhook: form recheck → POST tạo record SS_Master ──
  const settings = useLarkSettings();
  const webhookUrl = staffActionWebhookUrl(settings);
  const [sending, setSending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [formAction, setFormAction] = useState<'tiep_nhan' | 'hoan_tat' | null>(null);
  const [formCustomer, setFormCustomer] = useState<StaffCustomer | null>(null);
  const [lockedReceiveStt, setLockedReceiveStt] = useState<string | null>(null);
  /** Sheet "chỉ thu máy" đang mở hay không (NV gõ STT bên trong sheet). */
  const [thuMayOpen, setThuMayOpen] = useState(false);

  /**
   * Gửi record "chỉ thu máy" — không đi qua Tiếp nhận, không cần Điều phối.
   *
   * Ghi 1 dòng `Hoàn tất` với `Thu lại máy = "Thu máy ngay"` cùng ảnh/QR/IMEI,
   * `Loại 2` theo ĐÚNG bàn đang thao tác (quyết định user 2026-08-18): thu ở
   * BK ghi "Backup", thu ở TC ghi "Thu cũ".
   *
   * Hai điều đã kiểm và chấp nhận:
   * - Dòng này KHÔNG làm bàn đỏ: nó là "Hoàn tất", chỉ "Tiếp nhận" mới tính
   *   occupancy (xem `larkMapper.indexMasterByDeskCode`).
   * - Worker KHÔNG tính được leadtime vì không có dòng "Tiếp nhận" tương ứng.
   *   Nó chỉ ghi lý do vào `data.skipped`, record vẫn tạo bình thường. Đúng
   *   vậy: thao tác này không phải một khâu phục vụ nên không có gì để đo.
   */
  const submitThuMay = async (khach: StaffCustomer, values: ThuMayValues) => {
    const stt = khach.stt?.trim();
    if (!stt || sending) return;
    setActionError(null);
    setSending(true);
    try {
      // Upload TUẦN TỰ như đường Hoàn tất — sóng hội trường hay nghẽn, bắn
      // cùng lúc dễ timeout cả loạt và không biết đứt ở ảnh thứ mấy.
      const tokens = values.anhGiuLai.map((img) => img.fileToken);
      for (const [i, file] of values.anhMoi.entries()) {
        try {
          tokens.push(await uploadNghiemThuImage(file));
        } catch (err) {
          setActionError(
            `Upload ảnh ${i + 1}/${values.anhMoi.length} thất bại: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
          setSending(false);
          return;
        }
      }

      await sendStaffAction(webhookUrl, {
        // `thu_may` chứ không phải `hoan_tat`: worker chỉ tính leadtime cho
        // `hoan_tat`, mà thao tác này không có mốc bắt đầu nào để trừ.
        //
        // `Thu máy nhanh` — option RIÊNG bên Lark, không dùng lại "Hoàn tất":
        // cột đó là đầu vào của `Status in backup` và `Done in Flow`, ghi
        // "Hoàn tất" vào đây là khách chỉ ghé gửi máy bị tính thành đã qua
        // Backup và "khâu vừa xong" báo sai. Xem `StaffActionPayload.trangThai`.
        action: 'thu_may',
        trangThai: 'Thu máy nhanh',
        stt,
        hoTen: khach.name ?? '',
        maBan: view.id,
        msnv: view.staffId ?? '',
        phanLoai: STAGE_LABEL[view.cluster],
        nhanSu: view.staffName ?? '',
        submitBy: view.staffId ?? '',
        thoiGian: new Date().toISOString(),
        thuLaiMay: 'Thu máy ngay',
        ...(tokens.length ? { hinhNghiemThu: tokens } : {}),
        ...(values.scanQr.trim() ? { scanQr: values.scanQr.trim() } : {}),
        ...(values.imei.trim() ? { imei: values.imei.trim() } : {}),
      });
      setVuaThu((p) => ({ ...p, [stt]: Date.now() }));
      setThuMayOpen(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  };

  /**
   * Gửi thao tác Tiếp nhận (giá trị lấy từ form NV vừa xác nhận). Cập nhật lạc
   * quan TRƯỚC để NV thấy phản hồi ngay, rồi HOÀN TÁC nếu gửi hỏng — thà quay
   * về trạng thái cũ còn hơn để màn hình báo đã tiếp nhận trong khi Lark chẳng
   * có record nào.
   */
  const submitAction = async (values: ReceiveFormValues) => {
    const stt = values.stt.trim();
    if (!stt || sending) return; // `sending` = khoá chống bấm đúp → tránh tạo record trùng
    setActionError(null);
    setSending(true);
    try {
      // Check Backup áp dụng cho MỌI khâu khi Hoàn tất (mở rộng 2026-08-12);
      // cố tình KHÔNG gửi field này khi Tiếp nhận, để automation phân biệt
      // được "không áp dụng" vs "chưa chọn".
      const isComplete = formAction === 'hoan_tat';
      const checkBackup =
        isComplete && values.checkBackup ? (values.checkBackup as 'Có' | 'Không') : undefined;

      // Nhóm "Thu lại máy" + 3 field máy thu cũ: CHỈ Hoàn tất ở Thu cũ/Backup.
      const isDeviceStage = view.cluster === 'tradein' || view.cluster === 'backup';
      const thuLaiMay =
        isComplete && isDeviceStage && values.thuLaiMay
          ? (values.thuLaiMay as 'Thu máy ngay' | 'Thu máy sau')
          : undefined;
      const scanQr = thuLaiMay ? values.scanQr.trim() : '';
      const imei = thuLaiMay ? values.imei.trim() : '';

      // Ảnh phải đổi thành `file_token` TRƯỚC khi gửi webhook (cột đính kèm
      // Bitable không nhận URL/base64 — xem `larkUpload.ts`). Upload hỏng thì
      // DỪNG HẲN, không gửi webhook: thà NV bấm lại còn hơn tạo record thiếu
      // ảnh mà màn hình vẫn báo thành công.
      //
      // Upload TUẦN TỰ, không `Promise.all`: điện thoại ở hội trường hay nghẽn
      // sóng, bắn 5 ảnh cùng lúc dễ timeout cả loạt — và khi hỏng thì cũng cần
      // biết đứt ở ảnh thứ mấy để báo cho NV.
      let hinhNghiemThu: string[] | undefined;
      if (thuLaiMay) {
        // Ảnh cũ NV giữ lại đi kèm ảnh mới: record này là bản ghi ĐẦY ĐỦ của
        // lần Hoàn tất, không phải phần bổ sung. Token dùng lại được vì vẫn
        // trong cùng Base (xem `larkUpload.ts`).
        const tokens = values.anhGiuLai.map((img) => img.fileToken);
        for (const [i, file] of values.hinhNghiemThu.entries()) {
          try {
            tokens.push(await uploadNghiemThuImage(file));
          } catch (err) {
            setActionError(
              `Upload ảnh ${i + 1}/${values.hinhNghiemThu.length} thất bại: ${
                err instanceof Error ? err.message : String(err)
              }`,
            );
            setSending(false);
            return;
          }
        }
        hinhNghiemThu = tokens;
      }

      // Leadtime khâu này: đọc mốc bắt đầu TRƯỚC khi `completeCustomer()` xoá
      // đồng hồ. Chỉ có ý nghĩa khi Hoàn tất; lúc Tiếp nhận thì chưa có gì để đo.
      //
      // `approx` = mốc suy ra (màn hình mở lên đã thấy sẵn khách, hoặc NV tải
      // lại trang giữa chừng) — số đo khi đó THIẾU so với thực tế, nên gắn cờ
      // để bên phân tích lọc ra, thay vì trộn lẫn làm lệch trung bình.
      const moc = isComplete ? staffTimerStore.get(view.id, stt) : undefined;
      const leadtimeMs = moc ? Math.max(0, Date.now() - moc.startedAt) : null;
      const leadtime =
        leadtimeMs === null
          ? {}
          : {
              // CẮT XUỐNG chứ không làm tròn, để khớp `formatElapsed` — làm
              // tròn thì báo cáo hiện "30 giây" cạnh "00:29", trông như lỗi.
              leadtimeGiay: Math.floor(leadtimeMs / 1000),
              // Tiền tố `~` khi mốc là SUY RA — cùng ký hiệu màn hình NV đang
              // hiện. Base không có cột riêng cho cờ ước lượng, nên gắn dấu
              // ngay vào chuỗi để người đọc báo cáo phân biệt được.
              leadtimeHienThi: (moc?.approx ? '~' : '') + formatElapsed(leadtimeMs),
              leadtimeUocLuong: (moc?.approx ? 'Có' : 'Không') as 'Có' | 'Không',
            };

      await sendStaffAction(webhookUrl, {
        action: formAction ?? 'tiep_nhan',
        trangThai: formAction === 'hoan_tat' ? 'Hoàn tất' : 'Tiếp nhận',
        stt,
        hoTen: values.hoTen.trim(),
        maBan: values.maBan.trim(),
        msnv: values.msnv.trim(),
        phanLoai: values.phanLoai,
        nhanSu: values.nhanSu.trim(),
        // Submit by bên Lark thống nhất là MSNV, giống webhook Điều phối.
        submitBy: values.msnv.trim(),
        thoiGian: new Date().toISOString(),
        ...(checkBackup ? { checkBackup } : {}),
        ...(thuLaiMay ? { thuLaiMay } : {}),
        ...(hinhNghiemThu?.length ? { hinhNghiemThu } : {}),
        ...(scanQr ? { scanQr } : {}),
        ...(imei ? { imei } : {}),
        ...leadtime,
      });
      if (formAction === 'hoan_tat') {
        completeCustomer(stt);
      } else {
        receiveCustomer(stt);
        setLockedReceiveStt(stt);
      }
      setFormAction(null);
      setFormCustomer(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  };

  const nextStt = view.next?.stt ?? null;
  const webhookMode = Boolean(webhookUrl);
  const receiveLocked = Boolean(lockedReceiveStt && lockedReceiveStt === nextStt);
  useEffect(() => {
    // Khi Lark đã chuyển sang STT kế tiếp, mở khoá nút Tiếp nhận cho khách mới.
    if (lockedReceiveStt && lockedReceiveStt !== nextStt) setLockedReceiveStt(null);
  }, [lockedReceiveStt, nextStt]);
  const receiveHint = !nextStt
    ? 'Chưa có khách chờ'
    : !webhookMode
      ? 'Chưa cấu hình webhook'
      : receiveLocked
        ? `Đã gửi · STT ${nextStt}`
        : `STT ${nextStt}`;
  const completeCustomerForButton = primary ?? ghost;
  const completeHint = completeCustomerForButton ? `STT ${completeCustomerForButton.stt ?? '•'}` : 'Chưa có khách';

  // Đã gửi webhook mà quá lâu Lark vẫn chưa hiện record → nói thẳng, đừng để
  // NV ngồi nhìn nhãn "đang chờ" mãi rồi tưởng xong.
  const slowConfirm = Boolean(pending) && webhookMode && now - (pending?.at ?? now) > CONFIRM_WARN_MS;

  return (
    <>
      <main className="mx-auto w-full max-w-[430px] space-y-3 px-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-3">
        {/* ── Khách đang tiếp nhận ─────────────────────────────────────── */}
        <section
          className={[
            'rounded-3xl border-2 bg-white p-4 shadow-sm',
            busy ? 'border-red-200' : 'border-neutral-200',
          ].join(' ')}
        >
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-neutral-400">
            Khách đang tiếp nhận
          </h2>

          {primary ? (
            <CustomerCard customer={primary} tone="current" timer={timerOf(primary.stt)} now={now} />
          ) : ghost ? (
            <>
              <CustomerCard customer={ghost} tone="pending" timer={timerOf(ghost.stt)} now={now} />
              <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                {webhookMode ? 'Đã gửi Tiếp nhận — đang chờ Lark tạo record…' : 'Vừa bấm Tiếp nhận — đang chờ Lark cập nhật…'}
              </p>
            </>
          ) : (
            <div className="py-6 text-center">
              <p className="text-3xl font-black text-neutral-300">—</p>
              <p className="mt-1 text-sm text-neutral-500">Chưa tiếp nhận khách nào</p>
            </div>
          )}

          {/* Vừa Tiếp nhận khách mới TRONG KHI bàn vẫn còn khách cũ — thẻ chính
              đang là khách cũ, nên khách mới phải có chỗ riêng, không thì NV bấm
              xong chẳng thấy gì thay đổi. */}
          {primary && ghost && (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-3">
              <div className="flex items-center gap-2">
                <span className="flex h-9 min-w-9 items-center justify-center rounded-xl bg-red-600/70 px-1.5 text-base font-black text-white">
                  {ghost.stt ?? '•'}
                </span>
                <span className="min-w-0 truncate text-sm font-bold text-neutral-800">
                  {ghost.name ?? 'Khách'}
                </span>
                <ElapsedBadge entry={timerOf(ghost.stt)} now={now} size="sm" />
              </div>
              <p className="mt-1 text-xs font-semibold text-amber-700">
                {webhookMode ? 'Đã gửi Tiếp nhận — đang chờ Lark tạo record…' : 'Vừa bấm Tiếp nhận — đang chờ Lark cập nhật…'}
              </p>
            </div>
          )}

          {extras.length > 0 && (
            <div className="mt-4 space-y-3 border-t border-dashed border-neutral-200 pt-3">
              <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">
                Khách khác đang phục vụ cùng lúc
              </p>
              {extras.map((c) => (
                <div key={`${c.stt}-${c.name}`} className="rounded-2xl bg-neutral-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-9 min-w-9 items-center justify-center rounded-xl bg-red-600 px-1.5 text-base font-black text-white">
                        {c.stt ?? '•'}
                      </span>
                      <span className="min-w-0 truncate text-sm font-bold text-neutral-800">
                        {c.name ?? 'Khách'}
                      </span>
                      <ElapsedBadge entry={timerOf(c.stt)} now={now} size="sm" />
                    </div>
                    <button
                      type="button"
                      disabled={!webhookMode || sending}
                      onClick={() => {
                        setActionError(null);
                        setFormCustomer(c);
                        setFormAction('hoan_tat');
                      }}
                      className="min-h-11 shrink-0 rounded-xl bg-red-600 px-3 py-2 text-sm font-bold text-white active:opacity-80 disabled:bg-neutral-200 disabled:text-neutral-700"
                    >
                      Hoàn tất
                    </button>
                  </div>
                  <p className="mt-1 truncate text-xs text-neutral-500">{c.productName ?? '—'}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── STT khách tiếp theo ──────────────────────────────────────── */}
        <section className="rounded-3xl border-2 border-amber-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wide text-amber-500">
                STT khách tiếp theo
              </h2>
              <p className="mt-1 truncate text-base font-bold text-neutral-800">
                {view.next?.name ?? (nextStt ? 'Khách' : 'Chưa có khách chờ')}
              </p>
              <p className="truncate text-sm text-neutral-500">{view.next?.productName ?? '—'}</p>
            </div>
            <span className={`text-6xl font-black leading-none ${nextStt ? 'text-amber-500' : 'text-neutral-200'}`}>
              {nextStt ?? '—'}
            </span>
          </div>
          <p className="mt-3 border-t border-neutral-100 pt-2 text-sm text-neutral-500">
            Đang chờ tại bàn: <span className="font-bold text-neutral-800">{view.waiting}</span> khách
          </p>
        </section>

        {/* ── Thu máy cũ (chỉ Thu cũ / Backup) ──────────────────────────
            Nút chứ không phải danh sách (yêu cầu user 2026-08-18): NV bàn chỉ
            cần xử đúng người đang đứng trước mặt, gõ STT là ra. Bức tranh toàn
            cảnh "còn bao nhiêu máy chưa thu" là việc của Điều phối, xem nút
            "Chờ thu máy" trên dashboard. */}
        {view.cluster !== 'consult' && (
          <button
            type="button"
            onClick={() => {
              setActionError(null);
              setThuMayOpen(true);
            }}
            disabled={!webhookMode}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-3xl border-2 border-amber-400 bg-amber-50 text-base font-bold text-amber-800 active:bg-amber-100 disabled:opacity-40"
          >
            Thu máy cũ
            {pendingDevice.length > 0 && (
              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs text-white">
                {pendingDevice.length} chờ
              </span>
            )}
          </button>
        )}

        {/* ── Lịch sử khách đã tiếp nhận · hoàn tất (sổ xuống) ─────────── */}
        <CompletedHistorySection customers={view.completedHistory} />
      </main>

      {/* ── Thanh thao tác cố định đáy màn hình ────────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur">
        {/* Lỗi gửi hiện ngay trong form (`StaffReceiveFormModal`); ở đây chỉ
            cảnh báo trường hợp gửi xong mà Lark mãi không ghi nhận. */}
        {slowConfirm && (
          <div className="mx-auto w-full max-w-[430px] px-4 pt-2">
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
              Lark chưa ghi nhận sau 15 giây — kiểm tra automation hoặc bấm lại.
            </p>
          </div>
        )}
        <div className="mx-auto flex w-full max-w-[430px] gap-2 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <ActionButton
            label="Tiếp nhận"
            hint={receiveHint}
            variant="receive"
            disabled={!nextStt || !webhookMode || receiveLocked}
            locked={receiveLocked}
            onPress={() => {
              setActionError(null);
              setFormCustomer(view.next);
              setFormAction('tiep_nhan');
            }}
          />
          <ActionButton
            label="Hoàn tất"
            hint={completeHint}
            variant="complete"
            disabled={!busy || !webhookMode}
            onPress={() => {
              const customer = primary ?? ghost;
              if (!customer) return;
              setActionError(null);
              setFormCustomer(customer);
              setFormAction('hoan_tat');
            }}
          />
        </div>
      </div>

      {thuMayOpen && (
        <ThuMayModal
          candidates={pendingDevice}
          deskLabel={view.label}
          busy={sending}
          error={actionError}
          onSubmit={(khach, values) => void submitThuMay(khach, values)}
          onClose={() => {
            if (sending) return;
            setThuMayOpen(false);
            setActionError(null);
          }}
        />
      )}

      {formAction && formCustomer && (
        <StaffReceiveFormModal
          customer={formCustomer}
          deskLabel={view.label}
          cluster={view.cluster}
          action={formAction}
          khoaThuMaySau={buildDeviceDefaults(formCustomer, view.cluster, formAction).khoaThuMaySau}
          defaults={{
            stt: formCustomer.stt ?? '',
            hoTen: formCustomer.name ?? '',
            maBan: view.id,
            msnv: view.staffId ?? '',
            phanLoai: STAGE_LABEL[view.cluster],
            nhanSu: view.staffName ?? '',
            submitBy: view.staffId ?? '',
            ...buildDeviceDefaults(formCustomer, view.cluster, formAction).values,
          }}
          busy={sending}
          error={actionError}
          onSubmit={(values) => void submitAction(values)}
          onClose={() => {
            if (sending) return;
            setFormAction(null);
            setFormCustomer(null);
            setActionError(null);
          }}
        />
      )}
    </>
  );
}
