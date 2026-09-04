/**
 * AppPage — "NPI-CPS All in One" (`/app`): MỘT link phát cho toàn bộ nhân
 * sự, đăng nhập một lần, app tự mở đúng màn hình của người đang cầm máy.
 *
 * Luồng: đăng nhập (`AppLogin`) → worker trả vai trò + danh sách bàn từ
 * `Master_DS` → shell này rẽ nhánh:
 *   - `staff` 1 bàn  → thẳng màn hình bàn đó (`StaffPage`);
 *   - `staff` ≥2 bàn → hỏi chọn bàn 1 lần, nhớ trong phiên, có nút đổi lại;
 *   - `kho`          → module kho (`KhoAppPage`): bàn giao máy + bảng kho;
 *   - `admin`        → danh mục các màn hình quản trị và vận hành chính.
 *
 * **Các route cũ không đụng tới**: dashboard điều phối (`#/`), 3 màn hình STT
 * chiếu ngoài hội trường và `/khoview` vẫn mở-là-chạy, KHÔNG qua cổng đăng
 * nhập (chốt với user 2026-08-19) — chúng chạy trên máy chiếu/máy điều phối
 * dựng sẵn từ sáng, bắt đăng nhập ở đó chỉ tạo thêm một thứ có thể hỏng.
 */
import { useState } from 'react';
import AppLogin from '@/components/AppLogin';
import { ArrowLeftIcon, ChevronRightIcon, LogOutIcon } from '@/components/AppShellIcons';
import DashboardPage from '@/pages/DashboardPage';
import KhoAppPage from '@/pages/KhoAppPage';
import StaffPage from '@/pages/StaffPage';
import CheckinPage from '@/pages/CheckinPage';
import { adminSessionStore, useAdminInfo, type Workspace } from '@/config/adminSession';
import { useLarkSettings } from '@/config/larkSettings';
import { SITE_BRAND } from '@/config/siteBrand';

/** Khung chung: nền sáng, cột hẹp canh giữa, chừa safe area trên cùng. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-[#f5f5f7] pt-[env(safe-area-inset-top)] text-neutral-800">
      {children}
    </div>
  );
}

/** Nhãn nhóm khi cột `Loại` bỏ trống — suy từ tiền tố mã chỗ. */
function loaiLabel(ws: Workspace): string {
  if (ws.loai.trim()) return ws.loai.trim();
  if (ws.role === 'kho') return 'Kho';
  if (ws.role === 'dieuphoi') return 'Điều phối';
  return 'Bàn phục vụ';
}

/**
 * Bước chọn CHỖ LÀM VIỆC — chỉ liệt kê chỗ của chính tài khoản đang đăng nhập.
 *
 * Không phải "chọn bàn" nữa (đổi 2026-08-19, sau khi đọc roster thật): một
 * MSNV có thể vừa có bàn TV4, vừa có TC4/BK4, vừa có dòng KHO1 — mỗi chỗ mở ra
 * một màn hình khác hẳn, nên phải hiện cả nhóm để chọn chứ không chỉ mã bàn.
 */
