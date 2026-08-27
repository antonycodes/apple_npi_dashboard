import { useAdminInfo } from '@/config/adminSession';

export type AppView = 'main' | 'dash' | 'checkin' | 'tuvan' | 'tradein' | 'backup' | 'kho';

const OPERATION_VIEWS: Array<{ key: AppView; label: string; href: string }> = [
  { key: 'tuvan', label: 'Tư vấn', href: '/tuvanview' },
  { key: 'tradein', label: 'Thu cũ', href: '/kythuatview' },
  { key: 'backup', label: 'Backup', href: '/backupview' },
  { key: 'kho', label: 'Kho', href: '/khoview' },
];

export default function ViewSwitcher({ active }: { active: AppView }) {
  const session = useAdminInfo();
  const isAdmin = session?.role === 'admin';
  const isCoordinator = session?.role === 'dieuphoi';
  const canOpenCheckin = isAdmin || session?.role === 'checkin';
  const views = isAdmin
    ? [
        { key: 'main' as const, label: 'Main', href: '/app' },
        { key: 'dash' as const, label: 'Dash', href: '/' },
        ...(canOpenCheckin ? [{ key: 'checkin' as const, label: 'Check-in', href: '/check-in' }] : []),
        ...OPERATION_VIEWS,
      ]
    : [
        isCoordinator
          ? { key: 'dash' as const, label: 'Dash', href: '/' }
          : { key: 'main' as const, label: 'Main', href: '/' },
        ...(canOpenCheckin ? [{ key: 'checkin' as const, label: 'Check-in', href: '/check-in' }] : []),
        ...OPERATION_VIEWS,
      ];

  return (
    <nav aria-label="Chuyển view" className="flex items-center gap-1 rounded-lg bg-neutral-100 p-1">
      {views.map((view) => (
        <a
          key={view.key}
          href={view.href}
          aria-current={active === view.key ? 'page' : undefined}
          className={[
            'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
            active === view.key
              ? 'bg-white text-brand shadow-sm'
              : 'text-neutral-500 hover:bg-white hover:text-neutral-800',
          ].join(' ')}
        >
          {view.label}
        </a>
      ))}
    </nav>
  );
}
