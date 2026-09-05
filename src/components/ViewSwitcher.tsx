import { useAdminInfo } from '@/config/adminSession';

export type AppView = 'main' | 'dash' | 'checkin' | 'sms' | 'tuvan' | 'tradein' | 'backup' | 'kho';

const OPERATION_VIEWS: Array<{ key: AppView; label: string; href: string }> = [
  { key: 'tuvan', label: 'Tư vấn', href: '/tuvanview' },
  { key: 'tradein', label: 'Thu cũ', href: '/thucuview' },
  { key: 'backup', label: 'Backup', href: '/backupview' },
  { key: 'kho', label: 'Kho', href: '/khoview' },
];

export default function ViewSwitcher({ active }: { active: AppView }) {
  const session = useAdminInfo();
  const isAdmin = session?.role === 'admin';
  const canOpenCheckin = isAdmin || session?.role === 'checkin';
  const canOpenSms = isAdmin || session?.role === 'dieuphoi' || session?.workspaces.some((workspace) => workspace.role === 'dieuphoi');
  const views = session?.role === 'checkin'
    ? [{ key: 'checkin' as const, label: 'Check-in', href: '/check-in' }]
    : isAdmin
    ? [
        { key: 'main' as const, label: 'Main', href: '/app' },
        { key: 'dash' as const, label: 'Dash', href: '/dashboard' },
        ...(canOpenCheckin ? [{ key: 'checkin' as const, label: 'Check-in', href: '/check-in' }] : []),
        ...(canOpenSms ? [{ key: 'sms' as const, label: 'SMS', href: '/sms' }] : []),
        ...OPERATION_VIEWS,
      ]
    : [
        { key: 'dash' as const, label: 'Dash', href: '/dashboard' },
        ...(canOpenCheckin ? [{ key: 'checkin' as const, label: 'Check-in', href: '/check-in' }] : []),
        ...(canOpenSms ? [{ key: 'sms' as const, label: 'SMS', href: '/sms' }] : []),
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
