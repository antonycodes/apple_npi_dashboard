/**
 * AppPage — "NPI-APPLE All in One" (`#/app`): MỘT link phát cho toàn bộ nhân
 * sự, đăng nhập một lần, app tự mở đúng màn hình của người đang cầm máy.
 *
 * Luồng: đăng nhập (`AppLogin`) → worker trả vai trò + danh sách bàn từ
 * `Master_DS` → shell này rẽ nhánh:
 *   - `staff` 1 bàn  → thẳng màn hình bàn đó (`StaffPage`);
 *   - `staff` ≥2 bàn → hỏi chọn bàn 1 lần, nhớ trong phiên, có nút đổi lại;
 *   - `kho`          → module kho (`KhoAppPage`): bàn giao máy + bảng kho;
 *   - `admin`        → danh mục mở mọi màn hình cũ.
 *
 * **Các route cũ không đụng tới**: dashboard điều phối (`#/`), 3 màn hình STT
 * chiếu ngoài hội trường và `#/khoview` vẫn mở-là-chạy, KHÔNG qua cổng đăng
 * nhập (chốt với user 2026-08-19) — chúng chạy trên máy chiếu/máy điều phối
 * dựng sẵn từ sáng, bắt đăng nhập ở đó chỉ tạo thêm một thứ có thể hỏng.
 */
import { useState } from 'react';
import AppLogin from '@/components/AppLogin';
import DashboardPage from '@/pages/DashboardPage';
import KhoAppPage from '@/pages/KhoAppPage';
import StaffPage from '@/pages/StaffPage';
import { adminSessionStore, useAdminInfo, type Workspace } from '@/config/adminSession';
import { useLarkSettings } from '@/config/larkSettings';

