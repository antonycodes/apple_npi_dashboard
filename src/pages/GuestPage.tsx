import { useState } from 'react';
import { ArrowLeftIcon } from '@/components/AppShellIcons';
import DashboardPage from './DashboardPage';
import StaffPage from './StaffPage';
import KhoAppPage from './KhoAppPage';
import { GuestSimulationProvider } from '@/guest/GuestSimulationContext';
import { ALL_POSITIONS, CLUSTER_LABELS } from '@/config/layoutConfig';
import { useLarkSettings } from '@/config/larkSettings';

type GuestMode = 'DP' | 'KHO' | `TV${number}` | `TC${number}` | `BK${number}`;

const MODES: Array<{ id: GuestMode; code: string; label: string; note: string }> = [
  { id: 'DP', code: 'Guest_DP', label: 'Dashboard điều phối', note: 'Sơ đồ bàn và form điều phối' },
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
const ROLE_GROUPS = [
  { label: 'Điều phối & Kho', items: [MODES[0], MODES[4]] },
  { label: 'Tư vấn', items: DESK_ROLES.filter((item) => item.id.startsWith('TV')) },
  { label: 'Thu cũ', items: DESK_ROLES.filter((item) => item.id.startsWith('TC')) },
  { label: 'Backup', items: DESK_ROLES.filter((item) => item.id.startsWith('BK')) },
];

export default function GuestPage() {
  const settings = useLarkSettings();
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const initialRole = params?.get('role')?.replace(/^Guest_/, '');
  const initialMode = [...MODES, ...DESK_ROLES].some((item) => item.id === initialRole) ? initialRole as GuestMode : null;
  const roomCode = params?.get('room');
  const [mode, setMode] = useState<GuestMode | null>(initialMode);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'Màn hình chính': true,
  });
  const selected = mode !== null;

  return (
    <GuestSimulationProvider roomCode={roomCode} role={initialMode ? `Guest_${initialMode}` : 'Guest_DP'}>
      {settings.guestLock ? <GuestLockedScreen /> : selected ? (
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
            <div className="space-y-3">
              {ROLE_GROUPS.map((group) => (
                <section key={group.label} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => setOpenGroups((current) => ({ ...current, [group.label]: !current[group.label] }))}
                    className="flex min-h-14 w-full items-center justify-between gap-3 px-4 text-left transition hover:bg-neutral-50"
                    aria-expanded={Boolean(openGroups[group.label])}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-black text-neutral-800">{group.label}</span>
                      <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-bold text-neutral-500">{group.items.length}</span>
                    </span>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-lg leading-none font-medium text-neutral-500" aria-hidden="true">{openGroups[group.label] ? '−' : '+'}</span>
                  </button>
                  {openGroups[group.label] && <div className="grid grid-cols-2 gap-2 border-t border-neutral-100 bg-neutral-50/60 p-3 sm:grid-cols-3 md:grid-cols-4">
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setMode(item.id)}
                        className="flex min-h-16 items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-left transition hover:border-brand hover:bg-brand/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-black text-neutral-900">{item.label}</span>
                        <span className="mt-0.5 block truncate font-mono text-[10px] font-bold uppercase tracking-wide text-neutral-400">{settings.guestUsers[item.id] || item.code}</span>
                        </span>
                        <span className="shrink-0 text-lg leading-none text-neutral-300" aria-hidden="true">›</span>
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

function GuestLockedScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex min-h-dvh items-center justify-center bg-[#d40020]/85 px-6 text-white" role="dialog" aria-modal="true" aria-label="Guest đang bị khóa">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto flex h-52 w-52 items-center justify-center overflow-hidden rounded-[2.5rem]" aria-hidden="true">
          <img src="/system-issue-sticker.jpg" alt="" className="h-full w-full object-cover" />
        </div>
        <h1 className="mt-6 text-xl font-black leading-tight tracking-tight">Oops! Guest đang bị khóa</h1>
      </div>
    </div>
  );
}
