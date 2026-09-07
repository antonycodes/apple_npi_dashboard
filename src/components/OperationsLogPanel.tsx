import { useMemo, useState } from 'react';
import { DownloadIcon, RefreshIcon } from '@/components/AppShellIcons';
import type { FieldConfig } from '@/config/larkConfig';
import type { LarkTables } from '@/services/larkTypes';
import { cellToBool, cellToString, fieldValue } from '@/services/larkMapper';
import { mapSmsJourneys } from '@/services/smsJourneyMapper';
import type { SmsJourney, SmsStageJourney } from '@/types/sms';

type StageKey = 'consult' | 'tradein' | 'backup';
const STAGES: Array<{ key: StageKey; label: string }> = [
  { key: 'consult', label: 'Tư vấn' },
  { key: 'tradein', label: 'Thu cũ' },
  { key: 'backup', label: 'Backup' },
];

function dateValue(value: string): number {
  const time = Date.parse(`${value}T00:00:00`);
  return Number.isFinite(time) ? time : 0;
}

function formatDate(value: number | null): string {
  return value ? new Date(value).toLocaleString('vi-VN') : '—';
}

function formatDuration(value: number | null): string {
  if (!value) return '—';
  const minutes = Math.floor(value / 60000);
  return minutes < 60 ? `${minutes} phút` : `${Math.floor(minutes / 60)} giờ ${minutes % 60} phút`;
}

function statusLabel(stage: SmsStageJourney): string {
  if (stage.status === 'completed') return 'Hoàn tất';
  if (stage.status === 'active') return 'Đang xử lý';
  if (stage.status === 'not-applicable') return 'Không áp dụng';
  return 'Chưa bắt đầu';
}

function latestMasterByStt(tables: LarkTables, fields: FieldConfig): Map<string, { priceConsideration: boolean; quickDevice: boolean }> {
  const latest = new Map<string, { tradeinTime: number; priceConsideration: boolean; quickDevice: boolean }>();
  for (const row of tables.master) {
    const stt = cellToString(fieldValue(row.fields, fields.master.sttInput));
    if (!stt) continue;
    const rawTime = cellToString(fieldValue(row.fields, fields.master.time));
    const time = Number(rawTime) || Date.parse(rawTime ?? '') || 0;
    const status = cellToString(fieldValue(row.fields, fields.master.status));
    const stage = cellToString(fieldValue(row.fields, fields.master.stage))?.toLocaleLowerCase('vi') ?? '';
    const desk = cellToString(fieldValue(row.fields, fields.master.deskCode))?.toUpperCase() ?? '';
    const isTradein = stage.includes('thu cũ') || stage.includes('thu cu') || desk.startsWith('TC') || desk.startsWith('KT');
    const previous = latest.get(stt) ?? { tradeinTime: -1, priceConsideration: false, quickDevice: false };
    latest.set(stt, {
      tradeinTime: isTradein && time >= previous.tradeinTime ? time : previous.tradeinTime,
      priceConsideration: isTradein && time >= previous.tradeinTime
        ? cellToBool(fieldValue(row.fields, fields.master.khachKhongDongYGiaThuCu))
        : previous.priceConsideration,
      quickDevice: previous.quickDevice || status === 'Thu máy nhanh',
    });
  }
  return new Map([...latest].map(([stt, value]) => [stt, {
    priceConsideration: value.priceConsideration,
    quickDevice: value.quickDevice,
  }]));
}

