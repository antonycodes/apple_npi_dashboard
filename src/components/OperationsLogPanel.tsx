import { useMemo, useState } from 'react';
import { DownloadIcon, RefreshIcon } from '@/components/AppShellIcons';
import type { FieldConfig } from '@/config/larkConfig';
import type { LarkTables } from '@/services/larkTypes';
import { cellToBool, cellToString, fieldValue } from '@/services/larkMapper';
import { mapSmsJourneys } from '@/services/smsJourneyMapper';
import type { SmsJourney, SmsStageJourney } from '@/types/sms';

type StageKey = 'consult' | 'tradein' | 'backup';
type ReportStage = StageKey | 'warehouse';
const STAGES: Array<{ key: StageKey; label: string }> = [
  { key: 'consult', label: 'Tư vấn' },
  { key: 'tradein', label: 'Thu cũ' },
  { key: 'backup', label: 'Backup' },
];

interface WarehouseEvent {
  id: string;
  time: number | null;
  deskCode: string;
  scanQr: string;
  submitBy: string;
}

interface PositionLeadtime {
  position: string;
  samples: number;
  averageMs: number;
}

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

function warehouseEventsFromMaster(tables: LarkTables, fields: FieldConfig): WarehouseEvent[] {
  return tables.master
    .filter((row) => cellToString(fieldValue(row.fields, fields.master.status)) === 'Bàn giao kho')
    .map((row) => {
      const rawTime = cellToString(fieldValue(row.fields, fields.master.time));
      const parsedTime = Number(rawTime) || Date.parse(rawTime ?? '') || 0;
      return {
        id: row.record_id,
        time: parsedTime || null,
        deskCode: cellToString(fieldValue(row.fields, fields.master.deskCode)) || '—',
        scanQr: cellToString(fieldValue(row.fields, fields.master.scanQr)) || '—',
        submitBy: cellToString(fieldValue(row.fields, fields.master.submitBy)) || '—',
      };
    })
    .sort((left, right) => (right.time ?? 0) - (left.time ?? 0));
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
  const [stage, setStage] = useState<'all' | ReportStage>('all');
  const [position, setPosition] = useState('all');
  const journeys = useMemo(() => Array.from(mapSmsJourneys(tables, fields).values()), [tables, fields]);
  const latestByStt = useMemo(() => latestMasterByStt(tables, fields), [tables, fields]);
  const warehouseEvents = useMemo(() => warehouseEventsFromMaster(tables, fields), [tables, fields]);
  const positions = useMemo(() => Array.from(new Set([
    ...journeys.flatMap((journey) => STAGES.map(({ key }) => journey.stages[key].deskCode).filter((item): item is string => Boolean(item))),
    ...warehouseEvents.map((event) => event.deskCode).filter((item): item is string => item !== '—'),
  ])).sort((left, right) => left.localeCompare(right, 'vi')), [journeys, warehouseEvents]);
  const filteredWarehouseEvents = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('vi');
    const fromMs = from ? dateValue(from) : 0;
    const toMs = to ? dateValue(to) + 86400000 - 1 : Number.MAX_SAFE_INTEGER;
    return warehouseEvents.filter((event) => {
      const searchable = `${event.deskCode} ${event.scanQr} ${event.submitBy}`.toLocaleLowerCase('vi');
      return (!needle || searchable.includes(needle)) && (position === 'all' || event.deskCode === position) && (!event.time || (event.time >= fromMs && event.time <= toMs));
    });
  }, [from, position, query, to, warehouseEvents]);
  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('vi');
    const fromMs = from ? dateValue(from) : 0;
    const toMs = to ? dateValue(to) + 86400000 - 1 : Number.MAX_SAFE_INTEGER;
    return journeys.filter((journey) => {
      const matchesQuery = !needle || journey.stt.toLocaleLowerCase('vi').includes(needle) || journey.name.toLocaleLowerCase('vi').includes(needle);
      const matchesDate = !journey.checkinAt || (journey.checkinAt >= fromMs && journey.checkinAt <= toMs);
      const matchesStage = stage === 'all' || stage === 'warehouse' || journey.stages[stage].status !== 'not-applicable';
      const matchesPosition = position === 'all' || STAGES.some(({ key }) => journey.stages[key].deskCode === position);
      return matchesQuery && matchesDate && matchesStage && matchesPosition;
    });
  }, [from, journeys, position, query, stage, to]);
  const leadtimeByPosition = useMemo<PositionLeadtime[]>(() => {
    const grouped = new Map<string, { totalMs: number; samples: number }>();
    const activeStages = stage === 'warehouse' ? [] : stage === 'all' ? STAGES : STAGES.filter((item) => item.key === stage);
    visible.forEach((journey) => activeStages.forEach(({ key }) => {
      const stageJourney = journey.stages[key];
      if (!stageJourney.deskCode || !stageJourney.elapsedMs) return;
      const current = grouped.get(stageJourney.deskCode) ?? { totalMs: 0, samples: 0 };
      grouped.set(stageJourney.deskCode, {
        totalMs: current.totalMs + stageJourney.elapsedMs,
        samples: current.samples + 1,
      });
    }));
    return Array.from(grouped.entries())
      .map(([desk, value]) => ({ position: desk, samples: value.samples, averageMs: value.totalMs / value.samples }))
      .sort((left, right) => left.position.localeCompare(right.position, 'vi'));
  }, [stage, visible]);
  const leadtimeChart = useMemo(() => {
    const rows = [...leadtimeByPosition].sort((left, right) => right.averageMs - left.averageMs);
    return { rows, maxMs: rows[0]?.averageMs ?? 0 };
  }, [leadtimeByPosition]);
  const summary = useMemo(() => {
    const activeStages = stage === 'warehouse' ? [] : stage === 'all' ? STAGES : STAGES.filter((item) => item.key === stage);
    const leadtimes = visible.flatMap((item) => activeStages.map(({ key }) => item.stages[key].elapsedMs).filter((value): value is number => Boolean(value)));
    return {
      total: visible.length,
      completed: visible.filter((item) => item.endFlow).length,
      tradein: visible.filter((item) => item.stages.tradein.status !== 'not-applicable').length,
      backup: visible.filter((item) => item.stages.backup.status !== 'not-applicable').length,
      price: visible.filter((item) => latestByStt.get(item.stt)?.priceConsideration).length,
      quickDevice: visible.filter((item) => latestByStt.get(item.stt)?.quickDevice).length,
      warehouse: filteredWarehouseEvents.length,
      avgLeadtime: leadtimes.length ? leadtimes.reduce((sum, value) => sum + value, 0) / leadtimes.length : null,
    };
  }, [filteredWarehouseEvents.length, latestByStt, stage, visible]);
  const exportRows = useMemo(() => [
    ...visible.map((item) => ({
    'Loại dòng': 'Khách hàng',
    STT: item.stt,
    'Khách hàng': item.name,
    'Check-in': formatDate(item.checkinAt),
    'Tư vấn': statusLabel(item.stages.consult),
    'Thu cũ': statusLabel(item.stages.tradein),
    'Backup': statusLabel(item.stages.backup),
    'Cân nhắc giá': latestByStt.get(item.stt)?.priceConsideration ? 'Có' : 'Không',
    'Thu máy nhanh': latestByStt.get(item.stt)?.quickDevice ? 'Có' : 'Không',
    Kho: 'Theo dõi bảng bàn giao Kho',
    'End flow': item.endFlow ? 'Hoàn tất' : 'Đang xử lý',
    })),
    ...filteredWarehouseEvents.map((event) => ({
      'Loại dòng': 'Kho',
      STT: '—',
      'Khách hàng': 'Bàn giao Kho',
      'Check-in': formatDate(event.time),
      'Tư vấn': '—',
      'Thu cũ': '—',
      Backup: '—',
      'Cân nhắc giá': '—',
      'Thu máy nhanh': '—',
      Kho: `Đã bàn giao · ${event.deskCode}`,
      'End flow': '—',
    })),
  ], [filteredWarehouseEvents, latestByStt, visible]);

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
            ['Cân nhắc giá', summary.price], ['Thu máy nhanh', summary.quickDevice], ['Bàn giao Kho', summary.warehouse], ['Leadtime TB', formatDuration(summary.avgLeadtime)],
          ].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3"><p className="text-xs font-bold text-neutral-500">{label}</p><p className="mt-1 text-xl font-black text-neutral-950">{value}</p></div>)}
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-5">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm STT, tên khách, bàn hoặc QR" className="min-h-11 rounded-lg border border-neutral-300 px-3 text-sm md:col-span-2" />
          <select value={stage} onChange={(event) => setStage(event.target.value as 'all' | ReportStage)} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm"><option value="all">Tất cả khâu</option>{STAGES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}<option value="warehouse">Kho</option></select>
          <select value={position} onChange={(event) => setPosition(event.target.value)} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm"><option value="all">Tất cả vị trí</option>{positions.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <div className="flex gap-2"><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="min-h-11 min-w-0 flex-1 rounded-lg border border-neutral-300 px-2 text-sm" /><input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="min-h-11 min-w-0 flex-1 rounded-lg border border-neutral-300 px-2 text-sm" /></div>
        </div>
      </section>
      {stage !== 'warehouse' && <section className="mt-5 overflow-hidden border border-neutral-200 bg-white">
        <div className="overflow-x-auto"><table className="min-w-[980px] w-full border-collapse text-left text-sm"><thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500"><tr>{['STT / Khách', 'Check-in', 'Tư vấn', 'Thu cũ', 'Backup', 'Cân nhắc giá', 'Kết quả'].map((item) => <th key={item} className="border-b border-neutral-200 px-3 py-3 font-bold">{item}</th>)}</tr></thead><tbody>
          {visible.map((item: SmsJourney) => { const latest = latestByStt.get(item.stt); return <tr key={item.stt} className="border-b border-neutral-100"><td className="px-3 py-3"><p className="font-black">STT {item.stt}</p><p className="text-xs text-neutral-500">{item.name}</p></td><td className="whitespace-nowrap px-3 py-3 text-xs">{formatDate(item.checkinAt)}</td>{STAGES.map(({ key }) => <td key={key} className="px-3 py-3"><p className="font-semibold">{statusLabel(item.stages[key])}</p><p className="text-xs text-neutral-500">{item.stages[key].deskCode || '—'} · {formatDuration(item.stages[key].elapsedMs)}</p></td>)}<td className="px-3 py-3 font-semibold">{latest?.priceConsideration ? 'Có' : 'Không'}</td><td className="px-3 py-3"><p className="font-bold">{item.endFlow ? 'End flow' : 'Đang xử lý'}</p>{latest?.quickDevice && <p className="text-xs text-amber-700">Thu máy nhanh</p>}</td></tr>; })}
          {!loading && !visible.length && <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-neutral-500">Chưa có dữ liệu vận hành theo bộ lọc.</td></tr>}
        </tbody></table></div>
      </section>}
      <section className="mt-5 overflow-hidden border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-4 py-3"><h2 className="font-black text-neutral-950">Leadtime trung bình theo vị trí</h2><p className="mt-1 text-xs text-neutral-500">Tính theo từng lượt xử lý đã có đủ thời gian tại vị trí. Bộ lọc khâu, vị trí và ngày được áp dụng.</p></div>
        {leadtimeChart.rows.length > 0 && <div className="border-b border-neutral-200 p-4 sm:p-5"><div className="space-y-3" role="img" aria-label="Biểu đồ leadtime trung bình theo vị trí">
          {leadtimeChart.rows.map((item) => <div key={item.position} className="grid grid-cols-[5rem_minmax(0,1fr)_5rem] items-center gap-3 text-sm"><span className="truncate font-black text-neutral-800" title={item.position}>{item.position}</span><div className="h-7 overflow-hidden rounded-md bg-neutral-100"><div className="flex h-full min-w-1 items-center rounded-md bg-emerald-500 px-2 text-xs font-bold text-white transition-all" style={{ width: `${Math.max(3, (item.averageMs / leadtimeChart.maxMs) * 100)}%` }}>{formatDuration(item.averageMs)}</div></div><span className="text-right text-xs text-neutral-500">{item.samples} lượt</span></div>)}
        </div></div>}
        <div className="overflow-x-auto"><table className="min-w-[520px] w-full border-collapse text-left text-sm"><thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500"><tr>{['Vị trí', 'Số lượt', 'Leadtime trung bình'].map((item) => <th key={item} className="border-b border-neutral-200 px-3 py-3 font-bold">{item}</th>)}</tr></thead><tbody>
          {leadtimeByPosition.map((item) => <tr key={item.position} className="border-b border-neutral-100"><td className="px-3 py-3 font-black">{item.position}</td><td className="px-3 py-3">{item.samples}</td><td className="px-3 py-3 font-bold">{formatDuration(item.averageMs)}</td></tr>)}
          {!leadtimeByPosition.length && <tr><td colSpan={3} className="px-4 py-10 text-center text-sm text-neutral-500">Chưa có leadtime theo vị trí trong bộ lọc.</td></tr>}
        </tbody></table></div>
      </section>
      {(stage === 'all' || stage === 'warehouse') && <section className="mt-5 overflow-hidden border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-4 py-3"><h2 className="font-black text-neutral-950">Nhật ký bàn giao Kho</h2><p className="mt-1 text-xs text-neutral-500">Nguồn: Master · Trạng thái “Bàn giao kho”. Các dòng này không có STT khách.</p></div>
        <div className="overflow-x-auto"><table className="min-w-[700px] w-full border-collapse text-left text-sm"><thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500"><tr>{['Thời gian', 'Bàn nhận', 'QR máy', 'Người thao tác', 'Kết quả'].map((item) => <th key={item} className="border-b border-neutral-200 px-3 py-3 font-bold">{item}</th>)}</tr></thead><tbody>
          {filteredWarehouseEvents.map((event) => <tr key={event.id} className="border-b border-neutral-100"><td className="whitespace-nowrap px-3 py-3 text-xs">{formatDate(event.time)}</td><td className="px-3 py-3 font-bold">{event.deskCode}</td><td className="px-3 py-3 text-xs">{event.scanQr}</td><td className="px-3 py-3 text-xs">{event.submitBy}</td><td className="px-3 py-3 font-semibold text-emerald-700">Đã bàn giao</td></tr>)}
          {!loading && !filteredWarehouseEvents.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-neutral-500">Chưa có dữ liệu bàn giao Kho theo bộ lọc.</td></tr>}
        </tbody></table></div>
      </section>}
    </>
  );
}
