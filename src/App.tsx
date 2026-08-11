/**
 * App — hash router for Main, Tư vấn, Thu cũ, Backup, Settings and Admin.
 *
 * KHÔNG có cổng đăng nhập ở đây (bỏ 2026-08-11 theo yêu cầu user): máy điều
 * phối mở app là dùng được ngay, y như trước. Đăng nhập admin chỉ bật lên ở
 * ĐÚNG 2 chỗ — popup "đổi điều phối viên" (`CoordinatorAssignModal`) và trang
 * `#/admin` — tức chỉ chặn việc đổi máy này là ai / sửa danh sách, không chặn
 * việc vận hành.
 */
import { useEffect, useState } from 'react';
import AdminPage from './pages/AdminPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import QueueBoardPage from './pages/QueueBoardPage';

type Route = 'admin' | 'settings' | 'dashboard' | 'tuvanview' | 'kythuatview' | 'backupview';

function useHashRoute(): Route {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  const path = hash.replace(/^#\/?/, '');
  if (path.startsWith('admin')) return 'admin';
  if (path.startsWith('settings')) return 'settings';
  if (path.startsWith('tuvanview')) return 'tuvanview';
  if (path.startsWith('kythuatview') || path.startsWith('thucuvview')) return 'kythuatview';
  if (path.startsWith('backupview')) return 'backupview';
  return 'dashboard';
}

export default function App() {
  const route = useHashRoute();
  if (route === 'admin') return <AdminPage />;
  if (route === 'settings') return <SettingsPage />;
  if (route === 'tuvanview') return <QueueBoardPage cluster="consult" />;
  if (route === 'kythuatview') return <QueueBoardPage cluster="tradein" />;
  if (route === 'backupview') return <QueueBoardPage cluster="backup" />;
  return <DashboardPage />;
}
