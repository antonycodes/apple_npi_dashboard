/**
 * App — hash router for Main, Tư vấn, Thu cũ, Backup, màn hình nhân viên
 * (`#/nv` + link riêng từng bàn `#/tv4`) và Settings.
 *
 * Các màn hình vận hành đi qua `#/app`: Điều phối phải đăng nhập, còn khách
 * chỉ được xem ở chế độ read-only.
 *
 * **App gộp `#/app`** (2026-08-19, yêu cầu user — nay là "NPI-CPS All in One"):
 * MỘT link cho toàn bộ nhân sự, đăng nhập bằng tài khoản trong `Master_DS`
 * (`NPI_AIO_User`/`NPI_AIO_Pass`) rồi tự mở đúng màn hình theo vai trò — nhân
 * viên bàn, hoặc kho. Mọi route bên dưới GIỮ NGUYÊN, kể cả link riêng từng bàn
 * đã phát ra ngoài; dashboard và 3 màn hình STT vẫn mở-là-chạy không đăng nhập.
 *
 * **Link riêng từng bàn** (2026-08-12, yêu cầu user): mọi hash dạng mã bàn —
 * `#/tv4`, `#/tc1`, `#/kt1` (alias của TC1), `#/bk2` — mở thẳng màn hình điện
 * thoại của ĐÚNG bàn đó, khoá luôn, không có nút đổi bàn. `#/nv` giữ nguyên là
 * bản cho admin/điều phối: xem được mọi bàn và copy link gửi cho từng NV.
 * Regex khớp TOÀN CHUỖI nên không đụng `#/tuvanview` (cũng bắt đầu bằng "tv").
 */
import { useEffect, useState } from 'react';
import { applyLinkConfigFromHash, hashPath } from './config/staffLink';
import { useSharedSettingsSync } from './hooks/useSharedSettingsSync';
import { normalizeDeskCode } from './services/larkMapper';
import AppPage from './pages/AppPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import QueueBoardPage from './pages/QueueBoardPage';
import KhoBoardPage from './pages/KhoBoardPage';
import StaffPage from './pages/StaffPage';

type Route =
  | {
      kind:
        | 'settings'
        | 'dashboard'
        | 'tuvanview'
        | 'kythuatview'
        | 'backupview'
        | 'khoview'
        | 'staff'
        | 'app';
    }
  | { kind: 'desk'; deskId: string };

/** `#/tv4`, `#/tc10`, `#/kt2`, `#/bk7` — mã bàn đứng 1 mình. */
const DESK_ROUTE = /^(tv|tc|kt|bk)\d+$/i;

function useHashRoute(): Route {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  const path = hashPath(hash);
  // Direct URL production `https://.../app` phải mở cùng màn hình với
  // `/#/app`. Vercel rewrite chỉ giúp trả `index.html`; router phía client vẫn
  // cần nhận diện pathname, nếu không hash rỗng sẽ rơi về Dashboard.
  const pathname = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  // Hash route phải được xét trước pathname `/app`: AppHome dùng các link
  // `#/settings`... và vẫn có thể đang nằm tại URL `/app`.
  if (path.startsWith('admin')) return { kind: 'app' };
  if (path.startsWith('settings')) return { kind: 'settings' };
  if (path === 'mock') return { kind: 'dashboard' };
  if (path.startsWith('tuvanview')) return { kind: 'tuvanview' };
  if (path.startsWith('kythuatview') || path.startsWith('thucuvview')) return { kind: 'kythuatview' };
  if (path.startsWith('backupview')) return { kind: 'backupview' };
  if (path.startsWith('khoview')) return { kind: 'khoview' };
  if (pathname === 'app' || pathname.startsWith('app/')) return { kind: 'app' };
  // App gộp — MỘT link phát cho toàn bộ nhân sự, xem `pages/AppPage.tsx`.
  // `startsWith` chứ không phải `===`: link chép tay hay dán từ chat rất hay
  // dính dấu `/` ở cuối (`#/app/`), mà rơi khỏi route này thì im lặng nhảy về
  // dashboard — đúng kiểu lỗi khó đoán nhất cho người dùng cuối.
  if (path.startsWith('app')) return { kind: 'app' };
  // Bản cho admin tổng — chọn/đổi bàn được. `#/staff` giữ cho ai gõ tiếng Anh.
  if (path === 'nv' || path === 'staff') return { kind: 'staff' };
  if (DESK_ROUTE.test(path)) {
    // Dùng chung `normalizeDeskCode` với mapper để "kt1" ra đúng mã join "TC1".
    const deskId = normalizeDeskCode(path);
    if (deskId) return { kind: 'desk', deskId };
  }
  return { kind: 'dashboard' };
}

export default function App() {
  // Phải nhận ?api= trước khi hook đồng bộ cấu hình chung chạy lần đầu.
  // Nếu không, máy NV mới mở link sẽ chưa biết URL Worker để gọi /config/app.
  applyLinkConfigFromHash();
  const route = useHashRoute();
  // Kéo cấu hình Lark dùng chung từ worker (admin đổi 1 lần, mọi máy theo) —
  // đặt ở đây để MỌI màn hình đều được áp, kể cả điện thoại nhân viên.
  useSharedSettingsSync();
  if (route.kind === 'settings') return <SettingsPage />;
  if (route.kind === 'tuvanview') return <QueueBoardPage cluster="consult" />;
  if (route.kind === 'kythuatview') return <QueueBoardPage cluster="tradein" />;
  if (route.kind === 'backupview') return <QueueBoardPage cluster="backup" />;
  if (route.kind === 'khoview') return <KhoBoardPage />;
  if (route.kind === 'app') return <AppPage />;
  if (route.kind === 'staff') return <StaffPage />;
  if (route.kind === 'desk') return <StaffPage lockedDeskId={route.deskId} />;
  return <DashboardPage />;
}
