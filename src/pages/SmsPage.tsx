import { useEffect, useMemo, useState } from 'react';
import AppLogin from '@/components/AppLogin';
import SmsJourneyModal from '@/components/SmsJourneyModal';
import ViewSwitcher from '@/components/ViewSwitcher';
import { adminSessionStore, useAdminInfo } from '@/config/adminSession';
import { dispatchWebhookUrl } from '@/config/larkSettings';
import { useSmsData } from '@/hooks/useSmsData';
import { sendSmsDispatchRecord } from '@/services/dispatchWebhook';
import type { ClusterKey } from '@/types/desk';
import type { SmsJourney } from '@/types/sms';

const TOTAL_STTS = 160;
const PAGE_SIZE = 80;
const PENDING_CONSULT_FILTER_ACTIVE_CLASS = 'border-emerald-600 bg-emerald-600 text-white';
const PENDING_CONSULT_FILTER_IDLE_CLASS = 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50';

function activeStage(journey: SmsJourney) {
  let latest: SmsJourney['stages'][ClusterKey] | undefined;
  for (const key of ['consult', 'tradein', 'backup'] as ClusterKey[]) {
    const stage = journey.stages[key];
    if (stage.status !== 'active') continue;
    if (!latest || (stage.startedAt ?? 0) > (latest.startedAt ?? 0)) latest = stage;
  }
  return latest;
}

function sttTone(
  journey: SmsJourney | undefined,
  now: number,
  leadtimeMinutes: Record<ClusterKey, number>,
  onlyPendingConsult: boolean,
) {
  if (onlyPendingConsult) {
    return journey?.stages.consult.status === 'pending'
      ? 'bg-emerald-500 text-white hover:bg-emerald-600'
      : 'bg-neutral-300 text-black hover:bg-neutral-400';
  }
  if (!journey) return 'bg-neutral-300 text-black';
  const stage = activeStage(journey);
  if (journey.endFlow) return 'bg-violet-500 text-white hover:bg-violet-600';
  if (!stage?.startedAt) return 'bg-blue-500 text-white hover:bg-blue-600';
  const elapsed = Math.max(0, now - stage.startedAt);
  const targetMinutes = Math.max(1, leadtimeMinutes[stage.key]);
  if (elapsed >= targetMinutes * 60_000) return 'bg-red-500 text-white hover:bg-red-600';
  if (elapsed >= Math.max(0, targetMinutes - 3) * 60_000) return 'bg-amber-400 text-black hover:bg-amber-500';
  return 'bg-emerald-500 text-white hover:bg-emerald-600';
}

function AccessDenied() {
  return (
    <div className="flex min-h-full items-center justify-center bg-[#f5f5f7] p-5">
      <div className="w-full max-w-[430px] rounded-2xl bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-black text-neutral-950">Không có quyền gửi SMS</h1>
        <p className="mt-2 text-sm text-neutral-500">Hãy đăng nhập bằng tài khoản Điều phối hoặc Admin.</p>
        <button type="button" onClick={() => adminSessionStore.clear()} className="mt-5 min-h-11 rounded-xl bg-neutral-950 px-5 text-sm font-bold text-white">Đăng xuất</button>
      </div>
    </div>
  );
}

