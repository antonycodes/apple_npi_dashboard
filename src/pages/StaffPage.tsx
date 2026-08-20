/**
 * StaffPage — giao diện ĐIỆN THOẠI cho nhân viên TV / TC / BK.
 * Chuẩn thiết kế: iPhone 17 (402 × 874 pt).
 *
 * **2 chế độ** (2026-08-12, yêu cầu user):
 *   - `lockedDeskId` (link riêng từng bàn: `#/tv4`, `#/tc1`, `#/bk2`) — bản của
 *     NHÂN VIÊN: mở đúng 1 bàn, KHÔNG có chọn/đổi bàn, chỉ xem và bấm 2 nút.
 *   - không có prop (`#/nv`) — bản của ADMIN/điều phối tổng: chọn xem bàn bất
 *     kỳ, đổi qua lại, và copy link riêng của bàn đang xem để gửi cho NV.
 *
 * Dữ liệu tự làm mới 5 giây/lần qua proxy (`useStaffDeskData`, chu kỳ chốt
 * cứng ở `larkSettings.toRuntimeConfig`). Link riêng do admin copy có kèm
 * `?api=…` nên máy NV mở 1 lần là tự chuyển sang dữ liệu thật — xem
 * `config/staffLink.ts`.
 *
 * Đăng nhập: bản admin (`#/nv`) dùng mật khẩu `ADMIN_PASSWORD`; link riêng
 * từng bàn dùng `STAFF_PASSWORD`. Bỏ qua khi đang
 * chạy dữ liệu mẫu hoặc chưa cấu hình API URL — lúc đó `/admin/login` chưa tồn
 * tại nên bắt đăng nhập chỉ khiến máy bị khoá cứng.
 *
 * Trang này KHÔNG đụng tới dashboard điều phối hay màn hình STT: hook/mapper
 * riêng (`useStaffDeskData` + `staffMapper`), đúng quy ước sẵn có của repo.
 */
import { useEffect, useState } from 'react';
import AdminLoginForm from '@/components/AdminLoginForm';
import { ArrowLeftIcon } from '@/components/AppShellIcons';
import StaffDeskPicker from '@/components/StaffDeskPicker';
import StaffDeskScreen from '@/components/StaffDeskScreen';
import { adminSessionStore, useAdminInfo, useAdminToken } from '@/config/adminSession';
import { CLUSTER_LABELS } from '@/config/layoutConfig';
import { useLarkSettings } from '@/config/larkSettings';
import { applyLinkConfigFromHash, deskLinkFor } from '@/config/staffLink';
import { staffDeskStore, useStaffDeskId } from '@/config/staffDeskIdentity';
import { useStaffDeskData } from '@/hooks/useStaffDeskData';

/** Khung chung: nền sáng, cột hẹp canh giữa, chừa safe area trên cùng. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-neutral-100 pt-[env(safe-area-inset-top)] text-neutral-800">{children}</div>
  );
}

/** Hàng "link riêng của bàn này" — chỉ hiện ở bản admin (`#/nv`). */
function ShareLinkRow({ deskId }: { deskId: string }) {
  const [copied, setCopied] = useState(false);
  const link = deskLinkFor(deskId);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Trình duyệt chặn clipboard (http, quyền…) — mở prompt để copy tay.
      window.prompt('Copy link gửi cho nhân viên:', link);
    }
  };

  return (
    <div className="mt-2 flex items-center gap-2 rounded-xl bg-neutral-100 px-2 py-1.5">
      <span className="min-w-0 flex-1 truncate text-[11px] text-neutral-500" title={link}>
        {link}
      </span>
      <button
        type="button"
        onClick={copy}
        className="min-h-8 shrink-0 rounded-lg border border-neutral-300 bg-white px-2 text-[11px] font-semibold text-neutral-600 active:bg-neutral-100"
      >
        {copied ? 'Đã copy' : 'Copy link NV'}
      </button>
    </div>
  );
}

