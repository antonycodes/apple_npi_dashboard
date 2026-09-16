/**
 * KhoBoardPage — màn hình Kho, route `/khoview`.
 *
 * Giống bố cục màn hình Tư vấn (`QueueBoardPage`) nhưng thay "STT hiện tại /
 * STT tiếp theo" bằng: Bàn nào · STT bao nhiêu · đang Tiếp nhận hay đã Hoàn
 * tất · Sản phẩm là gì. Có bộ lọc cụm (mặc định Tư vấn) và nút ẩn bàn trống.
 *
 * Chuỗi page/hook/component/mapper riêng (KhoBoard + useKhoBoardData +
 * khoMapper) — không đụng tới màn hình STT hay dashboard chính.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftIcon } from '@/components/AppShellIcons';
import { CLUSTER_LABELS } from '@/config/layoutConfig';
import KhoBoard, { OrderDetailsModal } from '@/components/KhoBoard';
import ViewSwitcher from '@/components/ViewSwitcher';
import SleepOverlay from '@/components/SleepOverlay';
import { useKhoBoardData } from '@/hooks/useKhoBoardData';
import { useWarehouseOrderClaims } from '@/hooks/useWarehouseOrderClaims';
import { downloadWarehouseOrderLog } from '@/services/warehouseOrderClaims';
import { useWarehouseOrders } from '@/hooks/useWarehouseOrders';
import { toRuntimeConfig, useLarkSettings } from '@/config/larkSettings';
import { useAdminInfo } from '@/config/adminSession';
import { useGuestSimulation } from '@/guest/GuestSimulationContext';
import type { ClusterKey } from '@/types/desk';
import type { WarehouseInboxOrder } from '@/types/warehouse';

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

const COLUMN_WIDTHS_KEY = 'vhws-kho-column-widths-v1';
const MIN_COLUMN_WIDTH = 180;
const ORDER_SIDEBAR_WIDTH_KEY = 'vhws-kho-order-sidebar-width-v1';
const DEFAULT_ORDER_SIDEBAR_WIDTH = 340;
const MIN_ORDER_SIDEBAR_WIDTH = 280;
const MAX_ORDER_SIDEBAR_WIDTH = 480;

type ColumnWidths = Partial<Record<ClusterFilter, Record<string, number>>>;

function readColumnWidths(): ColumnWidths {
  try {
    const raw = window.localStorage.getItem(COLUMN_WIDTHS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ColumnWidths;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function readOrderSidebarWidth(): number {
  try {
    const raw = window.localStorage.getItem(ORDER_SIDEBAR_WIDTH_KEY);
    const width = raw ? Number(raw) : DEFAULT_ORDER_SIDEBAR_WIDTH;
    return Number.isFinite(width) ? Math.min(MAX_ORDER_SIDEBAR_WIDTH, Math.max(MIN_ORDER_SIDEBAR_WIDTH, width)) : DEFAULT_ORDER_SIDEBAR_WIDTH;
  } catch {
    return DEFAULT_ORDER_SIDEBAR_WIDTH;
  }
}

function orderTypeLabel(rawText: string): string {
  const firstLine = rawText.split(/\r?\n/, 1)[0]?.trim();
  return firstLine === '#Lấy hàng cho khách' || firstLine === '#Trả hàng về kho'
    ? firstLine
    : '#Chưa phân loại';
}

function orderSummary(rawText: string): string {
  const lines = rawText.split(/\r?\n/);
  const content = lines[0]?.trim().startsWith('#') ? lines.slice(1).join(' ') : rawText;
  return content.trim() || 'Không có nội dung chi tiết';
}

function OrderInboxSidebar({ orders, onInspect }: { orders: WarehouseInboxOrder[]; onInspect: (order: WarehouseInboxOrder) => void }) {
  const sortedOrders = [...orders].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-label="Order Inbox">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-neutral-200 px-3 py-3">
        <div>
          <h2 className="text-sm font-black tracking-tight text-neutral-900">ORDER INBOX</h2>
          <p className="mt-0.5 text-[11px] text-neutral-500">Order mới nhất nằm trên cùng</p>
        </div>
        <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-black text-amber-800">
          {sortedOrders.length}
        </span>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {sortedOrders.length === 0 ? (
          <p className="px-2 py-8 text-center text-xs text-neutral-400">Chưa có order chờ xử lý.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sortedOrders.map((order) => (
              <li key={order.id}>
                <button
                  type="button"
                  onClick={() => onInspect(order)}
                  className="w-full rounded-lg border border-emerald-200 bg-emerald-50/70 p-2.5 text-left transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-1"
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-neutral-500">
                    <span>{order.deskId || 'Chưa rõ bàn'} · STT {order.stt || '—'}</span>
                    <time dateTime={new Date(order.createdAt).toISOString()}>
                      {order.createdAt ? new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </time>
                  </div>
                  <p className="mt-1 text-xs font-black text-neutral-800">Có Order - {orderTypeLabel(order.rawText)}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-neutral-600" title={orderSummary(order.rawText)}>
                    {orderSummary(order.rawText)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default function KhoBoardPage({ guestMode = false, onGuestBack }: { guestMode?: boolean; onGuestBack?: () => void }) {
  const [filter, setFilter] = useState<ClusterFilter>('consult');
  const [showFullDesks, setShowFullDesks] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(readColumnWidths);
  const [orderSidebarWidth, setOrderSidebarWidth] = useState(readOrderSidebarWidth);
  const [sidebarOrderDetails, setSidebarOrderDetails] = useState<WarehouseInboxOrder | null>(null);
  const orderSidebarResizeRef = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(null);
  const settings = useLarkSettings();
  const session = useAdminInfo();
  const guestSimulation = useGuestSimulation();
  const warehouseApiUrl = toRuntimeConfig(settings).apiUrl;
  const orderClaims = useWarehouseOrderClaims(warehouseApiUrl, !guestMode);
  const warehouseOrders = useWarehouseOrders(warehouseApiUrl, !guestMode);
  const [downloadingLog, setDownloadingLog] = useState(false);
  const { desks, loading, error, lastUpdated, isMock, refresh } = useKhoBoardData(
    filter === 'all' ? undefined : filter,
    true,
    guestMode,
  );
  const shown = useMemo(
    () => (showFullDesks ? desks : desks.filter((d) => d.customers.some((c) => c.status === 'received'))),
    [desks, showFullDesks],
  );
  useEffect(() => {
    try {
      window.localStorage.setItem(COLUMN_WIDTHS_KEY, JSON.stringify(columnWidths));
    } catch {
      // Không làm gián đoạn thao tác Kho nếu trình duyệt chặn localStorage.
    }
  }, [columnWidths]);
  useEffect(() => {
    try {
      window.localStorage.setItem(ORDER_SIDEBAR_WIDTH_KEY, String(orderSidebarWidth));
    } catch {
      // Không làm gián đoạn thao tác Kho nếu trình duyệt chặn localStorage.
    }
  }, [orderSidebarWidth]);
  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const resize = orderSidebarResizeRef.current;
      if (!resize || event.pointerId !== resize.pointerId) return;
      const nextWidth = resize.startWidth - (event.clientX - resize.startX);
      setOrderSidebarWidth(Math.min(MAX_ORDER_SIDEBAR_WIDTH, Math.max(MIN_ORDER_SIDEBAR_WIDTH, Math.round(nextWidth))));
    };
    const handlePointerEnd = (event: PointerEvent) => {
      if (orderSidebarResizeRef.current && event.pointerId !== orderSidebarResizeRef.current.pointerId) return;
      orderSidebarResizeRef.current = null;
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
    };
  }, []);
  const handleColumnResize = useCallback((columnIndex: number, width: number) => {
    setColumnWidths((current) => ({
      ...current,
      [filter]: {
        ...current[filter],
        [columnIndex]: Math.max(MIN_COLUMN_WIDTH, Math.round(width)),
      },
    }));
  }, [filter]);
  const resetColumnWidths = useCallback(() => {
    setColumnWidths((current) => {
      const next = { ...current };
      delete next[filter];
      return next;
    });
  }, [filter]);
  const handleOrderSidebarResizeStart = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    orderSidebarResizeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: orderSidebarWidth,
    };
  }, [orderSidebarWidth]);
  const activeColumnWidths = columnWidths[filter] ?? {};
  const larkConnected = !guestMode && !isMock && !error && Boolean(lastUpdated);
  const visibleOrders = guestMode ? guestSimulation?.orders ?? [] : warehouseOrders.orders;
  const visibleClaims = guestMode ? guestSimulation?.orderClaims ?? {} : orderClaims.claims;
  const downloadLog = async () => {
    if (downloadingLog || session?.role !== 'admin') return;
    setDownloadingLog(true);
    try {
      if (!warehouseApiUrl) throw new Error('Thiếu API URL của Worker.');
      const blob = await downloadWarehouseOrderLog(warehouseApiUrl);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `warehouse-order-log-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Không thể tải log order.');
    } finally {
      setDownloadingLog(false);
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-100 text-neutral-800">
      <header className="sticky top-0 z-40 shrink-0 border-b border-neutral-200 bg-white/95 px-4 py-2 backdrop-blur md:px-6 md:py-3">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div>
            <h1 className="text-lg font-bold md:text-xl">Màn hình Kho</h1>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <ViewSwitcher active="kho" simulation={guestMode} />
            <span
              className={[
                'rounded-full px-2 py-1 font-semibold',
                guestMode || larkConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700',
              ].join(' ')}
            >
              {guestMode ? 'Guest Connected' : larkConnected ? 'Lark Connected' : 'Lark Not connected'}
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
            {guestMode && onGuestBack && (
              <button
                type="button"
                onClick={onGuestBack}
                aria-label="Quay lại chọn màn hình khách"
                title="Quay lại chọn màn hình khách"
                className="flex h-8 w-8 items-center justify-center rounded border border-neutral-300 text-neutral-600 hover:bg-neutral-50"
              >
                <ArrowLeftIcon className="h-4 w-4" />
              </button>
            )}
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
              checked={showFullDesks}
              onChange={(e) => setShowFullDesks(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            Hiển thị full bàn
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
          {Object.keys(activeColumnWidths).length > 0 && (
            <button
              type="button"
              onClick={resetColumnWidths}
              className="rounded border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-white"
            >
              Khôi phục cột
            </button>
          )}
          {session?.role === 'admin' && (
            <button
              type="button"
              onClick={() => void downloadLog()}
              disabled={downloadingLog}
              className="rounded border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-white disabled:opacity-50"
            >
              {downloadingLog ? 'Đang tải…' : 'Tải log CSV'}
            </button>
          )}
        </div>

        {error && (
          <p className="mt-2 truncate text-xs text-red-600" title={error}>
            {error}
          </p>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-hidden lg:flex">
        <main className="min-h-0 min-w-0 flex-1 overflow-auto px-2 py-2 md:px-4 md:py-3">
          {shown.length === 0 ? (
            <p className="py-10 text-center text-sm text-neutral-400">
              {loading ? 'Đang tải…' : 'Chưa có bàn nào có khách.'}
            </p>
          ) : (
            <KhoBoard
              desks={shown}
              showCompleted={showCompleted}
              columns={COLUMNS[filter]}
              columnWidths={activeColumnWidths}
              onColumnResize={handleColumnResize}
              inboxOrders={visibleOrders}
              claims={visibleClaims}
              onUnlockOrder={session?.role === 'admin' ? orderClaims.unlock : undefined}
              canDeleteOrder={session?.role === 'admin'}
              onDeleteOrder={session?.role === 'admin' ? async (order) => warehouseOrders.remove(order.id) : undefined}
            />
          )}
        </main>
        {!showFullDesks && (
          <aside
            className="relative hidden min-h-0 shrink-0 flex-col border-l border-neutral-200 bg-white lg:flex"
            style={{ width: orderSidebarWidth }}
          >
            <button
              type="button"
              aria-label="Kéo để chỉnh độ rộng Order Box"
              title="Kéo để chỉnh độ rộng Order Box"
              onPointerDown={handleOrderSidebarResizeStart}
              className="group absolute left-0 top-0 bottom-0 z-20 flex w-5 -translate-x-1/2 cursor-col-resize touch-none items-center justify-center bg-transparent"
            >
              <span className="h-12 w-1 rounded-full bg-neutral-300 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
            </button>
            <OrderInboxSidebar
              orders={visibleOrders.filter((order) => shown.some((desk) => desk.id === order.deskId))}
              onInspect={setSidebarOrderDetails}
            />
          </aside>
        )}
      </div>
      {sidebarOrderDetails && (
        <OrderDetailsModal
          order={sidebarOrderDetails}
          canDelete={session?.role === 'admin'}
          onDelete={session?.role === 'admin' ? async (order) => {
            await warehouseOrders.remove(order.id);
            setSidebarOrderDetails(null);
          } : undefined}
          onClose={() => setSidebarOrderDetails(null)}
        />
      )}
      <SleepOverlay />
    </div>
  );
}
