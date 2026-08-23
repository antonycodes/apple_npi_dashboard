import { useState } from 'react';
import { ArrowLeftIcon } from '@/components/AppShellIcons';
import DashboardPage from './DashboardPage';
import StaffPage from './StaffPage';
import KhoAppPage from './KhoAppPage';
import { GuestSimulationProvider } from '@/guest/GuestSimulationContext';
import { ALL_POSITIONS, CLUSTER_LABELS } from '@/config/layoutConfig';

type GuestMode = 'DP' | 'KHO' | `TV${number}` | `TC${number}` | `BK${number}`;

const MODES: Array<{ id: GuestMode; code: string; label: string; note: string }> = [
  { id: 'DP', code: 'Guest_DP', label: 'Điều phối', note: 'Sơ đồ bàn và form điều phối' },
  { id: 'TV1', code: 'Guest_TV', label: 'Tư vấn', note: 'Chọn bàn TV khi tham gia phòng' },
  { id: 'TC1', code: 'Guest_TC', label: 'Thu cũ', note: 'Chọn bàn TC khi tham gia phòng' },
  { id: 'BK1', code: 'Guest_BK', label: 'Backup', note: 'Chọn bàn BK khi tham gia phòng' },
  { id: 'KHO', code: 'Guest_KHO', label: 'Kho', note: 'Bàn giao và bảng kho' },
];

const DESK_ROLES = ALL_POSITIONS.map((position) => ({
  id: position.id as GuestMode,
  code: `Guest_${position.id}`,
  label: position.label,
  note: CLUSTER_LABELS[position.cluster],
}));
const ROLE_GROUPS = (room: boolean) => room
  ? [
      { label: 'Điều phối & Kho', items: [MODES[0], MODES[4]] },
      { label: 'Tư vấn', items: DESK_ROLES.filter((item) => item.id.startsWith('TV')) },
      { label: 'Thu cũ', items: DESK_ROLES.filter((item) => item.id.startsWith('TC')) },
      { label: 'Backup', items: DESK_ROLES.filter((item) => item.id.startsWith('BK')) },
    ]
  : [
      { label: 'Màn hình chính', items: MODES },
    ];

export default function GuestPage() {
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const initialRole = params?.get('role')?.replace(/^Guest_/, '');
  const initialMode = [...MODES, ...DESK_ROLES].some((item) => item.id === initialRole) ? initialRole as GuestMode : null;
  const roomCode = params?.get('room');
  const [mode, setMode] = useState<GuestMode | null>(initialMode);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'Màn hình chính': true,
    'Điều phối & Kho': true,
  });
  const selected = mode !== null;

  return (
    <GuestSimulationProvider roomCode={roomCode} role={initialMode ? `Guest_${initialMode}` : 'Guest_DP'}>
      {selected ? (
        <div className="min-h-full bg-neutral-100">
          {mode === 'DP' && <DashboardPage readOnly simulation onGuestBack={() => setMode(null)} />}
          {mode !== 'DP' && mode !== 'KHO' && (
            <StaffPage lockedDeskId={`Guest_${mode}`} guestMode onGuestBack={() => setMode(null)} />
          )}
          {mode === 'KHO' && <KhoAppPage guestMode onGuestBack={() => setMode(null)} />}
        </div>
      ) : (
        <main className="min-h-full bg-neutral-100 px-4 py-8 text-neutral-800 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-neutral-900">Chế độ khách</h1>
              </div>
              <a href="/app" className="hidden shrink-0 items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm font-bold text-neutral-600 sm:flex">
                <ArrowLeftIcon className="h-4 w-4" /> Về đăng nhập
              </a>
            </div>
            <div className="space-y-6">
              {ROLE_GROUPS(Boolean(roomCode)).map((group) => (
                <section key={group.label} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
                  <button
                    type="button"
                    onClick={() => setOpenGroups((current) => ({ ...current, [group.label]: !current[group.label] }))}
                    className="flex min-h-12 w-full items-center justify-between px-4 text-left"
                    aria-expanded={Boolean(openGroups[group.label])}
                  >
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-neutral-400">{group.label}</span>
                    <span className="text-lg font-semibold text-neutral-400">{openGroups[group.label] ? '−' : '+'}</span>
                  </button>
                  {openGroups[group.label] && <div className="grid gap-3 border-t border-neutral-100 bg-neutral-50/60 p-3 sm:grid-cols-2">
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setMode(item.id)}
                        className="rounded-2xl border border-neutral-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand hover:shadow-md"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xl font-black text-neutral-900">{item.label}</span>
                          <span className="rounded-full bg-neutral-100 px-2.5 py-1 font-mono text-xs font-bold text-neutral-500">{item.code}</span>
                        </div>
                        <p className="mt-2 text-sm text-neutral-500">{item.note}</p>
                        <span className="mt-5 inline-flex text-sm font-bold text-brand">Mở màn hình →</span>
                      </button>
                    ))}
                  </div>}
                </section>
              ))}
            </div>
            <a href="/app" className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 py-3 text-sm font-bold text-neutral-600 sm:hidden">
              <ArrowLeftIcon className="h-4 w-4" /> Về đăng nhập
            </a>
          </div>
        </main>
      )}
    </GuestSimulationProvider>
  );
}
