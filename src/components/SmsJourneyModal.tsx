import { useEffect, useRef, useState } from 'react';
import type { DispatchSendResult } from '@/services/dispatchWebhook';
import type { ClusterKey } from '@/types/desk';
import type { SmsJourney, SmsStageJourney, SmsStageStatus } from '@/types/sms';

const SMS_MESSAGE = '[CellphoneS] Quý khách sắp đến lượt nhận máy. Xin vui lòng di chuyển đến Quầy để được phục vụ. Trân trọng!';

const STATUS_LABEL: Record<SmsStageStatus, string> = {
  pending: 'Chưa tiếp nhận',
  active: 'Đang tiếp nhận',
  completed: 'Hoàn tất',
  'not-applicable': 'Không áp dụng',
};

function formatDateTime(value: number | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
}

function formatElapsed(value: number | null): string {
  if (value === null) return '—';
  const totalSeconds = Math.max(0, Math.floor(value / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}g ${String(minutes).padStart(2, '0')}p ${String(seconds).padStart(2, '0')}s`
    : `${minutes}p ${String(seconds).padStart(2, '0')}s`;
}

function normalizedPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('84') && digits.length === 11) return `0${digits.slice(2)}`;
  if (digits.length === 9) return `0${digits}`;
  return digits;
}

function statusTone(status: SmsStageStatus) {
  if (status === 'active') return 'bg-blue-100 text-blue-700';
  if (status === 'completed') return 'bg-emerald-100 text-emerald-700';
  if (status === 'not-applicable') return 'bg-neutral-100 text-neutral-500';
  return 'bg-amber-100 text-amber-700';
}

function leadtimeTone(elapsedMs: number, targetMinutes: number) {
  const target = Math.max(1, targetMinutes) * 60_000;
  const warning = Math.max(0, targetMinutes - 3) * 60_000;
  if (elapsedMs >= target) return 'bg-red-100 text-red-700';
  if (elapsedMs >= warning) return 'bg-amber-100 text-amber-700';
  return 'bg-neutral-100 text-neutral-700';
}

function StageCard({
  stage,
  now,
  targetMinutes,
}: {
  stage: SmsStageJourney;
  now: number;
  targetMinutes: number;
}) {
  const elapsed = stage.status === 'active' && stage.startedAt
    ? Math.max(0, now - stage.startedAt)
    : stage.elapsedMs;
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-black text-neutral-900">{stage.label}</h3>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-black ${statusTone(stage.status)}`}>
            {STATUS_LABEL[stage.status]}
          </span>
          {elapsed !== null && (
            <span className={`rounded-full px-2.5 py-1 text-xs font-black ${leadtimeTone(elapsed, targetMinutes)}`}>
              {formatElapsed(elapsed)} / {targetMinutes}p
            </span>
          )}
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <Value label="Bàn" value={stage.deskCode} />
        <Value label="Nhân sự" value={stage.staffName} />
        <Value label="Tiếp nhận" value={formatDateTime(stage.startedAt)} />
        <Value label="Hoàn tất" value={formatDateTime(stage.completedAt)} />
      </dl>
    </section>
  );
}

function Value({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-xl bg-neutral-50 px-3 py-2">
      <dt className="text-xs font-bold uppercase tracking-wide text-neutral-600">{label}</dt>
      <dd className="mt-1 break-words font-semibold text-neutral-800">{value || '—'}</dd>
    </div>
  );
}