function SmsBoard() {
  const { journeys, loading, error, lastUpdated, refresh, settings } = useSmsData();
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [requestedLocally, setRequestedLocally] = useState<Set<string>>(() => new Set());
  const [onlyPendingConsult, setOnlyPendingConsult] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const numbers = useMemo(
    () => Array.from({ length: PAGE_SIZE }, (_, index) => page * PAGE_SIZE + index + 1),
    [page],
  );
  const selectedJourney = selected ? journeys.get(selected) ?? null : null;
  const requestedCount = useMemo(
    () => new Set([...requestedLocally, ...[...journeys.values()].filter((item) => item.smsRequested).map((item) => item.stt)]).size,
    [journeys, requestedLocally],
  );
  const pendingConsultCount = useMemo(
    () => [...journeys.values()].filter((item) => item.stages.consult.status === 'pending').length,
    [journeys],
  );

  return (
    <div className="min-h-full bg-[#f5f5f7] text-neutral-800">
      <header className="border-b border-neutral-200 bg-white px-4 py-3 md:px-6 md:py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/cellphones-logo.png" alt="CellphoneS" className="h-7 w-auto md:h-8" />
            <div className="min-w-0">
              <h1 className="truncate text-lg font-black md:text-xl">NPI-CPS · Điều phối SMS</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <ViewSwitcher active="sms" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1500px] px-4 py-4 md:px-6 md:py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-neutral-950">Danh sách STT</h2>
            <p className="mt-1 text-sm text-neutral-500">Trang {page + 1}/2 · {journeys.size}/{TOTAL_STTS} đã check-in · {requestedCount} yêu cầu SMS</p>
          </div>
          <button type="button" onClick={refresh} className="min-h-9 rounded-lg border border-neutral-300 bg-white px-3 text-xs font-bold text-neutral-600 hover:bg-neutral-50">Làm mới</button>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-sm shadow-sm">
          <span className="text-neutral-500">{loading ? 'Đang tải dữ liệu…' : lastUpdated ? `Cập nhật ${lastUpdated.toLocaleTimeString('vi-VN')}` : 'Chưa có dữ liệu'}</span>
          <div className="flex flex-wrap gap-3 text-xs font-bold text-neutral-600" aria-label="Chú thích màu">
            {onlyPendingConsult ? (
              <>
                <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden="true" />Chưa tiếp nhận Tư vấn</span>
                <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-neutral-400" aria-hidden="true" />Còn lại</span>
                <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm border-2 border-blue-400" aria-hidden="true" />Đã yêu cầu SMS</span>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-neutral-400" aria-hidden="true" />Chưa check-in</span>
                <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-blue-500" aria-hidden="true" />Đã check-in / đang chờ</span>
                <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden="true" />Đang phục vụ</span>
                <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-amber-400" aria-hidden="true" />Gần leadtime</span>
                <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-red-500" aria-hidden="true" />Quá leadtime</span>
                <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-violet-500" aria-hidden="true" />End Flow</span>
                <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-blue-800" aria-hidden="true" />Đã yêu cầu SMS</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-pressed={onlyPendingConsult}
              aria-label={`Lọc ${pendingConsultCount} STT chưa tiếp nhận Tư vấn`}
              title={`Lọc STT chưa tiếp nhận Tư vấn (${pendingConsultCount})`}
              onClick={() => setOnlyPendingConsult((current) => !current)}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 ${onlyPendingConsult ? PENDING_CONSULT_FILTER_ACTIVE_CLASS : PENDING_CONSULT_FILTER_IDLE_CLASS}`}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 5h16l-6.5 7.2v5.3l-3 1.5v-6.8L4 5Z" />
              </svg>
            </button>
            <div className="flex gap-1 rounded-lg bg-neutral-100 p-1" role="tablist" aria-label="Trang STT">
              {[0, 1].map((value) => (
                <button key={value} type="button" role="tab" aria-selected={page === value} onClick={() => setPage(value)} className={`min-h-9 rounded-md px-4 text-xs font-black ${page === value ? 'bg-white text-brand shadow-sm' : 'text-neutral-500'}`}>
                  {value === 0 ? '01–80' : '81–160'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

        <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-8 lg:grid-cols-10 xl:grid-cols-[repeat(16,minmax(0,1fr))]">
          {numbers.map((number) => {
            const stt = String(number);
            const journey = journeys.get(stt);
            const smsRequested = Boolean(journey?.smsRequested || requestedLocally.has(stt));
            const smsNotification = journey?.smsNotification ?? null;
            const smsSuccess = smsNotification ? /thành công|success|đã gửi|sent/i.test(smsNotification) : false;
            const smsDotTone = smsNotification ? (smsSuccess ? 'bg-emerald-500' : 'bg-red-500') : 'bg-blue-700';
            return (
              <button
                key={stt}
                type="button"
                disabled={!journey}
                onClick={() => setSelected(stt)}
                aria-label={`STT ${stt.padStart(2, '0')}${journey ? ' — mở hành trình' : ' — chưa check-in'}${smsNotification ? ` — ${smsNotification}` : smsRequested ? ' — đã yêu cầu SMS' : ''}`}
                title={smsNotification ?? (smsRequested ? 'Đã yêu cầu SMS, đang chờ kết quả từ Base' : undefined)}
                className={`relative aspect-square min-h-12 rounded-xl text-lg font-black shadow-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25 enabled:hover:-translate-y-0.5 enabled:hover:shadow-md disabled:cursor-not-allowed sm:min-h-14 sm:text-xl ${sttTone(journey, now, settings.leadtimeMinutes, onlyPendingConsult)} ${smsNotification ? (smsSuccess ? 'ring-2 ring-emerald-500 ring-offset-1' : 'ring-2 ring-red-500 ring-offset-1') : smsRequested ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
              >
                {stt.padStart(2, '0')}
                {smsRequested && <span className={`absolute right-1 top-1 h-2.5 w-2.5 rounded-full ${smsDotTone}`} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </main>

      {selectedJourney && (
        <SmsJourneyModal
          journey={{ ...selectedJourney, smsRequested: selectedJourney.smsRequested || requestedLocally.has(selectedJourney.stt) }}
          leadtimeMinutes={settings.leadtimeMinutes}
          onClose={() => setSelected(null)}
          onConfirm={() => sendSmsDispatchRecord(dispatchWebhookUrl(settings), selectedJourney.stt)}
          onRequested={() => {
            setRequestedLocally((current) => new Set(current).add(selectedJourney.stt));
            refresh();
          }}
        />
      )}
    </div>
  );
}

export default function SmsPage() {
  const session = useAdminInfo();
  if (!session) return <AppLogin title="NPI-CPS · Điều phối SMS" subtitle="Đăng nhập để xem hành trình khách hàng" />;
  const hasDispatchAccess = session.role === 'admin'
    || session.role === 'dieuphoi'
    || session.workspaces.some((workspace) => workspace.role === 'dieuphoi');
  if (!hasDispatchAccess) return <AccessDenied />;
  return <SmsBoard />;
}
