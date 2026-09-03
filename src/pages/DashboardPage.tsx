/**
 * DashboardPage — the interactive floor map + sidebar + End Flow + popover.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import CustomerPopover from '@/components/CustomerPopover';
import DeskPopover from '@/components/DeskPopover';
import DispatchFormModal from '@/components/DispatchFormModal';
import EndFlowTable from '@/components/EndFlowTable';
import PendingDeviceTable from '@/components/PendingDeviceTable';
import FilterBar, { type OvertimeDesk } from '@/components/FilterBar';
import LayoutDashboard from '@/components/LayoutDashboard';
import Sidebar from '@/components/Sidebar';
import StatusLegend from '@/components/StatusLegend';
import ViewSwitcher from '@/components/ViewSwitcher';
import SleepOverlay from '@/components/SleepOverlay';
import { useAdminInfo } from '@/config/adminSession';
import { ArrowLeftIcon } from '@/components/AppShellIcons';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useGuestSimulation } from '@/guest/GuestSimulationContext';
import { LEADTIME_WARNING_MINUTES, toRuntimeConfig, useLarkSettings } from '@/config/larkSettings';
import { formatElapsed } from '@/config/staffTimers';
import type { DeskCustomer, WaitingZoneKey } from '@/types/desk';
import { clearDeskAlert, subscribeDeskAlerts } from '@/services/dashboardRealtime';
import type { DeskAlert } from '@/services/deskAlerts';

function hasTradeIn(customer: DeskCustomer) {
  const normalized = customer.oldDeviceCheck
    ?.normalize('NFKC')
    .toLocaleUpperCase('vi-VN')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  return normalized === 'CÓ THU CŨ';
}

export default function DashboardPage({ readOnly = false, simulation = false, onGuestBack }: { readOnly?: boolean; simulation?: boolean; onGuestBack?: () => void } = {}) {
  const { desks, summary, waitingCheckin, waitingDispatch, endFlow, roster, unresolvedDeskNames, pendingDevice, loading, error, lastUpdated, isMock, refresh } =
    useDashboardData({ guestMode: simulation });
  const session = useAdminInfo();
  const settings = useLarkSettings();
  const guestRoom = useGuestSimulation();
  const [now, setNow] = useState(() => Date.now());
  const [showGuestQr, setShowGuestQr] = useState(false);
  const [guestQrDataUrl, setGuestQrDataUrl] = useState<string | null>(null);
  const [deskAlerts, setDeskAlerts] = useState<DeskAlert[]>([]);
  const visibleDeskAlerts = simulation ? guestRoom?.alerts ?? [] : deskAlerts;
  const realtimeApiUrl = toRuntimeConfig(settings).apiUrl;
  const displayedDesks = useMemo(
    () => simulation
      ? desks.map((desk) => {
          const guestName = settings.guestUsers[desk.id]?.trim() || settings.guestUsers[desk.label]?.trim();
          return guestName ? { ...desk, staffName: guestName } : desk;
        })
      : desks,
    [desks, settings.guestUsers, simulation],
  );

  useEffect(() => {
    if (simulation) return undefined;
    return subscribeDeskAlerts(
      realtimeApiUrl,
      (alert) => setDeskAlerts((current) => [...current.filter((item) => item.id !== alert.id), alert]),
      (alertId) => setDeskAlerts((current) => current.filter((alert) => alert.id !== alertId)),
    );
  }, [realtimeApiUrl, simulation]);

  useEffect(() => {
    if (!showGuestQr || !guestRoom?.joinUrl) {
      setGuestQrDataUrl(null);
      return;
    }
    void QRCode.toDataURL(guestRoom.joinUrl, { width: 240, margin: 2, errorCorrectionLevel: 'M' })
      .then(setGuestQrDataUrl)
      .catch(() => setGuestQrDataUrl(null));
  }, [guestRoom?.joinUrl, showGuestQr]);
  const hasDispatchAccess = session?.role === 'admin'
    || session?.role === 'dieuphoi'
    || session?.workspaces.some((workspace) => workspace.role === 'dieuphoi');
  const canDispatch = (simulation || !readOnly) && (simulation || hasDispatchAccess);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<{ deskId: string; index: number } | null>(null);
  const [selectedWaiting, setSelectedWaiting] = useState<{ zone: WaitingZoneKey; index: number } | null>(null);
  const [onlyTradeIn, setOnlyTradeIn] = useState(false);
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

  const visibleWaitingCheckin = onlyTradeIn ? waitingCheckin.filter(hasTradeIn) : waitingCheckin;
  const visibleWaitingDispatch = onlyTradeIn ? waitingDispatch.filter(hasTradeIn) : waitingDispatch;

  const toggleTradeInFilter = useCallback(() => {
    setSelectedWaiting(null);
    setOnlyTradeIn((active) => !active);
  }, []);

  const selectedDesk = useMemo(() => {
    if (!selectedId) return null;
    return displayedDesks.find((d) => d.id === selectedId) ?? null;
  }, [displayedDesks, selectedId]);

  const selectedCustomerData = useMemo(() => {
    if (!selectedCustomer) return null;
    const desk = displayedDesks.find((d) => d.id === selectedCustomer.deskId);
    const customer = desk?.receivedCustomers?.[selectedCustomer.index];
    return desk && customer ? { desk, customer } : null;
  }, [displayedDesks, selectedCustomer]);

  const overtimeDesks = useMemo<OvertimeDesk[]>(() => {
    return desks.flatMap((desk) => {
      const customer = desk.receivedCustomers?.[0];
      const startedAt = customer?.serviceStartedAt;
      if (!customer || typeof startedAt !== 'number' || !Number.isFinite(startedAt) || startedAt <= 0) return [];

      const elapsedMs = Math.max(0, now - startedAt);
      const leadtimeMs = Math.max(1, settings.leadtimeMinutes[desk.cluster]) * 60_000;
      const warningMs = Math.max(0, settings.leadtimeMinutes[desk.cluster] - LEADTIME_WARNING_MINUTES) * 60_000;
      if (elapsedMs < warningMs) return [];

      return [{
        id: desk.id,
        label: desk.label,
        stt: customer.stt,
        elapsed: formatElapsed(elapsedMs),
        overdue: elapsedMs >= leadtimeMs,
      }];
    });
  }, [desks, now, settings.leadtimeMinutes]);
  const larkConnected = !isMock && !error && Boolean(lastUpdated);

  return (
    <div className="min-h-full bg-neutral-100 text-neutral-800 lg:flex lg:h-dvh lg:flex-col lg:overflow-hidden">
      <header className="border-b border-neutral-200 bg-white px-4 py-3 md:px-6 md:py-4 lg:sticky lg:top-0 lg:z-40 lg:shrink-0">
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
            <ViewSwitcher active="dash" />
            {session?.role === 'admin' && (
              <a
                href="/settings"
                className="flex min-h-8 items-center rounded border border-brand px-3 font-semibold text-brand hover:bg-brand hover:text-white"
              >
                Cài đặt
              </a>
            )}
            <span
              className={[
                'rounded-full px-2 py-1 font-semibold',
                simulation
                  ? 'bg-emerald-100 text-emerald-700'
                  : larkConnected
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700',
              ].join(' ')}
            >
              {simulation ? 'Guest Connected' : larkConnected ? 'Lark Connected' : 'Lark Not connected'}
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
            {simulation && guestRoom?.roomCode && (
              <button
                type="button"
                onClick={() => setShowGuestQr(true)}
                title={guestRoom.joinUrl ?? undefined}
                className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"
              >
                {guestRoom.roomCode}
              </button>
            )}
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

      {simulation && showGuestQr && guestRoom?.joinUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Mã QR phòng mô phỏng" onClick={() => setShowGuestQr(false)}>
          <div className="w-full max-w-xs rounded-2xl bg-white p-5 text-center shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-neutral-900">Phòng {guestRoom.roomCode}</h2>
              <button type="button" onClick={() => setShowGuestQr(false)} aria-label="Đóng" className="text-2xl leading-none text-neutral-400 hover:text-neutral-700">×</button>
            </div>
            {guestQrDataUrl ? (
              <img src={guestQrDataUrl} alt={`QR tham gia phòng ${guestRoom.roomCode}`} className="mx-auto mt-4 h-56 w-56 rounded-lg border border-neutral-200" />
            ) : (
              <div className="mx-auto mt-4 flex h-56 w-56 items-center justify-center rounded-lg border border-neutral-200 text-sm text-neutral-500">Đang tạo QR…</div>
            )}
            <p className="mt-3 text-sm font-semibold text-neutral-600">Quét mã bằng điện thoại để tham gia</p>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(guestRoom.joinUrl ?? '')}
              className="mt-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-bold text-neutral-600 hover:bg-neutral-50"
            >
              Copy link phòng
            </button>
          </div>
        </div>
      )}

      <main className="px-3 py-3 md:px-6 md:py-5 lg:min-h-0 lg:flex-1">
        <div className="flex flex-col gap-4 lg:h-full lg:flex-row lg:gap-5">
          <div className="min-w-0 flex-1 lg:h-full lg:overflow-y-auto lg:pr-1">
            <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
              <StatusLegend />
              <FilterBar
                overtimeDesks={overtimeDesks}
                onSelectOvertimeDesk={handleSelect}
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

            {/*
              Board width is capped by the space left below the header + filter row
              (≈11.5rem) times the board aspect ratio, so on a tablet in landscape
              the whole floor map fits the screen without scrolling instead of
              being squeezed vertically — the desks stay as large as possible.
            */}
            <div className="mx-auto w-full max-w-[calc((100dvh-11.5rem)*16/9)] [@media(max-aspect-ratio:8/5)]:max-w-[calc((100dvh-11.5rem)*1.44)] lg:mx-0">
              <LayoutDashboard
                desks={displayedDesks}
                selectedId={selectedId}
                onSelect={handleSelect}
                onSelectCustomer={handleSelectCustomer}
                selectedCustomer={selectedCustomer}
                alertedDeskIds={new Set(visibleDeskAlerts.map((alert) => alert.deskId))}
                overlay={
                  selectedDesk ? (
                    <DeskPopover
                      desk={selectedDesk}
                      onClose={() => setSelectedId(null)}
                      onAcknowledgeAlert={visibleDeskAlerts.some((alert) => alert.deskId === selectedDesk.id) ? () => {
                        visibleDeskAlerts
                          .filter((alert) => alert.deskId === selectedDesk.id)
                          .forEach((alert) => simulation
                            ? guestRoom?.clearCoordinatorAlert(alert.deskId)
                            : clearDeskAlert(realtimeApiUrl, alert.id));
                      } : undefined}
                    />
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
          </div>
          <div className="w-full shrink-0 lg:h-full lg:w-auto">
            <Sidebar
              summary={summary}
              waitingCheckin={visibleWaitingCheckin}
              waitingDispatch={visibleWaitingDispatch}
              selectedWaiting={selectedWaiting}
              onSelectWaiting={handleSelectWaiting}
              onCloseWaiting={() => setSelectedWaiting(null)}
              onDispatchWaiting={canDispatch ? handleDispatchWaiting : undefined}
              tradeInFilter={{ active: onlyTradeIn, onToggle: toggleTradeInFilter }}
            />
          </div>
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