function downloadOperations(rows: Array<Record<string, string>>, fileName: string): void {
  const headers = Object.keys(rows[0] ?? {});
  const escape = (value: string) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const html = `<html><head><meta charset="UTF-8"></head><body><table><tr>${headers.map((item) => `<th>${escape(item)}</th>`).join('')}</tr>${rows.map((row) => `<tr>${headers.map((key) => `<td>${escape(row[key])}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
  const url = URL.createObjectURL(new Blob([`\ufeff${html}`], { type: 'application/vnd.ms-excel;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export default function OperationsLogPanel({ tables, fields, loading, refresh }: {
  tables: LarkTables;
  fields: FieldConfig;
  loading: boolean;
  refresh: () => void;
}) {
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [stage, setStage] = useState<'all' | StageKey>('all');
  const journeys = useMemo(() => Array.from(mapSmsJourneys(tables, fields).values()), [tables, fields]);
  const latestByStt = useMemo(() => latestMasterByStt(tables, fields), [tables, fields]);
  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('vi');
    const fromMs = from ? dateValue(from) : 0;
    const toMs = to ? dateValue(to) + 86400000 - 1 : Number.MAX_SAFE_INTEGER;
    return journeys.filter((journey) => {
      const matchesQuery = !needle || journey.stt.toLocaleLowerCase('vi').includes(needle) || journey.name.toLocaleLowerCase('vi').includes(needle);
      const matchesDate = !journey.checkinAt || (journey.checkinAt >= fromMs && journey.checkinAt <= toMs);
      const matchesStage = stage === 'all' || journey.stages[stage].status !== 'not-applicable';
      return matchesQuery && matchesDate && matchesStage;
    });
  }, [from, journeys, query, stage, to]);
  const summary = useMemo(() => {
    const leadtimes = visible.flatMap((item) => STAGES.map(({ key }) => item.stages[key].elapsedMs).filter((value): value is number => Boolean(value)));
    return {
      total: visible.length,
      completed: visible.filter((item) => item.endFlow).length,
      tradein: visible.filter((item) => item.stages.tradein.status !== 'not-applicable').length,
      backup: visible.filter((item) => item.stages.backup.status !== 'not-applicable').length,
      price: visible.filter((item) => latestByStt.get(item.stt)?.priceConsideration).length,
      quickDevice: visible.filter((item) => latestByStt.get(item.stt)?.quickDevice).length,
      avgLeadtime: leadtimes.length ? leadtimes.reduce((sum, value) => sum + value, 0) / leadtimes.length : null,
    };
  }, [latestByStt, visible]);
  const exportRows = useMemo(() => visible.map((item) => ({
    STT: item.stt,
    'Khách hàng': item.name,
    'Check-in': formatDate(item.checkinAt),
    'Tư vấn': statusLabel(item.stages.consult),
    'Thu cũ': statusLabel(item.stages.tradein),
    'Backup': statusLabel(item.stages.backup),
    'Cân nhắc giá': latestByStt.get(item.stt)?.priceConsideration ? 'Có' : 'Không',
    'Thu máy nhanh': latestByStt.get(item.stt)?.quickDevice ? 'Có' : 'Không',
    'End flow': item.endFlow ? 'Hoàn tất' : 'Đang xử lý',
  })), [latestByStt, visible]);

  return (
    <>
      <section className="mt-6 border border-neutral-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-lg font-black text-neutral-950">Tổng kết vận hành</h2><p className="mt-1 text-sm text-neutral-500">Nguồn: Check-in, Master Điều phối và Master.</p></div>
          <div className="flex gap-2"><button type="button" onClick={refresh} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-bold hover:bg-neutral-50"><RefreshIcon className="h-4 w-4" /> Làm mới</button><button type="button" disabled={!exportRows.length} onClick={() => downloadOperations(exportRows, `nhat-ky-van-hanh-${new Date().toISOString().slice(0, 10)}.xls`)} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-neutral-900 px-3 text-sm font-bold text-white hover:bg-neutral-700 disabled:opacity-40"><DownloadIcon className="h-4 w-4" /> Tải báo cáo</button></div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Tổng khách', summary.total], ['End flow', summary.completed], ['Có thu cũ', summary.tradein], ['Có Backup', summary.backup],
            ['Cân nhắc giá', summary.price], ['Thu máy nhanh', summary.quickDevice], ['Leadtime TB', formatDuration(summary.avgLeadtime)],
          ].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3"><p className="text-xs font-bold text-neutral-500">{label}</p><p className="mt-1 text-xl font-black text-neutral-950">{value}</p></div>)}
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm STT hoặc tên khách" className="min-h-11 rounded-lg border border-neutral-300 px-3 text-sm md:col-span-2" />
          <select value={stage} onChange={(event) => setStage(event.target.value as 'all' | StageKey)} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm"><option value="all">Tất cả khâu</option>{STAGES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select>
          <div className="flex gap-2"><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="min-h-11 min-w-0 flex-1 rounded-lg border border-neutral-300 px-2 text-sm" /><input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="min-h-11 min-w-0 flex-1 rounded-lg border border-neutral-300 px-2 text-sm" /></div>
        </div>
      </section>
      <section className="mt-5 overflow-hidden border border-neutral-200 bg-white">
        <div className="overflow-x-auto"><table className="min-w-[980px] w-full border-collapse text-left text-sm"><thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500"><tr>{['STT / Khách', 'Check-in', 'Tư vấn', 'Thu cũ', 'Backup', 'Cân nhắc giá', 'Kết quả'].map((item) => <th key={item} className="border-b border-neutral-200 px-3 py-3 font-bold">{item}</th>)}</tr></thead><tbody>
          {visible.map((item: SmsJourney) => { const latest = latestByStt.get(item.stt); return <tr key={item.stt} className="border-b border-neutral-100"><td className="px-3 py-3"><p className="font-black">STT {item.stt}</p><p className="text-xs text-neutral-500">{item.name}</p></td><td className="whitespace-nowrap px-3 py-3 text-xs">{formatDate(item.checkinAt)}</td>{STAGES.map(({ key }) => <td key={key} className="px-3 py-3"><p className="font-semibold">{statusLabel(item.stages[key])}</p><p className="text-xs text-neutral-500">{item.stages[key].deskCode || '—'} · {formatDuration(item.stages[key].elapsedMs)}</p></td>)}<td className="px-3 py-3 font-semibold">{latest?.priceConsideration ? 'Có' : 'Không'}</td><td className="px-3 py-3"><p className="font-bold">{item.endFlow ? 'End flow' : 'Đang xử lý'}</p>{latest?.quickDevice && <p className="text-xs text-amber-700">Thu máy nhanh</p>}</td></tr>; })}
          {!loading && !visible.length && <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-neutral-500">Chưa có dữ liệu vận hành theo bộ lọc.</td></tr>}
        </tbody></table></div>
      </section>
    </>
  );
}
