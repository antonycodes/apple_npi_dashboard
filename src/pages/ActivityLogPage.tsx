import { ArrowLeftIcon } from '@/components/AppShellIcons';
import { canViewAll, useAdminInfo, logoutToApp } from '@/config/adminSession';
import { DEFAULT_FIELD_CONFIG, useLarkSettings } from '@/config/larkSettings';
import { useDashboardData } from '@/hooks/useDashboardData';
import { operationsLogMockTables } from '@/data/operationsLogMockData';
import OperationsLogPanel from '@/components/OperationsLogPanel';

export default function ActivityLogPage({ mock = false }: { mock?: boolean }) {
  const session = useAdminInfo();
  const { tables, loading, refresh } = useDashboardData({ forceMock: mock });
  const settings = useLarkSettings();
  const pageTables = mock ? operationsLogMockTables : tables;
  const pageFields = mock ? DEFAULT_FIELD_CONFIG : settings.fields;

  if (!mock && !canViewAll(session)) return <main className="min-h-screen bg-[#f7f6f3] p-6"><p className="mx-auto max-w-3xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">Bạn không có quyền xem nhật ký vận hành.</p></main>;

  return (
    <main className="min-h-screen bg-[#f7f6f3] px-4 py-6 text-neutral-800 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-200 pb-5">
          <div><a href={mock ? '/admin/logs' : '/app'} className="inline-flex items-center gap-2 text-sm font-bold text-neutral-500 hover:text-neutral-900"><ArrowLeftIcon className="h-4 w-4" /> {mock ? 'Nhật ký thật' : 'Quản trị'}</a><h1 className="mt-4 text-2xl font-black tracking-tight text-neutral-950">Nhật ký vận hành{mock ? ' · Mock data' : ''}</h1><p className="mt-1 text-sm text-neutral-500">Theo dõi hành trình khách qua tất cả các khâu.</p></div>
          {!mock && <button type="button" onClick={logoutToApp} className="min-h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-bold text-red-700 hover:bg-red-50">Đăng xuất</button>}
        </header>
        {mock && <p className="mt-4 border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">Đây là dữ liệu mẫu. Không đọc hoặc ghi dữ liệu Lark.</p>}
        <OperationsLogPanel tables={pageTables} fields={pageFields} loading={mock ? false : loading} refresh={mock ? () => undefined : refresh} />
      </div>
    </main>
  );
}