export default function SmsJourneyModal({
  journey,
  leadtimeMinutes,
  onConfirm,
  onClose,
  onRequested,
  canSendSms,
}: {
  journey: SmsJourney;
  leadtimeMinutes: Record<ClusterKey, number>;
  onConfirm: () => Promise<DispatchSendResult>;
  onClose: () => void;
  onRequested: () => void;
  canSendSms: boolean;
}) {
  const [now, setNow] = useState(Date.now());
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'unverified'>('idle');
  const [error, setError] = useState<string | null>(null);
  const phone = normalizedPhone(journey.phone);
  const validPhone = /^0\d{9}$/.test(phone);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const confirmingRef = useRef(confirming);
  const statusRef = useRef(status);
  const onCloseRef = useRef(onClose);
  confirmingRef.current = confirming;
  statusRef.current = status;
  onCloseRef.current = onClose;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && statusRef.current !== 'sending') {
        if (confirmingRef.current) setConfirming(false);
        else onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previousFocus?.focus();
    };
  }, []);

  const send = async () => {
    if (!validPhone || status === 'sending') return;
    setStatus('sending');
    setError(null);
    try {
      const result = await onConfirm();
      setStatus(result.confirmed ? 'sent' : 'unverified');
      if (result.confirmed) onRequested();
    } catch (reason) {
      setStatus('idle');
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  };

  return (
    <div ref={dialogRef} className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={`Thông tin STT ${journey.stt}`}>
      <div className="flex max-h-[96dvh] w-full max-w-3xl flex-col rounded-t-3xl bg-[#f5f5f7] shadow-2xl sm:rounded-3xl">
        <header className="flex items-start justify-between gap-3 border-b border-neutral-200 bg-white px-5 py-4 sm:rounded-t-3xl">
          <div>
            <h2 className="text-xl font-black text-neutral-950">STT {journey.stt.padStart(2, '0')} · {journey.name}</h2>
            <p className="mt-1 text-sm font-semibold text-neutral-500">Hành trình phục vụ và quyết định gửi SMS</p>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} disabled={status === 'sending'} className="flex h-10 w-10 items-center justify-center rounded-xl text-2xl text-neutral-500 hover:bg-neutral-100 disabled:opacity-40" aria-label="Đóng">×</button>
        </header>

        <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
          <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Value label="Số điện thoại" value={journey.phone || 'Chưa có dữ liệu'} />
            <Value label="Check-in" value={formatDateTime(journey.checkinAt)} />
            <Value label="Trạng thái tổng" value={journey.endFlow ? 'End flow' : 'In flow'} />
            <Value label="Thời gian End Flow" value={journey.endFlowTime} />
            <div className="rounded-xl bg-neutral-50 px-3 py-2 sm:col-span-2 lg:col-span-4">
              <dt className="text-xs font-bold uppercase tracking-wide text-neutral-600">Sản phẩm</dt>
              <dd className="mt-1 whitespace-pre-line font-semibold text-neutral-800">{journey.products || '—'}</dd>
            </div>
          </dl>

          <div className="mt-4 space-y-3">
            {(['consult', 'tradein', 'backup'] as ClusterKey[]).map((key) => (
              <StageCard key={key} stage={journey.stages[key]} now={now} targetMinutes={leadtimeMinutes[key]} />
            ))}
          </div>

        </div>

        <footer className="border-t border-neutral-200 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:rounded-b-3xl sm:px-5">
          {!canSendSms && (
            <p className="mt-4 rounded-xl bg-neutral-100 px-4 py-3 text-sm font-bold text-neutral-600">
              Tài khoản này chỉ được xem dữ liệu SMS, không có quyền gửi.
            </p>
          )}
          {canSendSms && !validPhone && (
            <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              Không thể gửi: chưa có số điện thoại Việt Nam hợp lệ.
            </p>
          )}
          {journey.smsRequested && !confirming && status === 'idle' && (
            <p className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
              STT này đã có yêu cầu SMS trong Master_Điều phối.
            </p>
          )}
          {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>}
          {status === 'sent' && <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">Đã tạo yêu cầu gửi SMS trong Lark.</p>}
          {status === 'unverified' && <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">Yêu cầu đã gửi nhưng không đọc được phản hồi. Kiểm tra Lark trước khi gửi lại.</p>}

          {canSendSms && confirming && status !== 'sent' && status !== 'unverified' ? (
            <section className="mt-4 rounded-2xl border-2 border-brand/30 bg-white p-4">
              <h3 className="font-black text-neutral-950">Xác nhận tạo yêu cầu SMS</h3>
              {journey.smsRequested && <p className="mt-2 text-sm font-bold text-red-600">Đây là yêu cầu gửi lại cho STT {journey.stt.padStart(2, '0')}.</p>}
              <p className="mt-2 text-sm text-neutral-600">SĐT: <strong className="text-neutral-900">{phone}</strong></p>
              <p className="mt-3 rounded-xl bg-neutral-50 px-3 py-3 text-sm leading-6 text-neutral-700">{SMS_MESSAGE}</p>
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={() => setConfirming(false)} disabled={status === 'sending'} className="min-h-12 flex-1 rounded-xl border border-neutral-300 bg-white font-bold text-neutral-700 disabled:opacity-40">Huỷ</button>
                <button type="button" onClick={() => void send()} disabled={status === 'sending'} className="min-h-12 flex-1 rounded-xl bg-brand font-bold text-white disabled:opacity-40">{status === 'sending' ? 'Đang tạo yêu cầu…' : 'Xác nhận tạo yêu cầu'}</button>
              </div>
            </section>
          ) : canSendSms ? (
            <button type="button" onClick={() => setConfirming(true)} disabled={!validPhone || status === 'sent' || status === 'unverified'} className="mt-4 min-h-12 w-full rounded-xl bg-brand text-base font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40">
              {journey.smsRequested ? 'Tạo lại yêu cầu SMS' : 'Tạo yêu cầu SMS'}
            </button>
          ) : null}
        </footer>
      </div>
    </div>
  );
}