function DeskChoice({
  workspaces,
  current,
  name,
  onPick,
  onCancel,
}: {
  workspaces: Workspace[];
  current: string;
  name: string;
  onPick: (desk: string) => void;
  onCancel?: () => void;
}) {
  return (
    <Shell>
      <main className="mx-auto flex min-h-[calc(100dvh-env(safe-area-inset-top))] w-full max-w-[430px] flex-col px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-8">
        <div>
          <img
            src="/cellphones-logo.png"
            alt="CellphoneS"
            className="h-11 w-auto max-w-[174px]"
          />
          {name && (
            <p className="mt-6 truncate text-[15px] font-bold text-neutral-500">{name}</p>
          )}
          <h1 className={[
            'text-[30px] font-black leading-tight tracking-[-0.025em] text-neutral-950',
            name ? 'mt-1' : 'mt-6',
          ].join(' ')}>
            Chọn khu vực
          </h1>
        </div>

        <div className="mt-7 space-y-3">
          {workspaces.map((ws) => (
            <button
              key={ws.desk}
              type="button"
              onClick={() => onPick(ws.desk)}
              className={[
                'group flex min-h-[72px] w-full items-center gap-4 rounded-2xl px-4 text-left transition-[transform,background-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 active:scale-[0.985]',
                ws.desk === current
                  ? 'bg-neutral-900 text-white shadow-[0_10px_30px_rgba(17,24,39,0.16)]'
                  : 'bg-white text-neutral-900 shadow-[0_8px_24px_rgba(17,24,39,0.06)] hover:bg-neutral-50',
              ].join(' ')}
            >
              <span
                className={[
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-black',
                  ws.desk === current ? 'bg-white/15 text-white' : 'bg-neutral-100 text-neutral-700',
                ].join(' ')}
              >
                {ws.desk}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-bold">{loaiLabel(ws)}</span>
                <span className={ws.desk === current ? 'text-xs text-white/65' : 'text-xs text-neutral-400'}>
                  Khu vực {ws.desk}
                </span>
              </span>
              <ChevronRightIcon className={ws.desk === current ? 'h-5 w-5 text-white/70' : 'h-5 w-5 text-neutral-300 group-hover:text-neutral-500'} />
            </button>
          ))}
        </div>

        <div className="mt-auto pt-8">
          {onCancel && current && (
            <button
              type="button"
              onClick={onCancel}
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 text-base font-bold text-neutral-700 shadow-[0_6px_20px_rgba(17,24,39,0.05)] transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 active:bg-neutral-100"
            >
              <ArrowLeftIcon />
              Giữ khu vực {current}
            </button>
          )}
          <button
            type="button"
            onClick={() => adminSessionStore.clear()}
            className="mt-3 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl px-4 text-base font-bold text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 active:bg-red-100"
          >
            <LogOutIcon />
            Đăng xuất
          </button>
        </div>
      </main>
    </Shell>
  );
}

/**
 * Thanh nổi góc dưới — danh tính + đổi chỗ + thoát, cho những màn hình KHÔNG
 * phải của app gộp (dashboard điều phối) nên không có sẵn chỗ đặt hai nút này.
 *
 * Cố ý nổi lên trên thay vì chèn thêm một header: dashboard là lưới cao đúng
 * bằng màn hình, thêm một dòng ở trên là đẩy sơ đồ 36 bàn tràn xuống dưới.
 */
function SessionBar({
  label,
  onChangeDesk,
  onLogout,
}: {
  label: string;
  onChangeDesk?: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="fixed bottom-3 left-3 z-50 flex items-center gap-2 rounded-full border border-neutral-300 bg-white/95 px-3 py-1.5 shadow-lg backdrop-blur">
      <span className="max-w-[40vw] truncate text-xs font-semibold text-neutral-600">{label}</span>
      {onChangeDesk && (
        <button
          type="button"
          onClick={onChangeDesk}
          aria-label="Quay lại chọn khu vực"
          title="Quay lại chọn khu vực"
          className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </button>
      )}
      <button
        type="button"
        onClick={onLogout}
        className="min-h-8 rounded-full bg-neutral-800 px-3 text-xs font-semibold text-white hover:opacity-90"
      >
        Đăng xuất
      </button>
    </div>
  );
}

/** Danh mục của admin — chỉ giữ các màn hình quản trị/vận hành chính. */
function AdminHome({ name }: { name: string }) {
  const links: Array<{ href: string; label: string }> = [
    { href: '/dashboard', label: 'Dashboard Admin' },
    { href: '/check-in', label: 'Check-in khách' },
    { href: '/settings', label: 'Cài đặt' },
  ];

  return (
    <Shell>
      <div className="mx-auto w-full max-w-[430px] px-4 py-8">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-black text-neutral-900">{SITE_BRAND}</h1>
            <p className="mt-1 text-sm text-neutral-500">{name || 'Quản trị'} · toàn quyền</p>
          </div>
          <button
            type="button"
            onClick={() => adminSessionStore.clear()}
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-white px-3 text-sm font-bold text-red-600 shadow-[0_6px_18px_rgba(17,24,39,0.06)] transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 active:bg-red-100"
          >
            <LogOutIcon className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>

        <div className="mt-5 space-y-2">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="block rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-sm active:bg-neutral-50"
            >
              <span className="block text-base font-bold text-neutral-800">{l.label}</span>
            </a>
          ))}
        </div>
      </div>
    </Shell>
  );
}

