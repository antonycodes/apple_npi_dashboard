import { useAdminInfo, adminSessionStore } from '@/config/adminSession';
import { ArrowLeftIcon } from './AppShellIcons';

/** Phiên đăng nhập dùng chung cho các route độc lập ngoài `/app`. */
export default function GlobalSessionBar() {
  const session = useAdminInfo();
  if (!session) return null;

  const label = [session.desk, session.name || session.username].filter(Boolean).join(' · ');
  const canChangeDesk = session.workspaces.length > 1;

  return (
    <div className="fixed bottom-3 left-3 z-[60] flex max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-full border border-neutral-300 bg-white/95 px-3 py-1.5 shadow-[0_8px_24px_rgba(17,24,39,0.12)] backdrop-blur">
      <span className="max-w-[42vw] truncate text-xs font-semibold text-neutral-600" title={label}>
        {label || 'Đã đăng nhập'}
      </span>
      {canChangeDesk && (
        <a
          href="/app?choose=1"
          aria-label="Đổi khu vực"
          title="Đổi khu vực"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </a>
      )}
      <button
        type="button"
        onClick={() => adminSessionStore.clear()}
        className="min-h-8 shrink-0 rounded-full bg-neutral-800 px-3 text-xs font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 active:scale-[0.98]"
      >
        Đăng xuất
      </button>
    </div>
  );
}