/** Khung chung: nền sáng, cột hẹp canh giữa, chừa safe area trên cùng. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-neutral-100 pt-[env(safe-area-inset-top)] text-neutral-800">
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
      <div className="mx-auto w-full max-w-[430px] px-4 py-8">
        <h1 className="text-2xl font-black text-neutral-900">Chọn khu vực</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {name ? `${name} · ` : ''}tài khoản này có {workspaces.length} khu vực trong Master_DS.
        </p>
        <div className="mt-5 space-y-2">
          {workspaces.map((ws) => (
            <button
              key={ws.desk}
              type="button"
              onClick={() => onPick(ws.desk)}
              className={[
                'flex min-h-[64px] w-full items-center justify-between gap-3 rounded-2xl border-2 px-4 text-left active:scale-[0.99]',
                ws.desk === current
                  ? 'border-brand bg-brand text-white'
                  : 'border-neutral-200 bg-white text-neutral-800',
              ].join(' ')}
            >
              <span className="text-xl font-bold">{ws.desk}</span>
              <span
                className={[
                  'text-sm font-semibold',
                  ws.desk === current ? 'text-white/80' : 'text-neutral-500',
                ].join(' ')}
              >
                {loaiLabel(ws)}
              </span>
            </button>
          ))}
        </div>
        {onCancel && current && (
          <button
            type="button"
            onClick={onCancel}
            className="mt-5 min-h-[52px] w-full rounded-2xl border border-neutral-300 bg-white text-base font-semibold text-neutral-600"
          >
            Huỷ, giữ {current}
          </button>
        )}
        <button
          type="button"
          onClick={() => adminSessionStore.clear()}
          className="mt-3 min-h-[52px] w-full rounded-2xl text-base font-semibold text-neutral-400"
        >
          Đăng nhập tài khoản khác
        </button>
      </div>
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
          className="min-h-8 rounded-full border border-neutral-300 px-3 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
        >
          Đổi khu vực
        </button>
      )}
      <button
        type="button"
        onClick={onLogout}
        className="min-h-8 rounded-full bg-neutral-800 px-3 text-xs font-semibold text-white hover:opacity-90"
      >
        Thoát
      </button>
    </div>
  );
}

/** Danh mục của admin — mở thẳng các màn hình sẵn có, mỗi cái một tab mới. */
function AdminHome({ name }: { name: string }) {
  const links: Array<{ href: string; label: string; desc: string }> = [
    { href: '#/', label: 'Dashboard điều phối', desc: 'Sơ đồ 36 bàn, điều phối khách' },
    { href: '#/tuvanview', label: 'Màn hình STT · Tư vấn', desc: 'Bản chiếu ngoài hội trường' },
    { href: '#/kythuatview', label: 'Màn hình STT · Thu cũ', desc: 'Bản chiếu ngoài hội trường' },
    { href: '#/backupview', label: 'Màn hình STT · Backup', desc: 'Bản chiếu ngoài hội trường' },
    { href: '#/khoview', label: 'Bảng kho', desc: 'Kanban 36 bàn cho màn hình lớn' },
    { href: '#/nv', label: 'Màn hình nhân viên', desc: 'Xem bàn bất kỳ, copy link cho NV' },
    { href: '#/settings', label: 'Cài đặt', desc: 'Kết nối Lark, tên cột, webhook' },
    { href: '#/admin', label: 'Quản trị', desc: 'Danh sách điều phối viên' },
  ];

  return (
    <Shell>
      <div className="mx-auto w-full max-w-[430px] px-4 py-8">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-black text-neutral-900">NPI-APPLE</h1>
            <p className="mt-1 text-sm text-neutral-500">{name || 'Quản trị'} · toàn quyền</p>
          </div>
          <button
            type="button"
            onClick={() => adminSessionStore.clear()}
            className="min-h-11 shrink-0 rounded-xl border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-600 active:bg-neutral-100"
          >
            Thoát
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
              <span className="block text-xs text-neutral-500">{l.desc}</span>
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
  const [picking, setPicking] = useState(false);

  // Có phiên thì rẽ nhánh NGAY, trước cả kiểm tra cấu hình: phiên "chế độ thử"
  // bên dưới cũng đi qua đúng đường này, nên giao diện xem trước là giao diện
  // thật chứ không phải một bản mô phỏng riêng.
  if (session) {
    if (session.role === 'admin') {
      return <AdminHome name={session.name} />;
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
  const loginPossible = Boolean(settings.apiUrl.trim()) && !settings.useMock;
  if (!loginPossible) {
    // Phiên GIẢ cho chế độ thử: token rác là cố ý — nó chỉ mở giao diện, mọi
    // đường ghi thật đều đi qua worker và sẽ bị từ chối. Chỉ dùng khi đang
    // chạy dữ liệu mẫu.
    const demoSession = (role: 'kho' | 'staff', desk: string) => {
      adminSessionStore.set('demo', 12 * 60 * 60 * 1000, role, desk, {
        desks: [desk],
        workspaces: [{ desk, loai: role === 'kho' ? 'Kho' : 'Tư vấn', role, name: 'Chế độ thử', msnv: '' }],
        username: role === 'kho' ? 'KHO-DEMO' : desk,
        msnv: '',
        name: 'Chế độ thử',
      });
    };

    return (
      <Shell>
        <div className="mx-auto w-full max-w-[430px] px-4 py-8">
          <h1 className="text-2xl font-black text-neutral-900">NPI-APPLE</h1>
          <p className="mt-1 text-sm text-neutral-500">All in One</p>
          <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm font-semibold text-amber-800">
              {settings.useMock
                ? 'Máy này đang chạy DỮ LIỆU MẪU nên chưa có tài khoản để đăng nhập.'
                : 'Máy này chưa có API URL của worker nên chưa đăng nhập được.'}
            </p>
            <p className="mt-2 text-xs text-amber-700">
              Mở Cài đặt, điền API URL và tắt dữ liệu mẫu, hoặc mở app bằng link admin đã gửi
              (link có sẵn <code>?api=…</code>).
            </p>
            <a
              href="#/settings"
              className="mt-4 block min-h-14 rounded-2xl bg-brand pt-4 text-center text-base font-bold text-white"
            >
              Mở Cài đặt
            </a>
          </div>
          {settings.useMock && (
            <div className="mt-4 rounded-3xl border border-neutral-200 bg-white p-4">
              <h2 className="text-sm font-bold text-neutral-800">Chế độ thử</h2>
              <p className="mt-1 text-xs text-neutral-500">
                Mở đúng giao diện thật với dữ liệu mẫu để xem trước. Không đăng nhập, không ghi
                được gì vào Lark — nút xác nhận sẽ báo thiếu cấu hình.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => demoSession('kho', 'KHO1')}
                  className="min-h-12 rounded-xl bg-neutral-800 text-sm font-bold text-white"
                >
                  Thử màn Kho
                </button>
                <button
                  type="button"
                  onClick={() => demoSession('staff', 'TV1')}
                  className="min-h-12 rounded-xl bg-neutral-800 text-sm font-bold text-white"
                >
                  Thử màn bàn TV1
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 space-y-2">
            <a
              href="#/khoview"
              className="block rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-center text-sm font-semibold text-neutral-600"
            >
              Xem bảng kho (không cần đăng nhập)
            </a>
            <a
              href="#/"
              className="block rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-center text-sm font-semibold text-neutral-600"
            >
              Về dashboard điều phối
            </a>
          </div>
        </div>
      </Shell>
    );
  }

  return <AppLogin />;
}
