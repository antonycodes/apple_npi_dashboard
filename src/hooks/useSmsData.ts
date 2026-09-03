import { useCallback, useEffect, useMemo, useState } from 'react';
import { mockLarkTables } from '@/data/mockLarkData';
import { toFieldConfig, toRuntimeConfig, useLarkSettings } from '@/config/larkSettings';
import { subscribeDashboardRealtime } from '@/services/dashboardRealtime';
import { fetchLarkData } from '@/services/larkService';
import type { LarkTables } from '@/services/larkTypes';
import { mapSmsJourneys } from '@/services/smsJourneyMapper';
import { TIMEOUT_MESSAGE, withRequestTimeout } from './requestTimeout';
import { startSerializedPolling } from './serializedPolling';

const EMPTY_TABLES: LarkTables = {
  checkin: [],
  orders: [],
  master: [],
  dispatch: [],
  dsMaster: [],
};

export function useSmsData() {
  const settings = useLarkSettings();
  const cfg = useMemo(() => toRuntimeConfig(settings), [settings]);
  const fields = useMemo(() => toFieldConfig(settings), [settings]);
  const [tables, setTables] = useState<LarkTables>(EMPTY_TABLES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [nonce, setNonce] = useState(0);
  const refresh = useCallback(() => setNonce((value) => value + 1), []);
  const signature = useMemo(() => JSON.stringify({ cfg, fields }), [cfg, fields]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    if (cfg.useMock) {
      setTables(mockLarkTables);
      setError(null);
      setLastUpdated(new Date());
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    async function load(initial: boolean, realtimeTables?: LarkTables) {
      if (initial) setLoading(true);
      const request = withRequestTimeout(controller.signal);
      try {
        const next = realtimeTables ?? await fetchLarkData(cfg, request.signal);
        if (cancelled) return;
        setTables(next);
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
    const stopRealtime = subscribeDashboardRealtime(cfg.apiUrl, (next) => void load(false, next));
    return () => {
      cancelled = true;
      controller.abort();
      stopPolling();
      stopRealtime();
    };
    // `signature` captures every runtime field used by this isolated data view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce, signature]);

  const journeys = useMemo(() => mapSmsJourneys(tables, fields), [fields, tables]);
  return { journeys, loading, error, lastUpdated, refresh, settings };
}
