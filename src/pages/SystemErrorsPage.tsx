import { useMemo, useState } from 'react';
import { ArrowLeftIcon, RefreshIcon } from '@/components/AppShellIcons';
import { useAdminInfo, logoutToApp } from '@/config/adminSession';
import { useDashboardData } from '@/hooks/useDashboardData';

type Severity = 'critical' | 'warning' | 'info';
type Issue = { id: string; severity: Severity; title: string; source: string; detail: string; impact: string; action: string };
const SEVERITY_META: Record<Severity, { label: string; tone: string; dot: string }> = {
  critical: { label: 'Nghiêm trọng', tone: 'border-red-200 bg-red-50 text-red-800', dot: 'bg-red-600' },
  warning: { label: 'Cảnh báo', tone: 'border-amber-200 bg-amber-50 text-amber-800', dot: 'bg-amber-500' },
  info: { label: 'Thông tin', tone: 'border-blue-200 bg-blue-50 text-blue-800', dot: 'bg-blue-500' },
};

function buildIssues(data: ReturnType<typeof useDashboardData>): Issue[] {
  const issues: Issue[] = [];
  if (data.error) issues.push({ id: 'snapshot-fetch', severity: 'critical', title: 'Không đọc được dữ liệu vận hành', source: 'Worker → /dashboard/snapshot', detail: data.error, impact: 'Dashboard có thể đang hiển thị dữ liệu cũ hoặc không đầy đủ.', action: 'Kiểm tra Worker, API URL và quyền truy cập Lark Base. Sau đó làm mới lại.' });
  else if (!data.loading && !data.lastUpdated) issues.push({ id: 'snapshot-empty', severity: 'critical', title: 'Chưa nhận được snapshot đầu tiên', source: 'useDashboardData → fetchLarkData', detail: 'Ứng dụng chưa có mốc cập nhật dữ liệu hợp lệ.', impact: 'Các màn hình vận hành chưa có cơ sở dữ liệu mới để hiển thị.', action: 'Kiểm tra kết nối vùng và thử làm mới.' });
  if (data.unresolvedDeskNames.length) issues.push({ id: 'unresolved-desk', severity: 'warning', title: 'Có dòng Master không xác định được vị trí', source: 'Lark Base → Master / TV_MãNV, Submit by, Master Điều phối', detail: `${data.unresolvedDeskNames.length} khách: ${data.unresolvedDeskNames.slice(0, 4).join(', ')}${data.unresolvedDeskNames.length > 4 ? '…' : ''}`, impact: 'Dòng lỗi không xuất hiện trên sơ đồ bàn và có thể bị bỏ sót khi theo dõi.', action: 'Bổ sung mã bàn hoặc MSNV gửi form. Kiểm tra bản ghi điều phối của khách.' });
  const occupiedWithoutCustomer = data.desks.filter((desk) => desk.isOccupied && !desk.customerSTT);
  if (occupiedWithoutCustomer.length) issues.push({ id: 'occupied-without-customer', severity: 'warning', title: 'Bàn đang bận nhưng thiếu thông tin khách', source: 'Mapper → Master ↔ Master_Check in', detail: occupiedWithoutCustomer.map((desk) => desk.label).join(', '), impact: 'Nhân sự vẫn được tính là đang phục vụ, nhưng quản lý không thấy đúng STT khách.', action: 'Kiểm tra STT Input, tên khách và thời gian trong bản ghi Master.' });
  const waitingWithoutNextStt = data.desks.filter((desk) => (desk.waiting ?? 0) > 0 && !desk.nextWaitingStt);
  if (waitingWithoutNextStt.length) issues.push({ id: 'waiting-without-stt', severity: 'warning', title: 'Có khách chờ nhưng chưa xác định STT tiếp theo', source: 'Mapper → Master Điều phối / STT', detail: waitingWithoutNextStt.map((desk) => desk.label).join(', '), impact: 'Bàn có thể không biết khách nào cần nhận tiếp theo.', action: 'Kiểm tra STT, trạng thái và mã bàn trong Master Điều phối.' });
  if (!issues.length && data.lastUpdated) issues.push({ id: 'system-healthy', severity: 'info', title: 'Chưa phát hiện lỗi đang tồn tại', source: 'Kiểm tra snapshot và dữ liệu mapping hiện tại', detail: `Snapshot gần nhất lúc ${data.lastUpdated.toLocaleTimeString('vi-VN')}.`, impact: 'Các kiểm tra hiện tại đang trả về trạng thái bình thường.', action: 'Tiếp tục theo dõi. Tab sẽ kiểm tra lại theo chu kỳ snapshot.' });
  return issues;
}

