/**
 * KhoAppPage — module KHO trong app gộp (`#/app`, tài khoản có `Loại` = "Kho").
 *
 * Hai tab: **Bàn giao** (việc chính — giao máy cho NV Tư vấn) và **Bảng kho**
 * (chính là bảng kanban `#/khoview`, thu gọn cho điện thoại). Tách khỏi
 * `KhoBoardPage` vì hai màn phục vụ hai người khác nhau: bảng kanban dành cho
 * màn hình lớn treo ở kho, còn màn này nằm trong tay người đang bê máy.
 *
 * Đường ghi dùng lại NGUYÊN `sendStaffAction` + `uploadNghiemThuImage` của màn
 * hình nhân viên — cùng một đường vào `SS_Master`, cùng cách xử lý token và
 * CORS. Thêm một đường ghi thứ hai chỉ để tiết kiệm vài dòng là tự chuốc lấy
 * hai chỗ phải sửa mỗi lần Base đổi.
 */
import { useState } from 'react';
import { ArrowLeftIcon } from '@/components/AppShellIcons';
import KhoOrderView from '@/components/KhoOrderView';
import KhoHandoverForm, { type KhoHandoverValues } from '@/components/KhoHandoverForm';
import { useAdminInfo } from '@/config/adminSession';
import { useKhoBoardData } from '@/hooks/useKhoBoardData';
import { useWarehouseOrderClaims } from '@/hooks/useWarehouseOrderClaims';
import { useWarehouseOrders } from '@/hooks/useWarehouseOrders';
import { useKhoHandoverData } from '@/hooks/useKhoHandoverData';
import { staffActionWebhookUrl, toRuntimeConfig, useLarkSettings } from '@/config/larkSettings';
import { uploadNghiemThuImage } from '@/services/larkUpload';
import { sendStaffAction } from '@/services/staffActionWebhook';
import SleepOverlay from '@/components/SleepOverlay';
import { useGuestSimulation } from '@/guest/GuestSimulationContext';

type Tab = 'handover' | 'board';

