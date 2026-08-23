/**
 * DashboardPage — the interactive floor map + sidebar + End Flow + popover.
 */
import { useCallback, useMemo, useState } from 'react';
import CustomerPopover from '@/components/CustomerPopover';
import DeskPopover from '@/components/DeskPopover';
import DispatchFormModal from '@/components/DispatchFormModal';
import EndFlowTable from '@/components/EndFlowTable';
import PendingDeviceTable from '@/components/PendingDeviceTable';
import FilterBar from '@/components/FilterBar';
import LayoutDashboard from '@/components/LayoutDashboard';
import Sidebar from '@/components/Sidebar';
import StatusLegend from '@/components/StatusLegend';
import ViewSwitcher from '@/components/ViewSwitcher';
import SleepOverlay from '@/components/SleepOverlay';
import { useAdminInfo } from '@/config/adminSession';
import { ArrowLeftIcon } from '@/components/AppShellIcons';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { WaitingZoneKey } from '@/types/desk';

export default function DashboardPage({ readOnly = false, simulation = false, onGuestBack }: { readOnly?: boolean; simulation?: boolean; onGuestBack?: () => void } = {}) {
  const { desks, summary, waitingCheckin, waitingDispatch, endFlow, roster, unresolvedDeskNames, pendingDevice, loading, error, lastUpdated, isMock, refresh } =
    useDashboardData({ guestMode: simulation });
  const session = useAdminInfo();
  const canDispatch = (simulation || !readOnly) && (simulation || session?.role === 'admin' || session?.role === 'dieuphoi');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<{ deskId: string; index: number } | null>(null);
  const [selectedWaiting, setSelectedWaiting] = useState<{ zone: WaitingZoneKey; index: number } | null>(null);
  const [showEndFlow, setShowEndFlow] = useState(false);
  const [showPendingDevice, setShowPendingDevice] = useState(false);
  // Form Điều phối — chỉ POST lên webhook Lark, không nối vào state dashboard.
  const [showDispatchForm, setShowDispatchForm] = useState(false);
  /** STT điền sẵn khi mở form từ nút "DP" trong popup khách chờ ('' = mở tay từ nút trên thanh lọc). */
  const [dispatchStt, setDispatchStt] = useState('');

  /** Nút "DP" trong popup: đóng popup khách, mở form với STT của khách đó. */
  const handleDispatchWaiting = useCallback((customer: { stt: string | null }) => {
    setSelectedWaiting(null);
    setDispatchStt(customer.stt ?? '');
    setShowDispatchForm(true);
  }, []);

  const handleSelect = useCallback((id: string) => {
    setSelectedCustomer(null);
    setSelectedWaiting(null);
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  const handleSelectCustomer = useCallback((deskId: string, index: number) => {
    setSelectedId(null);
    setSelectedWaiting(null);
    setSelectedCustomer((prev) =>
      prev?.deskId === deskId && prev?.index === index ? null : { deskId, index },
    );
  }, []);

  const handleSelectWaiting = useCallback((zone: WaitingZoneKey, index: number) => {
    setSelectedId(null);
    setSelectedCustomer(null);
    setSelectedWaiting((prev) => (prev?.zone === zone && prev?.index === index ? null : { zone, index }));
  }, []);

  const selectedDesk = useMemo(() => {
    if (!selectedId) return null;
    return desks.find((d) => d.id === selectedId) ?? null;
  }, [desks, selectedId]);

  const selectedCustomerData = useMemo(() => {
    if (!selectedCustomer) return null;
    const desk = desks.find((d) => d.id === selectedCustomer.deskId);
    const customer = desk?.receivedCustomers?.[selectedCustomer.index];
    return desk && customer ? { desk, customer } : null;
  }, [desks, selectedCustomer]);
  const larkConnected = !isMock && !error && Boolean(lastUpdated);

  return (
    <div className="min-h-full bg-neutral-100 text-neutral-800">
      <header className="border-b border-neutral-200 bg-white px-4 py-3 md:px-6 md:py-4">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src="/cellphones-logo.png"
              alt="CellphoneS"
              className="h-7 w-auto shrink-0 md:h-8"
            />
            <h1 className="text-lg font-bold md:text-xl">NPI-CPS · Coordinator Dashboard</h1>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <ViewSwitcher active="main" />
            {session?.role === 'admin' && (
              <a
                href="#/settings"
                className="flex min-h-8 items-center rounded border border-brand px-3 font-semibold text-brand hover:bg-brand hover:text-white"
              >
                Cài đặt
              </a>
            )}
            <span
              className={[
                'rounded-full px-2 py-1 font-semibold',
                simulation
                  ? 'bg-neutral-100 text-neutral-600'
                  : larkConnected
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700',
              ].join(' ')}
            >
              {simulation ? 'Guest · Chưa có dữ liệu' : larkConnected ? 'Lark Connected' : 'Lark Not connected'}
            </span>
            <span className={error ? 'text-red-600' : 'text-neutral-500'}>
              {error
                ? 'Lỗi đồng bộ'
                : loading
                  ? 'Đang tải…'
                  : lastUpdated
                    ? `Cập nhật: ${lastUpdated.toLocaleTimeString('vi-VN')}`
                    : '—'}
            </span>
            <button
              type="button"
              onClick={refresh}
              className="min-h-8 rounded border border-neutral-300 px-3 font-medium text-neutral-600 hover:bg-neutral-50"
            >
              Làm mới
            </button>
            {simulation && onGuestBack && (
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
        {error && (
          <p className="mt-2 truncate text-xs text-red-600" title={error}>
            {error}
          </p>
        )}
        {/* Bản ghi Master không suy ra được bàn — bị bỏ khỏi sơ đồ.
            Trước đây bỏ IM LẶNG, và chính sự im lặng đó giấu bug "Lark form suy
            bàn từ `Người`": dòng vẫn vào Base, dashboard vẫn xanh mượt, không ai
            biết đang thiếu. Vàng chứ không đỏ: dashboard vẫn dùng được, đây là
            cảnh báo dữ liệu chứ không phải lỗi kết nối. */}
        {unresolvedDeskNames.length > 0 && (
          <p
            className="mt-2 truncate text-xs text-amber-700"
            title={`Không xác định được bàn cho: ${unresolvedDeskNames.join(', ')}.\nDòng Master thiếu cả 3: mã bàn (TV_MãNV), MSNV người gửi (Submit by), và bản ghi Điều phối của khách.`}
          >
            ⚠ {unresolvedDeskNames.length} khách không xác định được bàn, không hiện trên sơ đồ:{' '}
            {unresolvedDeskNames.slice(0, 3).join(', ')}
            {unresolvedDeskNames.length > 3 && ` +${unresolvedDeskNames.length - 3} khách nữa`}
          </p>
        )}
      </header>

      <main className="px-3 py-3 md:px-6 md:py-5">
        <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          <StatusLegend />
          <FilterBar
            readOnly={!canDispatch}
            endFlowCount={endFlow.length}
            endFlowOpen={showEndFlow}
            onToggleEndFlow={() => setShowEndFlow((v) => !v)}
            dispatchFormOpen={showDispatchForm}
            onToggleDispatchForm={() => {
              setDispatchStt(''); // mở tay từ thanh lọc → form trống
              setShowDispatchForm((v) => !v);
            }}
            pendingDeviceCount={pendingDevice.length}
            pendingDeviceOpen={showPendingDevice}
            onTogglePendingDevice={() => setShowPendingDevice((v) => !v)}
          />
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:gap-5">
          {/*
            Board width is capped by the space left below the header + filter row
            (≈11.5rem) times the board aspect ratio, so on a tablet in landscape
            the whole floor map fits the screen without scrolling instead of
            being squeezed vertically — the desks stay as large as possible.
          */}
          <div className="mx-auto w-full min-w-0 flex-1 max-w-[calc((100dvh-11.5rem)*16/9)] [@media(max-aspect-ratio:8/5)]:max-w-[calc((100dvh-11.5rem)*1.44)]">
            <LayoutDashboard
              desks={desks}
              selectedId={selectedId}
              onSelect={handleSelect}
              onSelectCustomer={handleSelectCustomer}
              selectedCustomer={selectedCustomer}
              overlay={
                selectedDesk ? (
                  <DeskPopover desk={selectedDesk} onClose={() => setSelectedId(null)} />
                ) : selectedCustomerData ? (
                  <CustomerPopover
                    desk={selectedCustomerData.desk}
                    customer={selectedCustomerData.customer}
                    onClose={() => setSelectedCustomer(null)}
                  />
                ) : null
              }
            />
          </div>
          <Sidebar
            summary={summary}
            waitingCheckin={waitingCheckin}
            waitingDispatch={waitingDispatch}
            selectedWaiting={selectedWaiting}
            onSelectWaiting={handleSelectWaiting}
            onCloseWaiting={() => setSelectedWaiting(null)}
            onDispatchWaiting={canDispatch ? handleDispatchWaiting : undefined}
          />
        </div>
      </main>

      {showEndFlow && <EndFlowTable customers={endFlow} onClose={() => setShowEndFlow(false)} />}
      {showPendingDevice && (
        <PendingDeviceTable customers={pendingDevice} onClose={() => setShowPendingDevice(false)} />
      )}
      {canDispatch && showDispatchForm && (
        <DispatchFormModal
          desks={desks}
          roster={roster}
          initialStt={dispatchStt}
          onClose={() => setShowDispatchForm(false)}
          simulation={simulation}
        />
      )}
      <SleepOverlay />
    </div>
  );
}
