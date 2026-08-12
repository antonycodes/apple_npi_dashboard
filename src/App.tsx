/**
 * App — hash router for Main, Tư vấn, Thu cũ, Backup, màn hình nhân viên
 * (`#/nv` + link riêng từng bàn `#/tv4`), Settings and Admin.
 *
 * KHÔNG có cổng đăng nhập ở đây (bỏ 2026-08-11 theo yêu cầu user): máy điều
 * phối mở app là dùng được ngay, y như trước. Đăng nhập admin chỉ bật lên ở
 * ĐÚNG 2 chỗ — popup "đổi điều phối viên" (`CoordinatorAssignModal`) và trang
 * `#/admin` — tức chỉ chặn việc đổi máy này là ai / sửa danh sách, không chặn
 * việc vận hành.
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
import AdminPage from './pages/AdminPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import QueueBoardPage from './pages/QueueBoardPage';
import StaffPage from './pages/StaffPage';

type Route =
  | { kind: 'admin' | 'settings' | 'dashboard' | 'tuvanview' | 'kythuatview' | 'backupview' | 'staff' }
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
  if (path.startsWith('admin')) return { kind: 'admin' };
  if (path.startsWith('settings')) return { kind: 'settings' };
  if (path.startsWith('tuvanview')) return { kind: 'tuvanview' };
  if (path.startsWith('kythuatview') || path.startsWith('thucuvview')) return { kind: 'kythuatview' };
  if (path.startsWith('backupview')) return { kind: 'backupview' };
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
  if (route.kind === 'admin') return <AdminPage />;
  if (route.kind === 'settings') return <SettingsPage />;
  if (route.kind === 'tuvanview') return <QueueBoardPage cluster="consult" />;
  if (route.kind === 'kythuatview') return <QueueBoardPage cluster="tradein" />;
  if (route.kind === 'backupview') return <QueueBoardPage cluster="backup" />;
  if (route.kind === 'staff') return <StaffPage />;
  if (route.kind === 'desk') return <StaffPage lockedDeskId={route.deskId} />;
  return <DashboardPage />;
}
