import { useMemo, useRef, useState, type ReactElement } from 'react';
import { DownloadIcon } from '@/components/AppShellIcons';
import type { FieldConfig } from '@/config/larkConfig';
import type { LarkTables } from '@/services/larkTypes';
import { cellToBool, cellToString, fieldValue } from '@/services/larkMapper';
import { mapSmsJourneys } from '@/services/smsJourneyMapper';
import type { SmsJourney, SmsStageJourney } from '@/types/sms';

type StageKey = 'consult' | 'tradein' | 'backup';
type ReportStage = StageKey | 'warehouse';
type PositionCluster = 'all' | StageKey | 'warehouse';
const STAGES: Array<{ key: StageKey; label: string }> = [
  { key: 'consult', label: 'Tư vấn' },
  { key: 'tradein', label: 'Thu cũ' },
  { key: 'backup', label: 'Backup' },
];
const POSITION_CLUSTERS: Array<{ key: Exclude<PositionCluster, 'all'>; label: string }> = [
  { key: 'consult', label: 'Tư vấn' },
  { key: 'tradein', label: 'Thu cũ' },
  { key: 'backup', label: 'Backup' },
  { key: 'warehouse', label: 'Kho' },
];

interface WarehouseEvent {
  id: string;
  time: number | null;
  deskCode: string;
  scanQr: string;
  submitBy: string;
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

function todayInputValue(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shortDateValue(value: string): string {
  if (!value) return 'dd/mm';
  const [, month, day] = value.split('-');
  return month && day ? `${day}/${month}` : 'dd/mm';
}

function SortIcon({ order }: { order: 'asc' | 'desc' }): ReactElement {
  return <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d={order === 'asc' ? 'M5 3l3-2 3 2M8 1v8M11 13l-3 2-3-2M8 15V7' : 'M5 13l3 2 3-2M8 15V7M11 3L8 1 5 3M8 1v8'} strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function statusLabel(stage: SmsStageJourney): string {
  if (stage.status === 'completed') return 'Hoàn tất';
  if (stage.status === 'active') return 'Đang xử lý';
  if (stage.status === 'not-applicable') return 'Không áp dụng';
  return 'Chưa bắt đầu';
}

type OrderedStage = {
  key: StageKey;
  stage: SmsStageJourney;
};

/** Sắp xếp khâu theo thời điểm bắt đầu thực tế của từng khách. */
function orderedStages(journey: SmsJourney): OrderedStage[] {
  return STAGES
    .filter(({ key }) => journey.stages[key].status !== 'not-applicable')
    .map((item, index) => ({ ...item, stage: journey.stages[item.key], fallbackIndex: index }))
    .sort((left, right) => {
      const leftStartedAt = left.stage.startedAt;
      const rightStartedAt = right.stage.startedAt;
      if (leftStartedAt !== null && rightStartedAt !== null) {
        return leftStartedAt - rightStartedAt || left.fallbackIndex - right.fallbackIndex;
      }
      if (leftStartedAt !== null) return -1;
      if (rightStartedAt !== null) return 1;
      return left.fallbackIndex - right.fallbackIndex;
    })
    .map(({ key, stage }) => ({ key, stage }));
}

function exportStageValue(item: OrderedStage | undefined): string {
  if (!item) return '—';
  const stage = item.stage;
  const desk = stage.deskCode || '—';
  return `${stage.label} · ${statusLabel(stage)} · ${desk} · ${formatDuration(stage.elapsedMs)}`;
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

export default function OperationsLogPanel({ tables, fields, loading }: {
  tables: LarkTables;
  fields: FieldConfig;
  loading: boolean;
}) {
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [stage, setStage] = useState<'all' | ReportStage>('all');
  const [position, setPosition] = useState('all');
  const [positionCluster, setPositionCluster] = useState<PositionCluster>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const fromDateRef = useRef<HTMLInputElement>(null);
  const toDateRef = useRef<HTMLInputElement>(null);
  const journeys = useMemo(() => Array.from(mapSmsJourneys(tables, fields).values()), [tables, fields]);
  const latestByStt = useMemo(() => latestMasterByStt(tables, fields), [tables, fields]);
  const warehouseEvents = useMemo(() => warehouseEventsFromMaster(tables, fields), [tables, fields]);
  const positions = useMemo(() => Array.from(new Set([
    ...journeys.flatMap((journey) => STAGES.map(({ key }) => journey.stages[key].deskCode).filter((item): item is string => Boolean(item))),
    ...warehouseEvents.map((event) => event.deskCode).filter((item): item is string => item !== '—'),
  ])).filter((item) => positionCluster === 'all' || (positionCluster === 'warehouse' ? item.startsWith('KHO') : positionCluster === 'consult' ? item.startsWith('TV') : positionCluster === 'tradein' ? item.startsWith('TC') : item.startsWith('BK'))).sort((left, right) => left.localeCompare(right, 'vi', { numeric: true })), [journeys, positionCluster, warehouseEvents]);
  const filteredWarehouseEvents = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('vi');
    const fromMs = from ? dateValue(from) : 0;
    const toMs = to ? dateValue(to) + 86400000 - 1 : Number.MAX_SAFE_INTEGER;
    return warehouseEvents.filter((event) => {
      const searchable = `${event.deskCode} ${event.scanQr} ${event.submitBy}`.toLocaleLowerCase('vi');
      return (!needle || searchable.includes(needle)) && (positionCluster === 'all' || positionCluster === 'warehouse') && (position === 'all' || event.deskCode === position) && (!event.time || (event.time >= fromMs && event.time <= toMs));
    });
  }, [from, position, positionCluster, query, to, warehouseEvents]);
  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('vi');
    const fromMs = from ? dateValue(from) : 0;
    const toMs = to ? dateValue(to) + 86400000 - 1 : Number.MAX_SAFE_INTEGER;
    return journeys.filter((journey) => {
      const matchesQuery = !needle || journey.stt.toLocaleLowerCase('vi').includes(needle) || journey.name.toLocaleLowerCase('vi').includes(needle);
      const matchesDate = !journey.checkinAt || (journey.checkinAt >= fromMs && journey.checkinAt <= toMs);
      const matchesStage = stage === 'all' || stage === 'warehouse' || journey.stages[stage].status !== 'not-applicable';
      const matchesPosition = position === 'all' || STAGES.some(({ key }) => journey.stages[key].deskCode === position);
      const matchesPositionCluster = positionCluster === 'all' || positionCluster === 'warehouse' || Boolean(journey.stages[positionCluster].deskCode);
      return matchesQuery && matchesDate && matchesStage && matchesPosition && matchesPositionCluster;
    }).sort((left, right) => {
      const leftStt = Number(left.stt);
      const rightStt = Number(right.stt);
      const comparison = Number.isFinite(leftStt) && Number.isFinite(rightStt)
        ? leftStt - rightStt
        : left.stt.localeCompare(right.stt, 'vi', { numeric: true });
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [from, journeys, position, positionCluster, query, sortOrder, stage, to]);
  const summary = useMemo(() => {
    const stageFiltered = stage === 'warehouse' ? [] : stage === 'all' ? STAGES : STAGES.filter((item) => item.key === stage);
    const activeStages = positionCluster === 'all' || positionCluster === 'warehouse' ? (positionCluster === 'warehouse' ? [] : stageFiltered) : stageFiltered.filter((item) => item.key === positionCluster);
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
  }, [filteredWarehouseEvents.length, latestByStt, positionCluster, stage, visible]);
  const isTodayFilter = from === todayInputValue() && to === todayInputValue();
  const exportRows = useMemo(() => [
    ...visible.map((item) => {
      const stages = orderedStages(item);
      return {
        'Loại dòng': 'Khách hàng',
        STT: item.stt,
        'Khách hàng': item.name,
        'Check-in': formatDate(item.checkinAt),
        'Khâu 1': exportStageValue(stages[0]),
        'Khâu 2': exportStageValue(stages[1]),
        'Khâu 3': exportStageValue(stages[2]),
        'Cân nhắc giá': latestByStt.get(item.stt)?.priceConsideration ? 'Có' : 'Không',
        'Thu máy nhanh': latestByStt.get(item.stt)?.quickDevice ? 'Có' : 'Không',
        Kho: 'Theo dõi bảng bàn giao Kho',
        'End flow': item.endFlow ? 'Hoàn tất' : 'Đang xử lý',
      };
    }),
    ...filteredWarehouseEvents.map((event) => ({
      'Loại dòng': 'Kho',
      STT: '—',
      'Khách hàng': 'Bàn giao Kho',
      'Check-in': formatDate(event.time),
      'Khâu 1': '—',
      'Khâu 2': '—',
      'Khâu 3': '—',
      'Cân nhắc giá': '—',
      'Thu máy nhanh': '—',
      Kho: `Đã bàn giao · ${event.deskCode}`,
      'End flow': '—',
    })),
  ], [filteredWarehouseEvents, latestByStt, visible]);

  return (
    <>
      <section id="operations-summary" className="mt-5 border border-neutral-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-4 py-4 sm:px-5">
          <div><h2 className="font-black text-neutral-950">Tổng kết vận hành</h2><p className="mt-1 text-xs text-neutral-500">Nguồn: Check-in, Master Điều phối và Master.</p></div>
          <button type="button" disabled={!exportRows.length} onClick={() => downloadOperations(exportRows, `nhat-ky-van-hanh-${new Date().toISOString().slice(0, 10)}.xls`)} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-neutral-900 px-3 text-sm font-bold text-white hover:bg-neutral-700 disabled:opacity-40"><DownloadIcon className="h-4 w-4" /> Tải báo cáo</button>
        </div>
        <div className="p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Tổng khách', summary.total], ['End flow', summary.completed], ['Có thu cũ', summary.tradein], ['Có Backup', summary.backup],
            ['Cân nhắc giá', summary.price], ['Thu máy nhanh', summary.quickDevice], ['Bàn giao Kho', summary.warehouse], ['Thời gian phục vụ TB', formatDuration(summary.avgLeadtime)],
          ].map(([label, value]) => <div key={String(label)} className="border border-neutral-200 bg-neutral-50 px-3 py-3"><p className="text-xs font-bold text-neutral-600">{label}</p><p className="mt-1 text-xl font-black text-neutral-950">{value}</p></div>)}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-5">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm STT, tên khách, bàn hoặc QR" className="min-h-11 rounded-lg border border-neutral-300 px-3 text-sm md:col-span-2" />
          <select value={stage} onChange={(event) => setStage(event.target.value as 'all' | ReportStage)} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm"><option value="all">Tất cả khâu</option>{STAGES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}<option value="warehouse">Kho</option></select>
          <select value={positionCluster} onChange={(event) => { setPositionCluster(event.target.value as PositionCluster); setPosition('all'); }} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm"><option value="all">Tất cả phân loại vị trí</option>{POSITION_CLUSTERS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select>
          <select value={position} onChange={(event) => setPosition(event.target.value)} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm"><option value="all">Tất cả vị trí</option>{positions.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <div className="flex h-11 flex-nowrap items-stretch gap-2"><label onClick={() => fromDateRef.current?.showPicker?.()} className="relative flex h-11 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-lg border border-neutral-300 bg-white px-2 text-center text-sm leading-none text-neutral-900"><span aria-hidden="true" className="pointer-events-none">{shortDateValue(from)}</span><input ref={fromDateRef} type="date" lang="vi-VN" aria-label="Từ ngày" value={from} onChange={(event) => setFrom(event.target.value)} className="pointer-events-none absolute inset-0 h-full w-full cursor-pointer opacity-0" /></label><label onClick={() => toDateRef.current?.showPicker?.()} className="relative flex h-11 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-lg border border-neutral-300 bg-white px-2 text-center text-sm leading-none text-neutral-900"><span aria-hidden="true" className="pointer-events-none">{shortDateValue(to)}</span><input ref={toDateRef} type="date" lang="vi-VN" aria-label="Đến ngày" value={to} onChange={(event) => setTo(event.target.value)} className="pointer-events-none absolute inset-0 h-full w-full cursor-pointer opacity-0" /></label><button type="button" aria-pressed={isTodayFilter} onClick={() => { const today = todayInputValue(); setFrom(today); setTo(today); }} className={`h-11 shrink-0 whitespace-nowrap rounded-lg border px-2 text-sm font-bold leading-none sm:px-3 ${isTodayFilter ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50'}`}>Hôm nay</button></div>
          </div>
        </div>
      </section>
      {stage !== 'warehouse' && <section id="customer-log" className="mt-5 overflow-hidden border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-4 py-4 sm:px-5"><h2 className="font-black text-neutral-950">Nhật ký khách hàng</h2><p className="mt-1 text-xs text-neutral-500">Các khâu được hiển thị theo thứ tự bắt đầu thực tế của từng khách.</p></div>
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full border-collapse text-left text-sm">
            <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-700">
              <tr>
                <th className="border-b border-neutral-200 px-3 py-3 font-bold">
                  <button type="button" onClick={() => setSortOrder((current) => current === 'asc' ? 'desc' : 'asc')} className="inline-flex items-center gap-1.5 rounded-md text-left hover:text-neutral-950" title={sortOrder === 'asc' ? 'Đang sắp xếp STT tăng dần. Bấm để giảm dần.' : 'Đang sắp xếp STT giảm dần. Bấm để tăng dần.'} aria-label={sortOrder === 'asc' ? 'Đổi sang sắp xếp STT giảm dần' : 'Đổi sang sắp xếp STT tăng dần'}>
                    STT / Khách<SortIcon order={sortOrder} />
                  </button>
                </th>
                {['Check-in', 'Khâu 1', 'Khâu 2', 'Khâu 3', 'Cân nhắc giá', 'Kết quả'].map((item) => <th key={item} className="border-b border-neutral-200 px-3 py-3 font-bold">{item}</th>)}
              </tr>
            </thead>
            <tbody>
              {visible.map((item: SmsJourney) => {
                const latest = latestByStt.get(item.stt);
                const stages = orderedStages(item);
                return (
                  <tr key={item.stt} className="border-b border-neutral-100">
                    <td className="px-3 py-3"><p className="font-black">STT {item.stt}</p><p className="text-xs text-neutral-500">{item.name}</p></td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs">{formatDate(item.checkinAt)}</td>
                    {[0, 1, 2].map((index) => {
                      const itemStage = stages[index];
                      return (
                        <td key={itemStage?.key ?? `empty-stage-${index}`} className="px-3 py-3">
                          {itemStage ? <><p className="text-xs font-bold text-neutral-500">{itemStage.stage.label}</p><p className="font-semibold">{statusLabel(itemStage.stage)}</p><p className="text-xs text-neutral-500">{itemStage.stage.deskCode || '—'} · {formatDuration(itemStage.stage.elapsedMs)}</p></> : <span className="text-neutral-400">—</span>}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 font-semibold">{latest?.priceConsideration ? 'Có' : 'Không'}</td>
                    <td className="px-3 py-3"><p className="font-bold">{item.endFlow ? 'End flow' : 'Đang xử lý'}</p>{latest?.quickDevice && <p className="text-xs text-amber-700">Thu máy nhanh</p>}</td>
                  </tr>
                );
              })}
              {!loading && !visible.length && <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-neutral-500">Chưa có dữ liệu vận hành theo bộ lọc.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>}
      {(stage === 'all' || stage === 'warehouse') && <section id="warehouse-log" className="mt-5 overflow-hidden border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-4 py-3"><h2 className="font-black text-neutral-950">Nhật ký bàn giao Kho</h2><p className="mt-1 text-xs text-neutral-500">Nguồn: Master · Trạng thái “Bàn giao kho”. Các dòng này không có STT khách.</p></div>
        <div className="overflow-x-auto"><table className="min-w-[700px] w-full border-collapse text-left text-sm"><thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-700"><tr>{['Thời gian', 'Bàn nhận', 'QR máy', 'Người thao tác', 'Kết quả'].map((item) => <th key={item} className="border-b border-neutral-200 px-3 py-3 font-bold">{item}</th>)}</tr></thead><tbody>
          {filteredWarehouseEvents.map((event) => <tr key={event.id} className="border-b border-neutral-100"><td className="whitespace-nowrap px-3 py-3 text-xs">{formatDate(event.time)}</td><td className="px-3 py-3 font-bold">{event.deskCode}</td><td className="px-3 py-3 text-xs">{event.scanQr}</td><td className="px-3 py-3 text-xs">{event.submitBy}</td><td className="px-3 py-3 font-semibold text-emerald-700">Đã bàn giao</td></tr>)}
          {!loading && !filteredWarehouseEvents.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-neutral-500">Chưa có dữ liệu bàn giao Kho theo bộ lọc.</td></tr>}
        </tbody></table></div>
      </section>}
    </>
  );
}
