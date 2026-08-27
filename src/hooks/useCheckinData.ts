import { useCallback, useEffect, useMemo, useState } from 'react';
import { toRuntimeConfig, useLarkSettings } from '@/config/larkSettings';
import type { LarkRecord } from '@/services/larkTypes';
import { fetchLarkData } from '@/services/larkService';
import { subscribeDashboardRealtime } from '@/services/dashboardRealtime';
import { TIMEOUT_MESSAGE, withRequestTimeout } from './requestTimeout';
import { startSerializedPolling } from './serializedPolling';

interface CheckinState {
  checkin: LarkRecord[];
  orders: LarkRecord[];
}

const EMPTY: CheckinState = { checkin: [], orders: [] };

export interface UseCheckinDataResult extends CheckinState {
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isMock: boolean;
  refresh: () => void;
}

export function useCheckinData(): UseCheckinDataResult {
  const settings = useLarkSettings();
  const cfg = useMemo(() => toRuntimeConfig(settings), [settings]);
  const [state, setState] = useState<CheckinState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [nonce, setNonce] = useState(0);
  const refresh = useCallback(() => setNonce((value) => value + 1), []);
  const sig = useMemo(() => {
    const { sleepMode: _sleepMode, ...dataSettings } = settings;
    return JSON.stringify(dataSettings);
  }, [settings]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load(initial: boolean, realtimeTables?: Awaited<ReturnType<typeof fetchLarkData>>) {
      if (initial) setLoading(true);
      const request = withRequestTimeout(controller.signal);
      try {
        const tables = realtimeTables ?? await fetchLarkData(cfg, request.signal);
        if (cancelled) return;
        setState({ checkin: tables.checkin, orders: tables.orders });
        setError(null);
        setLastUpdated(new Date());
      } catch (reason) {
        if (cancelled || controller.signal.aborted) return;
        setError(request.timedOut() ? TIMEOUT_MESSAGE : reason instanceof Error ? reason.message : String(reason));
      } finally {
        request.done();
        if (!cancelled && initial) setLoading(false);
      }
    }

    const stopPolling = startSerializedPolling(load, cfg.pollMs, () => cancelled);
    const stopRealtime = subscribeDashboardRealtime(cfg.apiUrl, (tables) => void load(false, tables));
    return () => {
      cancelled = true;
      controller.abort();
      stopPolling();
      stopRealtime();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.apiUrl, cfg.pollMs, sig, nonce]);

  return { ...state, loading, error, lastUpdated, isMock: cfg.useMock, refresh };
}
