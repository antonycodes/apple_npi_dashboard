/**
 * App — path router for Main, Tư vấn, Thu cũ, Backup, màn hình nhân viên
 * (`/nv` + link riêng từng bàn `/tv4`) và Settings.
 *
 * Các màn hình vận hành đi qua `/app`: Điều phối phải đăng nhập, còn khách
 * chỉ được xem ở chế độ read-only.
 *
 * **App gộp `/app`** (2026-08-19, yêu cầu user — nay là "NPI-CPS All in One"):
 * MỘT link cho toàn bộ nhân sự, đăng nhập bằng tài khoản trong `Master_DS`
 * (`NPI_AIO_User`/`NPI_AIO_Pass`) rồi tự mở đúng màn hình theo vai trò — nhân
 * viên bàn, hoặc kho. Mọi route bên dưới GIỮ NGUYÊN, kể cả link riêng từng bàn
 * đã phát ra ngoài; dashboard và 3 màn hình STT vẫn mở-là-chạy không đăng nhập.
 *
 * **Link riêng từng bàn** (2026-08-12, yêu cầu user): mọi path dạng mã bàn —
 * `/tv4`, `/tc1`, `/kt1` (alias của TC1), `/bk2` — mở thẳng màn hình điện
 * thoại của ĐÚNG bàn đó, khoá luôn, không có nút đổi bàn. `/nv` giữ nguyên là
 * bản cho admin/điều phối: xem được mọi bàn và copy link gửi cho từng NV.
 * Regex khớp TOÀN CHUỖI nên không đụng `/tuvanview` (cũng bắt đầu bằng "tv").
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
import GuestPage from './pages/GuestPage';
import CheckinPage from './pages/CheckinPage';
import SmsPage from './pages/SmsPage';
import GlobalSessionBar from './components/GlobalSessionBar';

type Route =
  | {
      kind:
        | 'settings'
        | 'guest'
        | 'dashboard'
        | 'tuvanview'
        | 'thucuview'
        | 'backupview'
        | 'khoview'
        | 'checkin'
        | 'sms'
        | 'staff'
        | 'app';
    }
  | { kind: 'desk'; deskId: string };

const ROUTES_WITH_GLOBAL_SESSION_BAR = new Set<Route['kind']>([
  'dashboard',
  'sms',
  'tuvanview',
  'thucuview',
  'backupview',
  'khoview',
]);

/** `/tv4`, `/tc10`, `/kt2`, `/bk7` — mã bàn đứng 1 mình. */
const DESK_ROUTE = /^(tv|tc|kt|bk)\d+$/i;

function useAppRoute(): Route {
  const [locationKey, setLocationKey] = useState(() => `${window.location.pathname}${window.location.search}${window.location.hash}`);
  useEffect(() => {
    const onChange = () => setLocationKey(`${window.location.pathname}${window.location.search}${window.location.hash}`);
    window.addEventListener('hashchange', onChange);
    window.addEventListener('popstate', onChange);
    return () => {
      window.removeEventListener('hashchange', onChange);
      window.removeEventListener('popstate', onChange);
    };
  }, []);
  // `locationKey` buộc router cập nhật khi bấm Back/Forward. Hash vẫn được đọc
  // để không làm hỏng link cũ; link mới dùng pathname sạch như `/app`.
  void locationKey;
  const pathname = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  const legacyPath = hashPath(window.location.hash);
  const path = legacyPath || pathname;
  if (path === 'dashboard' || path === 'admin-dashboard') return { kind: 'dashboard' };
  if (path.startsWith('admin')) return { kind: 'app' };
  if (path === 'guest' || path.startsWith('guest/')) return { kind: 'guest' };
  if (path === 'check-in' || path.startsWith('check-in/')) return { kind: 'checkin' };
  if (path === 'sms' || path.startsWith('sms/')) return { kind: 'sms' };
  if (path.startsWith('settings')) return { kind: 'settings' };
  if (path === 'mock') return { kind: 'dashboard' };
  if (path.startsWith('tuvanview')) return { kind: 'tuvanview' };
  if (path.startsWith('thucuview') || path.startsWith('kythuatview') || path.startsWith('thucuvview')) {
    return { kind: 'thucuview' };
  }
  if (path.startsWith('backupview')) return { kind: 'backupview' };
  if (path.startsWith('khoview')) return { kind: 'khoview' };
  if (path.startsWith('app')) return { kind: 'app' };
  // Bản cho admin tổng — chọn/đổi bàn được. `/staff` giữ cho ai gõ tiếng Anh.
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
  const route = useAppRoute();
  // Kéo cấu hình Lark dùng chung từ worker (admin đổi 1 lần, mọi máy theo) —
  // đặt ở đây để MỌI màn hình đều được áp, kể cả điện thoại nhân viên.
  useSharedSettingsSync();
  let page: React.ReactNode;
  if (route.kind === 'settings') page = <SettingsPage />;
  else if (route.kind === 'guest') page = <GuestPage />;
  else if (route.kind === 'checkin') page = <CheckinPage />;
  else if (route.kind === 'sms') page = <SmsPage />;
  else if (route.kind === 'tuvanview') page = <QueueBoardPage cluster="consult" />;
  else if (route.kind === 'thucuview') page = <QueueBoardPage cluster="tradein" />;
  else if (route.kind === 'backupview') page = <QueueBoardPage cluster="backup" />;
  else if (route.kind === 'khoview') page = <KhoBoardPage />;
  else if (route.kind === 'app') page = <AppPage />;
  else if (route.kind === 'staff') page = <StaffPage />;
  else if (route.kind === 'desk') page = <StaffPage lockedDeskId={route.deskId} />;
  else page = <DashboardPage />;

  // `/app` đã có thanh phiên riêng trong từng màn hình. Các route độc lập
  // cần dùng thanh chung để không mất thao tác đăng xuất khi đổi tab.
  return (
    <>
      {page}
      {ROUTES_WITH_GLOBAL_SESSION_BAR.has(route.kind) && <GlobalSessionBar />}
    </>
  );
}
