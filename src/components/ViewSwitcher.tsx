export type AppView = 'main' | 'tuvan' | 'tradein' | 'backup' | 'kho';

const VIEWS: Array<{ key: AppView; label: string; href: string }> = [
  { key: 'main', label: 'Main', href: '#/' },
  { key: 'tuvan', label: 'Tư vấn', href: '#/tuvanview' },
  { key: 'tradein', label: 'Thu cũ', href: '#/kythuatview' },
  { key: 'backup', label: 'Backup', href: '#/backupview' },
  { key: 'kho', label: 'Kho', href: '#/khoview' },
];

export default function ViewSwitcher({ active }: { active: AppView }) {
  return (
    <nav aria-label="Chuyển view" className="flex items-center gap-1 rounded-lg bg-neutral-100 p-1">
      {VIEWS.map((view) => (
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
