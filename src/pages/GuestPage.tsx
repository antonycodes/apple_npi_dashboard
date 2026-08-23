import { useState } from 'react';
import { ArrowLeftIcon } from '@/components/AppShellIcons';
import DashboardPage from './DashboardPage';
import StaffPage from './StaffPage';
import KhoAppPage from './KhoAppPage';

type GuestMode = 'DP' | 'TV' | 'TC' | 'BK' | 'KHO';

const MODES: Array<{ id: GuestMode; code: string; label: string; note: string }> = [
  { id: 'DP', code: 'Guest_DP', label: 'Điều phối', note: 'Sơ đồ bàn và form điều phối' },
  { id: 'TV', code: 'Guest_TV', label: 'Tư vấn', note: 'Màn hình bàn nhân viên Tư vấn' },
  { id: 'TC', code: 'Guest_TC', label: 'Thu cũ', note: 'Màn hình bàn nhân viên Thu cũ' },
  { id: 'BK', code: 'Guest_BK', label: 'Backup', note: 'Màn hình bàn nhân viên Backup' },
  { id: 'KHO', code: 'Guest_KHO', label: 'Kho', note: 'Bàn giao và bảng kho' },
];

export default function GuestPage() {
  const [mode, setMode] = useState<GuestMode | null>(null);
  const selected = MODES.find((item) => item.id === mode);

  if (selected) {
    return (
      <div className="min-h-full bg-neutral-100">
        <div className="fixed left-3 top-3 z-50 flex items-center gap-2 rounded-full border border-neutral-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
          <button
            type="button"
            onClick={() => setMode(null)}
            aria-label="Chọn màn hình khác"
            title="Chọn màn hình khác"
            className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <span className="pr-1 text-sm font-bold text-neutral-700">{selected.code}</span>
        </div>
        {mode === 'DP' && <DashboardPage readOnly simulation />}
        {mode !== 'DP' && mode !== 'KHO' && (
          <StaffPage lockedDeskId={`Guest_${mode}`} guestMode />
        )}
        {mode === 'KHO' && <KhoAppPage guestMode />}
      </div>
    );
  }

  return (
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
        <div className="grid gap-3 sm:grid-cols-2">
          {MODES.map((item) => (
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
        </div>
        <a href="/app" className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 py-3 text-sm font-bold text-neutral-600 sm:hidden">
          <ArrowLeftIcon className="h-4 w-4" /> Về đăng nhập
        </a>
      </div>
    </main>
  );
}
