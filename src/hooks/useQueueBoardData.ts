/**
 * useQueueBoardData — polling data source for the per-cluster queue-board
 * pages (/tuvanview, /kythuatview, /backupview).
 *
 * Mirrors `useDashboardData`'s fetch/poll/mock lifecycle but maps through
 * `queueMapper` instead of `larkMapper` directly, and lives in its own file
 * on purpose so the main dashboard's hook is never touched.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ALL_POSITIONS } from '@/config/layoutConfig';
import { DEFAULT_FIELD_CONFIG, toRuntimeConfig, useLarkSettings } from '@/config/larkSettings';
import { mockLarkTables } from '@/data/mockLarkData';
import { fetchLarkData } from '@/services/larkService';
import type { LarkTables } from '@/services/larkTypes';
import { mapQueueStates, type DeskQueueState } from '@/services/queueMapper';
import { TIMEOUT_MESSAGE, withRequestTimeout } from './requestTimeout';
import { startSerializedPolling } from './serializedPolling';
import { subscribeDashboardRealtime } from '@/services/dashboardRealtime';
import type { ClusterKey } from '@/types/desk';

export interface UseQueueBoardDataResult {
  /** Chỉ các bàn thuộc `cluster` được yêu cầu, theo đúng thứ tự trong layoutConfig. */
  desks: DeskQueueState[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isMock: boolean;
  refresh: () => void;
}

function emptyState(id: string, label: string, cluster: ClusterKey): DeskQueueState {
  return { id, label, cluster, staffName: null, current: [], next: [] };
}

export function useQueueBoardData(cluster: ClusterKey): UseQueueBoardDataResult {
  const settings = useLarkSettings();
  const cfg = useMemo(() => toRuntimeConfig(settings), [settings]);
  const isMock = cfg.useMock;
  const sig = useMemo(() => JSON.stringify(settings), [settings]);

  const [statesById, setStatesById] = useState<Record<string, DeskQueueState>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [nonce, setNonce] = useState(0);
  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    if (isMock) {
      setStatesById(mapQueueStates(mockLarkTables, DEFAULT_FIELD_CONFIG));
      setError(null);
      setLoading(false);
      setLastUpdated(new Date());
      return () => {
        cancelled = true;
      };
    }

    async function load(initial: boolean, realtimeTables?: LarkTables) {
      if (initial) setLoading(true);
      // Hết giờ thì BỎ lượt này để vòng poll đi tiếp — xem `requestTimeout.ts`.
      const req = withRequestTimeout(controller.signal);
      try {
        const tables = realtimeTables ?? await fetchLarkData(cfg, req.signal);
        if (cancelled) return;
        setStatesById(mapQueueStates(tables));
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

    const stopPolling = startSerializedPolling(load, cfg.pollMs, () => cancelled);
    const stopRealtime = subscribeDashboardRealtime(cfg.apiUrl, (realtimeTables) => void load(false, realtimeTables));
    return () => {
      cancelled = true;
      controller.abort();
      stopPolling();
      stopRealtime();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMock, sig, nonce]);

  const desks = ALL_POSITIONS.filter((p) => p.cluster === cluster).map(
    (p) => statesById[p.id] ?? emptyState(p.id, p.label, p.cluster),
  );

  return { desks, loading, error, lastUpdated, isMock, refresh };
}
