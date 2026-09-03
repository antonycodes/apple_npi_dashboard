/**
 * QueueBoardPage — standalone "STT hiện tại / STT tiếp theo" display for one
 * cluster (Tư vấn, Thu cũ hoặc Backup), routed at /tuvanview,
 * /thucuview và /backupview.
 *
 * Its own page/hook/component chain (QueueBoard + useQueueBoardData +
 * queueMapper) — DashboardPage/LayoutDashboard/useDashboardData (the main
 * dashboard) are never imported or modified here.
 */
import { useState } from 'react';
import { CLUSTER_LABELS } from '@/config/layoutConfig';
import QueueBoard from '@/components/QueueBoard';
import Sidebar from '@/components/Sidebar';
import DispatchFormModal from '@/components/DispatchFormModal';
import ViewSwitcher from '@/components/ViewSwitcher';
import SleepOverlay from '@/components/SleepOverlay';
import { useQueueBoardData } from '@/hooks/useQueueBoardData';
import { useLarkSettings } from '@/config/larkSettings';
import { useAdminInfo } from '@/config/adminSession';
import type { ClusterKey, DeskCustomer, WaitingZoneKey } from '@/types/desk';

export default function QueueBoardPage({ cluster }: { cluster: ClusterKey }) {
  const {
    desks,
    allDesks,
    roster,
    summary,
    waitingCheckin,
    waitingDispatch,
    loading,
    error,
    lastUpdated,
    isMock,
    refresh,
  } = useQueueBoardData(cluster);
  const settings = useLarkSettings();
  const title = CLUSTER_LABELS[cluster];
  const larkConnected = !isMock && !error && Boolean(lastUpdated);
  const [onlyTradeIn, setOnlyTradeIn] = useState(false);
  const [selectedWaiting, setSelectedWaiting] = useState<{ zone: WaitingZoneKey; index: number } | null>(null);
  const [dispatchStt, setDispatchStt] = useState('');
  const [showDispatchForm, setShowDispatchForm] = useState(false);
  const session = useAdminInfo();
  const canDispatch = session?.role === 'admin'
    || session?.role === 'dieuphoi'
    || session?.workspaces.some((workspace) => workspace.role === 'dieuphoi');

  const hasTradeIn = (customer: DeskCustomer) => {
    const normalized = customer.oldDeviceCheck
      ?.normalize('NFKC')
      .toLocaleUpperCase('vi-VN')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();
    return normalized === 'CÓ THU CŨ';
  };

  const visibleWaitingCheckin = onlyTradeIn ? waitingCheckin.filter(hasTradeIn) : waitingCheckin;
  const visibleWaitingDispatch = onlyTradeIn ? waitingDispatch.filter(hasTradeIn) : waitingDispatch;

  const toggleTradeInFilter = () => {
    setSelectedWaiting(null);
    setOnlyTradeIn((active) => !active);
  };

  const selectWaiting = (zone: WaitingZoneKey, index: number) => {
    setSelectedWaiting((current) =>
      current?.zone === zone && current.index === index ? null : { zone, index },
    );
  };

  const handleDispatchWaiting = (customer: { stt: string | null }) => {
    setSelectedWaiting(null);
    setDispatchStt(customer.stt ?? '');
    setShowDispatchForm(true);
  };

  return (
    <div className="min-h-full bg-neutral-100 text-neutral-800 lg:flex lg:h-dvh lg:flex-col lg:overflow-hidden">
      <header className="border-b border-neutral-200 bg-white px-4 py-3 md:px-6 md:py-4 lg:sticky lg:top-0 lg:z-40 lg:shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div>
            <h1 className="text-lg font-bold md:text-xl">Màn hình STT · Khu vực {title}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <ViewSwitcher
              active={cluster === 'consult' ? 'tuvan' : cluster === 'tradein' ? 'tradein' : 'backup'}
            />
            <span
              className={[
                'rounded-full px-2 py-1 font-semibold',
                larkConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700',
              ].join(' ')}
            >
              {larkConnected ? 'Lark Connected' : 'Lark Not connected'}
            </span>
            <span className={error ? 'text-red-600' : 'text-neutral-500'}>
              {error ? 'Lỗi đồng bộ' : loading ? 'Đang tải…' : lastUpdated ? `Cập nhật: ${lastUpdated.toLocaleTimeString('vi-VN')}` : '—'}
            </span>
            <button
              type="button"
              onClick={refresh}
              className="min-h-8 rounded border border-neutral-300 px-3 font-medium text-neutral-600 hover:bg-neutral-50"
            >
              Làm mới
            </button>
          </div>
        </div>
        {error && (
          <p className="mt-2 truncate text-xs text-red-600" title={error}>
            {error}
          </p>
        )}
      </header>

      <main className="flex flex-col items-start gap-4 px-3 py-4 md:px-6 md:py-6 lg:min-h-0 lg:flex-1 lg:flex-row">
        <div className="min-w-0 flex-1 lg:h-full lg:overflow-y-auto lg:pr-1">
          <QueueBoard desks={desks} leadtimeMinutes={settings.leadtimeMinutes[cluster]} />
        </div>
        <div className="w-full shrink-0 lg:h-full lg:w-auto">
          <Sidebar
            summary={summary}
            waitingCheckin={visibleWaitingCheckin}
            waitingDispatch={visibleWaitingDispatch}
            selectedWaiting={selectedWaiting}
            onSelectWaiting={selectWaiting}
            onCloseWaiting={() => setSelectedWaiting(null)}
            onDispatchWaiting={canDispatch ? handleDispatchWaiting : undefined}
            tradeInFilter={{ active: onlyTradeIn, onToggle: toggleTradeInFilter }}
          />
        </div>
      </main>
      {canDispatch && showDispatchForm && (
        <DispatchFormModal
          desks={allDesks}
          roster={roster}
          initialStt={dispatchStt}
          onClose={() => setShowDispatchForm(false)}
        />
      )}
      <SleepOverlay />
    </div>
  );
}
