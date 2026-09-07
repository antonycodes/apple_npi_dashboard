import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftIcon, DownloadIcon, RefreshIcon } from '@/components/AppShellIcons';
import { useAdminInfo, logoutToApp } from '@/config/adminSession';
import { ALL_POSITIONS } from '@/config/layoutConfig';
import { fetchAuditLogs, downloadAuditLogExcel, recordAuditEvent, type AuditLogItem } from '@/services/auditLogApi';
import { useDashboardData } from '@/hooks/useDashboardData';

const STAGES = ['Tất cả', 'Điều phối', 'Tư vấn', 'Thu cũ', 'Backup', 'Kho', 'Admin'];
const FIXED_DESKS_BY_STAGE: Record<string, string[]> = {
  'Điều phối': ['DP1', 'DP2', 'DP3', 'DP4'],
  'Tư vấn': ALL_POSITIONS.filter((item) => item.cluster === 'consult').map((item) => item.id),
  'Thu cũ': ALL_POSITIONS.filter((item) => item.cluster === 'tradein').map((item) => item.id),
  Backup: ALL_POSITIONS.filter((item) => item.cluster === 'backup').map((item) => item.id),
  Kho: [],
  Admin: [],
};

function today() { return new Date().toISOString().slice(0, 10); }
function firstOfMonth() { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); }

export default function ActivityLogPage() {
  const session = useAdminInfo();
  const [rows, setRows] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState('Tất cả');
  const [desk, setDesk] = useState('');
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(today);
  const { roster } = useDashboardData();

  const load = async () => {
    setLoading(true); setError(null);
    try {
      setRows(await fetchAuditLogs({ from, to, stage: stage === 'Tất cả' ? '' : stage }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [stage, from, to]);

  const deskOptions = useMemo(() => {
    const rosterDesks = roster
      .filter((item) => stage === 'Tất cả' || item.loai === stage)
      .map((item) => item.deskCode);
    const fixed = stage === 'Tất cả' ? Object.values(FIXED_DESKS_BY_STAGE).flat() : FIXED_DESKS_BY_STAGE[stage] ?? [];
    const logged = rows.map((item) => item.deskCode).filter(Boolean) as string[];
    return Array.from(new Set([...fixed, ...rosterDesks, ...logged])).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [roster, rows, stage]);
  const deskLabel = (deskCode: string) => {
    const staff = roster.find((item) => item.deskCode === deskCode && (stage === 'Tất cả' || item.loai === stage));
    if (!staff) return deskCode;
    const identity = [staff.staffId, staff.staffName].filter(Boolean).join(' — ');
    return identity ? `${deskCode} — ${identity}` : deskCode;
  };
  const visibleRows = useMemo(() => desk ? rows.filter((item) => item.deskCode === desk) : rows, [desk, rows]);
  if (session?.role !== 'admin') return <main className="min-h-screen bg-[#f7f6f3] p-6"><p className="mx-auto max-w-3xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">Chỉ tài khoản Admin được xem và tải audit log.</p></main>;

  return (
    <main className="min-h-screen bg-[#f7f6f3] px-4 py-6 text-neutral-800 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-200 pb-5">
          <div><a href="/app" className="inline-flex items-center gap-2 text-sm font-bold text-neutral-500 hover:text-neutral-900"><ArrowLeftIcon className="h-4 w-4" /> Quản trị</a><h1 className="mt-4 text-2xl font-black tracking-tight text-neutral-950">Audit log hoạt động app</h1><p className="mt-1 text-sm text-neutral-500">Dữ liệu do app ghi nhận, độc lập với lịch sử nghiệp vụ trong Lark Base.</p></div>
          <button type="button" onClick={logoutToApp} className="min-h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-bold text-red-700 hover:bg-red-50">Đăng xuất</button>
        </header>
        <section className="mt-6 border border-neutral-200 bg-white p-4 sm:p-5">
          <div className="grid gap-4 md:grid-cols-4">
            <label className="grid gap-2 text-sm font-bold">Phân loại<select value={stage} onChange={(e) => { setStage(e.target.value); setDesk(''); }} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 font-medium"><option>Tất cả</option>{STAGES.slice(1).map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="grid gap-2 text-sm font-bold md:col-span-2">Vị trí nhân sự<select value={desk} onChange={(e) => setDesk(e.target.value)} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 font-medium"><option value="">Tất cả vị trí</option>{deskOptions.map((item) => <option key={item} value={item}>{deskLabel(item)}</option>)}</select></label>
            <button type="button" onClick={() => void load()} disabled={loading} className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-bold hover:bg-neutral-50 disabled:opacity-60"><RefreshIcon className="h-4 w-4" />{loading ? 'Đang tải…' : 'Lọc log'}</button>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-bold">Từ ngày<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="min-h-11 rounded-lg border border-neutral-300 px-3" /></label><label className="grid gap-2 text-sm font-bold">Đến ngày<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="min-h-11 rounded-lg border border-neutral-300 px-3" /></label></div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4"><div><p className="text-lg font-black">{visibleRows.length.toLocaleString('vi-VN')} log</p><p className="text-xs text-neutral-500">Nguồn: audit log riêng của app</p></div><button type="button" disabled={loading || !visibleRows.length} onClick={() => { recordAuditEvent({ action: 'Tải audit log', stage: 'Admin', result: 'success', detail: `${visibleRows.length} dòng` }); downloadAuditLogExcel(visibleRows, `audit-log-${today()}.xls`); }} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-neutral-900 px-4 text-sm font-bold text-white hover:bg-neutral-700 disabled:opacity-40"><DownloadIcon className="h-4 w-4" /> Tải Excel</button></div>
        </section>
        {error && <p className="mt-4 border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">Không tải được audit log: {error}</p>}
        <section className="mt-5 overflow-hidden border border-neutral-200 bg-white"><div className="overflow-x-auto"><table className="min-w-[1100px] w-full border-collapse text-left text-sm"><thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500"><tr>{['Thời gian app', 'Phân loại', 'Vị trí', 'MSNV', 'Nhân sự', 'Hành động', 'Kết quả', 'Chi tiết', 'Vai trò'].map((item) => <th key={item} className="border-b border-neutral-200 px-3 py-3 font-bold">{item}</th>)}</tr></thead><tbody>{visibleRows.slice(0, 200).map((item) => <tr key={item.id} className="border-b border-neutral-100"><td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{new Date(item.event_at).toLocaleString('vi-VN')}</td><td className="px-3 py-3 font-bold">{item.stage || '—'}</td><td className="px-3 py-3 font-bold">{item.deskCode || '—'}</td><td className="px-3 py-3">{item.msnv || '—'}</td><td className="px-3 py-3">{item.staffName || '—'}</td><td className="px-3 py-3">{item.action}</td><td className="px-3 py-3 font-semibold">{item.result}</td><td className="max-w-[260px] truncate px-3 py-3 text-neutral-500">{item.detail || '—'}</td><td className="px-3 py-3 text-xs text-neutral-500">{item.actor_role || '—'}</td></tr>)}{!loading && !visibleRows.length && <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-neutral-500">Chưa có audit log theo bộ lọc.</td></tr>}</tbody></table></div>{visibleRows.length > 200 && <p className="border-t border-neutral-100 px-4 py-3 text-xs text-neutral-500">Xem trước 200 dòng; file Excel chứa toàn bộ {visibleRows.length.toLocaleString('vi-VN')} dòng.</p>}</section>
      </div>
    </main>
  );
}