export default function AppPage() {
  const session = useAdminInfo();
  const settings = useLarkSettings();
  const [picking, setPicking] = useState(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('choose') === '1';
  });
  // Có phiên thì rẽ nhánh NGAY, trước cả kiểm tra cấu hình: phiên "chế độ thử"
  // bên dưới cũng đi qua đúng đường này, nên giao diện xem trước là giao diện
  // thật chứ không phải một bản mô phỏng riêng.
  if (session) {
    if (session.role === 'admin') {
      return <AdminHome name={session.name} />;
    }

    if (session.role === 'checkin') {
      return <CheckinPage />;
    }

    // Chưa chọn chỗ (tài khoản nhiều chỗ), hoặc đang bấm đổi chỗ.
    if (!session.desk || picking) {
      return (
        <DeskChoice
          workspaces={session.workspaces}
          current={session.desk}
          name={session.name}
          onPick={(desk) => {
            adminSessionStore.chooseDesk(desk);
            setPicking(false);
          }}
          onCancel={picking ? () => setPicking(false) : undefined}
        />
      );
    }

    const doiCho = session.workspaces.length > 1 ? () => setPicking(true) : undefined;

    if (session.role === 'kho') {
      return <KhoAppPage onChangeDesk={doiCho} onLogout={() => adminSessionStore.clear()} />;
    }

    // Điều phối (DP1–DP4): mở thẳng dashboard điều phối — đúng màn hình họ vẫn
    // đang dùng, chỉ khác là vào qua app gộp thay vì link riêng.
    if (session.role === 'dieuphoi') {
      return (
        <>
          <DashboardPage />
          <SessionBar
            label={`${session.desk} · ${session.name || session.username}`}
            onChangeDesk={doiCho}
            onLogout={() => adminSessionStore.clear()}
          />
        </>
      );
    }

    return (
      <StaffPage
        lockedDeskId={session.desk}
        onChangeDesk={doiCho}
        onLogout={() => adminSessionStore.clear()}
      />
    );
  }

  // Chưa cấu hình worker (hoặc đang chạy dữ liệu mẫu) thì `/admin/login` không
  // tồn tại — bắt đăng nhập ở đó chỉ khiến máy bị khoá cứng với một lỗi mạng
  // khó hiểu. Nói thẳng nguyên nhân và mở đường sang Cài đặt.
  const loginPossible = Boolean(settings.apiUrl.trim());
  if (!loginPossible) {
    return (
      <Shell>
        <div className="mx-auto w-full max-w-[430px] px-4 py-8">
          <h1 className="text-2xl font-black text-neutral-900">{SITE_BRAND}</h1>
          <p className="mt-1 text-sm text-neutral-500">All in One</p>
          <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm font-semibold text-amber-800">
              Máy này chưa có API URL của worker nên chưa đăng nhập được.
            </p>
            <a
              href="/settings"
              className="mt-4 block min-h-14 rounded-2xl bg-brand pt-4 text-center text-base font-bold text-white"
            >
              Mở Cài đặt
            </a>
            <button
              type="button"
              onClick={() => { window.location.href = '/guest'; }}
              className="mt-3 min-h-12 w-full rounded-2xl border border-neutral-300 bg-white text-base font-bold text-neutral-700 transition-colors hover:bg-neutral-50"
            >
              Đăng nhập với tư cách khách
            </button>
          </div>

          <div className="mt-4 space-y-2">
            <a
              href="/khoview"
              className="block rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-center text-sm font-semibold text-neutral-600"
            >
              Xem bảng kho (không cần đăng nhập)
            </a>
            <a
              href="/dashboard"
              className="block rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-center text-sm font-semibold text-neutral-600"
            >
              Về dashboard điều phối
            </a>
          </div>
        </div>
      </Shell>
    );
  }

  return <AppLogin onGuest={() => { window.location.href = '/guest'; }} />;
}