export default function StaffPage({
  lockedDeskId,
  onChangeDesk,
  onLogout,
}: {
  lockedDeskId?: string;
  /**
   * Chỉ truyền từ app gộp (`#/app`) khi tài khoản có NHIỀU bàn — hiện nút "Đổi
   * bàn" quay về bước chọn bàn của shell. Link riêng từng bàn không có nút này:
   * bàn đã nằm trong URL, đổi được thì hết là "link riêng".
   */
  onChangeDesk?: () => void;
  /** Chỉ truyền từ app gộp — link riêng từng bàn không cho thoát. */
  onLogout?: () => void;
}) {
  const token = useAdminToken();
  const session = useAdminInfo();
  const settings = useLarkSettings();
  const savedDeskId = useStaffDeskId();
  const [picking, setPicking] = useState(false);

  // Link NV có thể kèm `?api=…` — nhận cấu hình rồi dọn URL, chạy 1 lần/đời máy.
  useEffect(() => {
    applyLinkConfigFromHash();
  }, []);

  const locked = Boolean(lockedDeskId);
  const deskId = lockedDeskId ?? savedDeskId;
  const { view, loading, error, lastUpdated, isMock, refresh } = useStaffDeskData(deskId);
  const larkConnected = !isMock && !error && Boolean(lastUpdated);

  // ── 1. Đăng nhập (admin không mật khẩu; nhân viên có mật khẩu) ───────────
  const loginPossible = Boolean(settings.apiUrl.trim()) && !settings.useMock;
  const sessionMatchesPage = locked
    ? session?.role === 'staff' && session.desk === lockedDeskId
    : session?.role === 'admin';
  if (loginPossible && (!token || !sessionMatchesPage)) {
    return (
      <Shell>
        <div className="mx-auto w-full max-w-[430px] px-4 py-8">
          <h1 className="text-2xl font-black text-neutral-900">NPI Event</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {locked ? `Màn hình bàn ${deskId}` : 'Màn hình nhân viên · Tư vấn / Thu cũ / Backup'}
          </p>
          <div className="mt-6 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
            <AdminLoginForm
              fixedUsername={locked ? lockedDeskId : 'admin'}
              size="lg"
              submitLabel="Đăng nhập"
            />
          </div>
        </div>
      </Shell>
    );
  }

  // ── 2. Chọn bàn — CHỈ bản admin (`#/nv`) mới có bước này ──────────────────
  if (!locked && (!deskId || picking)) {
    return (
      <Shell>
        <StaffDeskPicker
          current={deskId}
          onPick={(id) => {
            staffDeskStore.set(id);
            setPicking(false);
          }}
          onCancel={() => setPicking(false)}
        />
      </Shell>
    );
  }

  // ── 3. Màn hình bàn ──────────────────────────────────────────────────────
  return (
    <Shell>
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto w-full max-w-[430px] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black leading-none text-neutral-900">
                  {view?.label ?? deskId}
                </span>
                <span className="truncate text-sm text-neutral-500">
                  {view ? CLUSTER_LABELS[view.cluster] : 'Bàn không hợp lệ'}
                </span>
              </div>
              <p className="mt-0.5 truncate text-sm font-semibold text-neutral-600">
                {view?.staffName ?? 'Chưa có tên NV'}
              </p>
            </div>
            {(!locked || onChangeDesk) && (
              <button
                type="button"
                onClick={() => (onChangeDesk ? onChangeDesk() : setPicking(true))}
                aria-label="Quay lại chọn khu vực"
                title="Quay lại chọn khu vực"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 transition-colors hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 active:bg-neutral-300"
              >
                <ArrowLeftIcon />
              </button>
            )}
          </div>

          <div className="mt-2 flex items-center gap-2 text-[11px]">
            <span
              className={[
                'rounded-full px-2 py-0.5 font-semibold',
                larkConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700',
              ].join(' ')}
            >
              {larkConnected ? 'Lark Connected' : 'Lark Not connected'}
            </span>
            <span className="min-w-0 flex-1 truncate text-neutral-500">
              {error
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
            {token && (!locked || onLogout) && (
              <button
                type="button"
                onClick={() => (onLogout ? onLogout() : adminSessionStore.clear())}
                className="min-h-8 rounded-lg px-2 font-semibold text-neutral-400"
              >
                Đăng xuất
              </button>
            )}
          </div>
          {error && (
            <p className="mt-1 truncate text-[11px] text-red-600" title={error}>
              {error}
            </p>
          )}
          {!locked && view && <ShareLinkRow deskId={view.id} />}
        </div>
      </header>

      {view ? (
        <StaffDeskScreen view={view} />
      ) : (
        <div className="mx-auto w-full max-w-[430px] px-4 py-10 text-center">
          <p className="text-sm text-neutral-500">
            {loading ? 'Đang tải dữ liệu bàn…' : `Không tìm thấy bàn “${deskId}” trên sơ đồ.`}
          </p>
          {(!locked || onChangeDesk) && (
            <button
              type="button"
              onClick={() => (onChangeDesk ? onChangeDesk() : setPicking(true))}
              className="mt-4 min-h-[52px] w-full rounded-2xl bg-brand text-base font-bold text-white"
            >
              Chọn lại bàn
            </button>
          )}
        </div>
      )}
    </Shell>
  );
}