export default function SystemErrorsPage() {
  const session = useAdminInfo();
  const data = useDashboardData();
  const [filter, setFilter] = useState<'all' | Severity>('all');
  const issues = useMemo(() => buildIssues(data), [data]);
  const visible = filter === 'all' ? issues : issues.filter((issue) => issue.severity === filter);
  const count = (severity: Severity) => issues.filter((issue) => issue.severity === severity).length;
  if (session?.role !== 'admin') return <main className="min-h-screen bg-[#f7f6f3] p-6"><p className="mx-auto max-w-3xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">Bạn không có quyền xem giám sát lỗi hệ thống.</p></main>;

  return <main className="min-h-screen bg-[#f7f6f3] px-4 py-6 text-neutral-800 sm:px-6"><div className="mx-auto max-w-6xl">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-200 pb-5"><div><a href="/app" className="inline-flex items-center gap-2 text-sm font-bold text-neutral-700 hover:text-neutral-900"><ArrowLeftIcon className="h-4 w-4" /> Quản trị</a><h1 className="mt-4 text-2xl font-black tracking-tight text-neutral-950">Lỗi hệ thống</h1><p className="mt-1 max-w-2xl text-sm text-neutral-600">Phát hiện lỗi đang tồn tại để xử lý trước khi ảnh hưởng vận hành.</p></div><div className="flex items-center gap-2"><button type="button" onClick={data.refresh} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-bold hover:bg-neutral-50"><RefreshIcon className="h-4 w-4" /> Kiểm tra lại</button><button type="button" onClick={logoutToApp} className="min-h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-bold text-red-700 hover:bg-red-50">Đăng xuất</button></div></header>
    <section className="mt-6 grid gap-3 sm:grid-cols-3">{(['critical', 'warning', 'info'] as Severity[]).map((severity) => { const meta = SEVERITY_META[severity]; return <button key={severity} type="button" onClick={() => setFilter(filter === severity ? 'all' : severity)} className={`border p-4 text-left transition hover:border-neutral-400 ${filter === severity ? 'ring-2 ring-neutral-900 ring-offset-2' : ''}`}><p className="text-xs font-bold text-neutral-500">{meta.label}</p><p className="mt-1 text-2xl font-black text-neutral-950">{count(severity)}</p></button>; })}</section>
    <section className="mt-5 border border-neutral-200 bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-4 py-4 sm:px-5"><div><h2 className="font-black text-neutral-950">Đang theo dõi</h2><p className="mt-1 text-xs text-neutral-500">Nguồn dữ liệu: snapshot vận hành hiện tại.</p></div><select value={filter} onChange={(event) => setFilter(event.target.value as 'all' | Severity)} className="min-h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm"><option value="all">Tất cả mức độ</option><option value="critical">Nghiêm trọng</option><option value="warning">Cảnh báo</option><option value="info">Thông tin</option></select></div><div className="divide-y divide-neutral-100">
      {data.loading && <p className="px-5 py-12 text-center text-sm text-neutral-500">Đang kiểm tra dữ liệu hệ thống…</p>}
      {!data.loading && visible.map((issue) => { const meta = SEVERITY_META[issue.severity]; return <article key={issue.id} className="px-4 py-5 sm:px-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`} /><div><h3 className="font-black text-neutral-950">{issue.title}</h3><p className="mt-1 text-xs font-semibold text-neutral-500">Vị trí: {issue.source}</p></div></div><span className={`border px-2 py-1 text-[11px] font-bold ${meta.tone}`}>{meta.label}</span></div><p className="mt-4 text-sm text-neutral-700">{issue.detail}</p><div className="mt-4 grid gap-3 border-t border-neutral-100 pt-4 text-sm md:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-wide text-neutral-400">Ảnh hưởng</p><p className="mt-1 text-neutral-600">{issue.impact}</p></div><div><p className="text-xs font-bold uppercase tracking-wide text-neutral-400">Hướng xử lý</p><p className="mt-1 text-neutral-600">{issue.action}</p></div></div></article>; })}
      {!data.loading && !visible.length && <p className="px-5 py-12 text-center text-sm text-neutral-500">Không có lỗi phù hợp với bộ lọc.</p>}
    </div></section>
  </div></main>;
}
