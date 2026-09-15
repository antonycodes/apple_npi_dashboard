import { canViewAll, useAdminInfo } from '@/config/adminSession';
import { useGuestSimulation } from '@/guest/GuestSimulationContext';

export type AppView = 'main' | 'dash' | 'checkin' | 'sms' | 'errors' | 'tuvan' | 'tradein' | 'backup' | 'kho';

type OperationView = 'tuvan' | 'tradein' | 'backup' | 'kho';

const OPERATION_VIEWS: Array<{ key: OperationView; label: string; href: string }> = [
  { key: 'tuvan', label: 'Tư vấn', href: '/tuvanview' },
  { key: 'tradein', label: 'Thu cũ', href: '/thucuview' },
  { key: 'backup', label: 'Backup', href: '/backupview' },
  { key: 'kho', label: 'Kho', href: '/khoview' },
];

const GUEST_ROLE_BY_VIEW: Record<'dash' | OperationView, string> = {
  dash: 'DP',
  tuvan: 'TV1',
  tradein: 'TC1',
  backup: 'BK1',
  kho: 'KHO1',
};

export default function ViewSwitcher({ active, simulation = false }: { active: AppView; simulation?: boolean }) {
  const session = useAdminInfo();
  const guestSimulation = useGuestSimulation();
  const hasAllViewAccess = canViewAll(session);
  const canOpenCheckin = hasAllViewAccess || session?.role === 'checkin';
  const canOpenSms = hasAllViewAccess || session?.role === 'dieuphoi' || session?.workspaces.some((workspace) => workspace.role === 'dieuphoi');
  const guestHref = (view: keyof typeof GUEST_ROLE_BY_VIEW) => {
    const params = new URLSearchParams({ role: `Guest_${GUEST_ROLE_BY_VIEW[view]}` });
    if (guestSimulation?.roomCode) params.set('room', guestSimulation.roomCode);
    return `/guest?${params.toString()}`;
  };
  const views = simulation
    ? [
        { key: 'dash' as const, label: 'Dash', href: guestHref('dash') },
        ...OPERATION_VIEWS.map((view) => ({ ...view, href: guestHref(view.key) })),
      ]
    : session?.role === 'checkin'
    ? [{ key: 'checkin' as const, label: 'Check-in', href: '/check-in' }]
    : hasAllViewAccess
    ? [
        { key: 'main' as const, label: 'Main', href: '/app' },
        { key: 'dash' as const, label: 'Dash', href: '/dashboard' },
        ...(canOpenCheckin ? [{ key: 'checkin' as const, label: 'Check-in', href: '/check-in' }] : []),
        ...(canOpenSms ? [{ key: 'sms' as const, label: 'SMS', href: '/sms' }] : []),
        { key: 'errors' as const, label: 'Kiểm soát hệ thống', href: '/system-control' },
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