export default function KhoAppPage({
  onChangeDesk,
  onLogout,
  onGuestBack,
  guestMode = false,
  guestRole,
}: {
  /** Chỉ có khi tài khoản còn chỗ khác trong roster (vd vừa KHO1 vừa bàn TV4). */
  onChangeDesk?: () => void;
  onLogout?: () => void;
  onGuestBack?: () => void;
  guestMode?: boolean;
  guestRole?: string;
}) {
  const session = useAdminInfo();
  const settings = useLarkSettings();
  const guestSimulation = useGuestSimulation();
  const [tab, setTab] = useState<Tab>('handover');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);

  const { staffByDesk, loading, error: dataError, lastUpdated, isMock, refresh } =
    useKhoHandoverData(guestMode);
  // Bảng kanban chỉ tải khi thật sự mở tab đó — kho thường để máy ở tab Bàn
  // giao suốt buổi, không việc gì phải map lại 36 bàn mỗi 5 giây.
  const board = useKhoBoardData(undefined, tab === 'board', guestMode);
  const liveClaims = useWarehouseOrderClaims(toRuntimeConfig(settings).apiUrl, tab === 'board' && !guestMode);
  const liveOrders = useWarehouseOrders(toRuntimeConfig(settings).apiUrl, tab === 'board' && !guestMode);

  const webhookUrl = staffActionWebhookUrl(settings);
  const larkConnected = !isMock && !dataError && Boolean(lastUpdated);
  const guestDeskLabel = guestRole?.replace(/^Guest_/, '') || 'Kho';
  const claimedBy = guestMode ? guestRole || 'Guest_Kho' : session?.msnv || session?.username || 'Kho';
  const claimedDesk = guestMode ? guestRole || 'Guest_Kho' : session?.desk || 'Kho';
  const claimedName = guestMode ? guestRole || 'Guest_Kho' : session?.name || session?.username || 'Kho';
  const claimedMsnv = guestMode ? guestRole || 'Guest_Kho' : session?.msnv || session?.username || 'Kho';
  const claims = guestMode ? guestSimulation?.orderClaims ?? {} : liveClaims.claims;
  const orders = guestMode ? guestSimulation?.orders ?? [] : liveOrders.orders;
  const claimOrder = guestMode
    ? async (claim: Parameters<NonNullable<typeof guestSimulation>['claimOrder']>[0]) => guestSimulation?.claimOrder(claim) ?? false
    : liveClaims.claim;
  const claimAllOrders = guestMode
    ? async (claimsToClaim: Parameters<NonNullable<typeof guestSimulation>['claimAllOrders']>[0]) => guestSimulation?.claimAllOrders(claimsToClaim) ?? false
    : liveClaims.claimAll;

  const submit = async (values: KhoHandoverValues) => {
    if (sending) return;
    setError(null);
    setOkMessage(null);
    setSending(true);
    try {
      if (guestMode) {
        setOkMessage(`Thành công · mô phỏng bàn giao cho ${values.deskCode}.`);
        setSending(false);
        return;
      }
      // Upload TUẦN TỰ như đường Hoàn tất — sóng hội trường hay nghẽn, bắn
      // cùng lúc dễ timeout cả loạt và không biết đứt ở ảnh thứ mấy.
      const tokens: string[] = [];
      for (const [i, file] of values.anh.entries()) {
        try {
          tokens.push(await uploadNghiemThuImage(file));
        } catch (err) {
          setError(
            `Upload ảnh ${i + 1}/${values.anh.length} thất bại: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
          return;
        }
      }

      const staff = staffByDesk.get(values.deskCode);
      await sendStaffAction(webhookUrl, {
        action: 'ban_giao',
        trangThai: 'Bàn giao kho',
        // Bàn giao ghi theo NGƯỜI NHẬN, không theo khách (bỏ STT 2026-08-19
        // theo yêu cầu user) — worker bỏ qua key rỗng nên 2 cột này không bị
        // ghi đè bằng chuỗi rỗng.
        stt: '',
        hoTen: '',
        // Bàn NHẬN máy — lấy từ QR, không phải bàn của kho.
        maBan: values.deskCode,
        // `Submit by` = người bấm nút, tức tài khoản kho đang đăng nhập.
        msnv: session?.msnv || session?.username || '',
        // Không ghi `Loại 2` — xem `StaffActionPayload.phanLoai`.
        phanLoai: '',
        submitBy: session?.msnv || session?.username || '',
        thoiGian: new Date().toISOString(),
        scanQr: values.scanQr,
        ...(tokens.length ? { hinhNghiemThu: tokens } : {}),
      });
      setOkMessage(
        `Đã bàn giao cho ${values.deskCode}${staff?.name ? ` · ${staff.name}` : ''}.`,
      );
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col bg-neutral-100 pt-[env(safe-area-inset-top)] text-neutral-800"><SleepOverlay />
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto w-full max-w-[430px] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-black leading-none text-neutral-900">{guestMode ? guestDeskLabel : 'Kho'}</h1>
              <p className="mt-0.5 truncate text-sm text-neutral-500">
                {session?.desk ? `${session.desk} · ` : ''}
                {session?.name || session?.username || 'Nhân viên kho'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {onChangeDesk && (
                <button
                  type="button"
                  onClick={onChangeDesk}
                  aria-label="Quay lại chọn khu vực"
                  title="Quay lại chọn khu vực"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 transition-colors hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 active:bg-neutral-300"
                >
                  <ArrowLeftIcon />
                </button>
              )}
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="min-h-11 rounded-xl px-2 text-sm font-semibold text-neutral-400"
                >
                  Đăng xuất
                </button>
              )}
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2 text-[11px]">
            <span
              className={[
                'rounded-full px-2 py-0.5 font-semibold',
                guestMode || larkConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700',
              ].join(' ')}
            >
                {guestMode ? 'Guest Connected' : larkConnected ? 'Lark Connected' : 'Lark Not connected'}
            </span>
            <span className="min-w-0 flex-1 truncate text-neutral-500">
              {dataError
                ? 'Lỗi đồng bộ'
                : loading
                  ? 'Đang tải…'
                  : lastUpdated
                    ? `Cập nhật ${lastUpdated.toLocaleTimeString('vi-VN')}`
                    : '—'}
            </span>
            <button
              type="button"
              onClick={refresh}
              className="min-h-8 rounded-lg border border-neutral-300 px-2 font-semibold text-neutral-600 active:bg-neutral-100"
            >
              Làm mới
            </button>
            {guestMode && onGuestBack && (
              <button
                type="button"
                onClick={onGuestBack}
                aria-label="Quay lại chọn màn hình khách"
                title="Quay lại chọn màn hình khách"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-300 text-neutral-600 active:bg-neutral-100"
              >
                <ArrowLeftIcon className="h-4 w-4" />
              </button>
            )}
          </div>
          {dataError && (
            <p className="mt-1 truncate text-[11px] text-red-600" title={dataError}>
              {dataError}
            </p>
          )}
        </div>
      </header>

      <main className="min-h-0 flex-1">
        {tab === 'handover' ? (
          <KhoHandoverForm
            staffByDesk={staffByDesk}
            loading={loading}
            busy={sending}
            error={error}
            okMessage={okMessage}
            onSubmit={submit}
          />
        ) : (
          <div className="px-2 py-2">
            <KhoOrderView
              desks={board.desks.filter((desk) => desk.cluster === 'consult')}
              claims={claims}
              claimedBy={claimedBy}
              claimedDesk={claimedDesk}
              claimedName={claimedName}
              claimedMsnv={claimedMsnv}
              onClaim={claimOrder}
              onClaimAll={claimAllOrders}
              inboxOrders={orders}
            />
          </div>
        )}
      </main>

      <nav className="sticky bottom-0 z-30 flex border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)]">
        {(
          [
            { key: 'handover', label: 'Bàn giao' },
            { key: 'board', label: 'Bảng kho' },
          ] as Array<{ key: Tab; label: string }>
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className={[
              'min-h-14 flex-1 text-sm font-bold',
              tab === t.key ? 'text-brand' : 'text-neutral-400',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
