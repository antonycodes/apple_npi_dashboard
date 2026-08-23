/**
 * QueueBoardPage — standalone "STT hiện tại / STT tiếp theo" display for one
 * cluster (Tư vấn, Thu cũ hoặc Backup), routed at #/tuvanview,
 * #/kythuatview và #/backupview.
 *
 * Its own page/hook/component chain (QueueBoard + useQueueBoardData +
 * queueMapper) — DashboardPage/LayoutDashboard/useDashboardData (the main
 * dashboard) are never imported or modified here.
 */
import { CLUSTER_LABELS } from '@/config/layoutConfig';
import QueueBoard from '@/components/QueueBoard';
import ViewSwitcher from '@/components/ViewSwitcher';
import SleepOverlay from '@/components/SleepOverlay';
import { useQueueBoardData } from '@/hooks/useQueueBoardData';
import { useLarkSettings } from '@/config/larkSettings';
import type { ClusterKey } from '@/types/desk';

export default function QueueBoardPage({ cluster }: { cluster: ClusterKey }) {
  const { desks, loading, error, lastUpdated, isMock, refresh } = useQueueBoardData(cluster);
  const settings = useLarkSettings();
  const title = CLUSTER_LABELS[cluster];
  const larkConnected = !isMock && !error && Boolean(lastUpdated);

  return (
    <div className="min-h-full bg-neutral-100 text-neutral-800">
      <header className="border-b border-neutral-200 bg-white px-4 py-3 md:px-6 md:py-4">
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

      <main className="px-3 py-4 md:px-6 md:py-6">
        <QueueBoard desks={desks} leadtimeMinutes={settings.leadtimeMinutes[cluster]} />
      </main>
      <SleepOverlay />
    </div>
  );
}
