import { useCallback, useEffect, useMemo, useState } from 'react';
import { toFieldConfig, toRuntimeConfig, useLarkSettings } from '@/config/larkSettings';
import { mockLarkTables } from '@/data/mockLarkData';
import { fetchTableRecords } from '@/services/larkClient';
import { cellToString, fieldValue, normalizeDeskCode } from '@/services/larkMapper';
import type { LarkRecord } from '@/services/larkTypes';
import type { KhoStaffInfo } from '@/services/khoMapper';
import { TIMEOUT_MESSAGE, withRequestTimeout } from './requestTimeout';
import { startSerializedPolling } from './serializedPolling';

export interface KhoHandoverHistoryItem {
  id: string;
  deskCode: string;
  recipientName: string | null;
  submittedBy: string | null;
  scanQr: string | null;
  time: number;
  images: Array<{ fileToken: string; name: string | null; sourceRecordId: string; sourceRevision?: number }>;
}

interface Result {
  items: KhoHandoverHistoryItem[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

function parseTime(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value < 1e12 ? value * 1000 : value;
  if (typeof value === 'string') {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric < 1e12 ? numeric * 1000 : numeric;
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function mapHistory(rows: LarkRecord[], staffByDesk: Map<string, KhoStaffInfo>): KhoHandoverHistoryItem[] {
  const fm = toFieldConfig().master;
  return rows
    .filter((row) => cellToString(fieldValue(row.fields, fm.status))?.trim() === 'Bàn giao kho')
    .map((row) => {
      const scanQr = cellToString(fieldValue(row.fields, fm.scanQr));
      const deskValue = cellToString(fieldValue(row.fields, fm.deskCode));
      // Bàn nhận được xác định bởi QR kho quét. Một số dòng workflow không
      // đẩy `TV_MãNV`, nên không dùng ô đó làm nguồn duy nhất.
      const deskCode = normalizeDeskCode(scanQr) ?? normalizeDeskCode(deskValue) ?? deskValue ?? '—';
      const rawImages = fieldValue(row.fields, fm.hinhNghiemThu);
      const images = Array.isArray(rawImages)
        ? rawImages.flatMap((part) => {
            if (typeof part !== 'object' || !part || typeof part.file_token !== 'string' || !part.file_token.trim()) return [];
            let sourceRevision: number | undefined;
            try {
              const extra = typeof part.url === 'string' ? new URL(part.url).searchParams.get('extra') : null;
              const revision = extra ? JSON.parse(extra)?.bitablePerm?.rev : undefined;
              if (Number.isFinite(Number(revision))) sourceRevision = Number(revision);
            } catch { /* optional attachment metadata */ }
            return [{ fileToken: part.file_token.trim(), name: typeof part.name === 'string' ? part.name : null, sourceRecordId: row.record_id, sourceRevision }];
          })
        : [];
      return {
        id: row.record_id,
        deskCode,
        recipientName: staffByDesk.get(deskCode)?.name ?? cellToString(fieldValue(row.fields, fm.name)),
        submittedBy: cellToString(fieldValue(row.fields, fm.submitBy)),
        scanQr,
        time: parseTime(fieldValue(row.fields, fm.time)),
        images,
      };
    })
    .sort((a, b) => b.time - a.time);
}

export function useKhoHandoverHistory(staffByDesk: Map<string, KhoStaffInfo>, guestMode = false): Result {
  const settings = useLarkSettings();
  const cfg = useMemo(() => toRuntimeConfig(settings), [settings]);
  const sig = useMemo(() => JSON.stringify(settings), [settings]);
  const [items, setItems] = useState<KhoHandoverHistoryItem[]>([]);
  const [loading, setLoading] = useState(!guestMode);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [nonce, setNonce] = useState(0);
  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    if (guestMode || cfg.useMock) {
      setItems(mapHistory(mockLarkTables.master, staffByDesk));
      setLoading(false);
      setError(null);
      setLastUpdated(new Date());
      return () => { cancelled = true; };
    }
    async function load(initial: boolean) {
      if (initial) setLoading(true);
      const req = withRequestTimeout(controller.signal);
      try {
        const rows = await fetchTableRecords(cfg, 'master', req.signal);
        if (cancelled) return;
        setItems(mapHistory(rows, staffByDesk));
        setError(null);
        setLastUpdated(new Date());
      } catch (err) {
        if (cancelled || controller.signal.aborted) return;
        setError(req.timedOut() ? TIMEOUT_MESSAGE : err instanceof Error ? err.message : String(err));
      } finally {
        req.done();
        if (!cancelled && initial) setLoading(false);
      }
    }
    const stop = startSerializedPolling(load, cfg.pollMs, () => cancelled);
    return () => { cancelled = true; controller.abort(); stop(); };
  }, [cfg, guestMode, sig, nonce, staffByDesk]);

  return { items, loading, error, lastUpdated, refresh };
}
