/**
 * KhoBoardPage — màn hình Kho, route `#/khoview`.
 *
 * Giống bố cục màn hình Tư vấn (`QueueBoardPage`) nhưng thay "STT hiện tại /
 * STT tiếp theo" bằng: Bàn nào · STT bao nhiêu · đang Tiếp nhận hay đã Hoàn
 * tất · Sản phẩm là gì. Có bộ lọc cụm (mặc định Tư vấn) và nút ẩn bàn trống.
 *
 * Chuỗi page/hook/component/mapper riêng (KhoBoard + useKhoBoardData +
 * khoMapper) — không đụng tới màn hình STT hay dashboard chính.
 */
import { useMemo, useState } from 'react';
import { CLUSTER_LABELS } from '@/config/layoutConfig';
import KhoBoard from '@/components/KhoBoard';
import ViewSwitcher from '@/components/ViewSwitcher';
import SleepOverlay from '@/components/SleepOverlay';
import { useKhoBoardData } from '@/hooks/useKhoBoardData';
import type { ClusterKey } from '@/types/desk';

type ClusterFilter = ClusterKey | 'all';

const FILTERS: Array<{ key: ClusterFilter; label: string }> = [
  { key: 'consult', label: CLUSTER_LABELS.consult },
  { key: 'tradein', label: CLUSTER_LABELS.tradein },
  { key: 'backup', label: CLUSTER_LABELS.backup },
  { key: 'all', label: 'Tất cả' },
];

/**
 * Số cột của lưới kanban theo cụm — đủ để MỌI bàn của cụm nằm gọn trong 1 màn,
 * không phải cuộn ngang: Tư vấn 16 bàn = 8 cột × 2 dòng, Thu cũ / Backup 10
 * bàn = 5 cột × 2 dòng, "Tất cả" 36 bàn = 9 cột × 4 dòng.
 */
const COLUMNS: Record<ClusterFilter, number> = {
  consult: 8,
  tradein: 5,
  backup: 5,
  all: 9,
};

export default function KhoBoardPage() {
  const [filter, setFilter] = useState<ClusterFilter>('consult');
  const [hideEmpty, setHideEmpty] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const { desks, loading, error, lastUpdated, isMock, refresh } = useKhoBoardData(
    filter === 'all' ? undefined : filter,
  );

  const shown = useMemo(
    () => (hideEmpty ? desks.filter((d) => d.customers.length > 0) : desks),
    [desks, hideEmpty],
  );
  const larkConnected = !isMock && !error && Boolean(lastUpdated);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-100 text-neutral-800">
      <header className="shrink-0 border-b border-neutral-200 bg-white px-4 py-2 md:px-6 md:py-3">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div>
            <h1 className="text-lg font-bold md:text-xl">Màn hình Kho</h1>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <ViewSwitcher active="kho" />
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

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex items-center gap-1 rounded-lg bg-neutral-100 p-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                aria-pressed={filter === f.key}
                className={[
                  'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                  filter === f.key
                    ? 'bg-white text-brand shadow-sm'
                    : 'text-neutral-500 hover:bg-white hover:text-neutral-800',
                ].join(' ')}
              >
                {f.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1.5 text-xs text-neutral-600">
            <input
              type="checkbox"
              checked={hideEmpty}
              onChange={(e) => setHideEmpty(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            Ẩn bàn chưa có khách
          </label>
          <label className="flex items-center gap-1.5 text-xs text-neutral-600">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            Mở sẵn khách đã hoàn tất
          </label>
        </div>

        {error && (
          <p className="mt-2 truncate text-xs text-red-600" title={error}>
            {error}
          </p>
        )}
      </header>

      <main className="min-h-0 flex-1 px-2 py-2 md:px-4 md:py-3">
        {shown.length === 0 ? (
          <p className="py-10 text-center text-sm text-neutral-400">
            {loading ? 'Đang tải…' : 'Chưa có bàn nào có khách.'}
          </p>
        ) : (
          <KhoBoard desks={shown} showCompleted={showCompleted} columns={COLUMNS[filter]} />
        )}
      </main>
      <SleepOverlay />
    </div>
  );
}
