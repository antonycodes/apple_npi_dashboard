/**
 * useStaffDeskData — nguồn dữ liệu cho màn hình điện thoại của 1 nhân viên
 * (`#/nv`). Cùng vòng đời fetch/poll/mock với `useQueueBoardData`, nhưng map
 * qua `staffMapper` và chỉ trả về ĐÚNG 1 bàn.
 *
 * `deskId` rỗng (chưa chọn bàn) → không fetch gì cả, để màn hình chọn bàn
 * không tốn request.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_FIELD_CONFIG, toRuntimeConfig, useLarkSettings } from '@/config/larkSettings';
import { mockLarkTables } from '@/data/mockLarkData';
import { fetchLarkData } from '@/services/larkService';
import type { LarkTables } from '@/services/larkTypes';
import { mapStaffDeskView, type StaffDeskView } from '@/services/staffMapper';
import { TIMEOUT_MESSAGE, withRequestTimeout } from './requestTimeout';
import { startSerializedPolling } from './serializedPolling';
import { subscribeDashboardRealtime } from '@/services/dashboardRealtime';
import { useGuestSimulation } from '@/guest/GuestSimulationContext';

const EMPTY_TABLES: LarkTables = {
  checkin: [],
  orders: [],
  master: [],
  dispatch: [],
  dsMaster: [],
};

export interface UseStaffDeskDataResult {
  /** null = chưa chọn bàn, mã bàn không hợp lệ, hoặc chưa tải xong lần đầu. */
  view: StaffDeskView | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isMock: boolean;
  refresh: () => void;
}

export function useStaffDeskData(deskId: string, guestMode = false): UseStaffDeskDataResult {
  const settings = useLarkSettings();
  const guestSimulation = useGuestSimulation();
  const cfg = useMemo(() => toRuntimeConfig(settings), [settings]);
  const isMock = guestMode || cfg.useMock;
  const sig = useMemo(() => JSON.stringify(settings), [settings]);

  const [view, setView] = useState<StaffDeskView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [nonce, setNonce] = useState(0);
  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    if (!deskId) {
      setView(null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    if (isMock) {
      // Guest staff screens intentionally start empty. The guest journey is
      // demonstrated from the real Check-in queue on Guest DP, not from
      // bundled operational fixture data on TV/TC/BK.
      const guestTables = guestMode ? guestSimulation?.staffTables(deskId) ?? EMPTY_TABLES : mockLarkTables;
      setView(mapStaffDeskView(guestTables, deskId, DEFAULT_FIELD_CONFIG));
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
        setView(mapStaffDeskView(tables, deskId));
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
  }, [deskId, isMock, sig, nonce, guestSimulation]);

  return { view, loading, error, lastUpdated, isMock, refresh };
}
