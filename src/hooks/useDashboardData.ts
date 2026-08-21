/**
 * useDashboardData — the dashboard's data source.
 *
 * Reads the runtime Lark settings. Mock mode maps the bundled workbook; live
 * mode fetches Lark every `pollMs` (read-only). Re-syncs when settings change.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ALL_POSITIONS } from '@/config/layoutConfig';
import { toRuntimeConfig, useLarkSettings } from '@/config/larkSettings';
import { mockLarkTables } from '@/data/mockLarkData';
import { DEFAULT_FIELD_CONFIG } from '@/config/larkSettings';
import { fetchLarkData } from '@/services/larkService';
import type { LarkTables } from '@/services/larkTypes';
import { mapDeskStates } from '@/services/larkMapper';
import { mapPendingDevices, type StaffCustomer } from '@/services/staffMapper';
import { TIMEOUT_MESSAGE, withRequestTimeout } from './requestTimeout';
import { startSerializedPolling } from './serializedPolling';
import { subscribeDashboardRealtime } from '@/services/dashboardRealtime';
import {
  computeSummary,
  type DashboardSummary,
  type DeskData,
  type DeskLiveState,
  type RosterEntry,
  type WaitingCustomer,
} from '@/types/desk';

interface RawState {
  statesById: Record<string, DeskLiveState>;
  totalCheckIn: number;
  totalRegistered: number;
  waitingCheckin: WaitingCustomer[];
  waitingDispatch: WaitingCustomer[];
  endFlow: WaitingCustomer[];
  roster: RosterEntry[];
  unresolvedDeskNames: string[];
  pendingDevice: StaffCustomer[];
}

const EMPTY: RawState = {
  statesById: {},
  totalCheckIn: 0,
  totalRegistered: 0,
  waitingCheckin: [],
  waitingDispatch: [],
  endFlow: [],
  roster: [],
  unresolvedDeskNames: [],
  pendingDevice: [],
};

export interface UseDashboardDataResult {
  desks: DeskData[];
  summary: DashboardSummary;
  /** Đã check-in, chưa từng vào bàn nào — chờ điều phối lần đầu. */
  waitingCheckin: WaitingCustomer[];
  /** Vừa hoàn tất 1 cụm, chờ điều phối sang cụm tiếp theo. */
  waitingDispatch: WaitingCustomer[];
  /** Đã hoàn tất toàn bộ quy trình (Check-in "End flow"). */
  endFlow: WaitingCustomer[];
  /** Roster nhân sự (`Master_DS`) — chỉ form Điều phối dùng, không vẽ gì lên sơ đồ. */
  roster: RosterEntry[];
  /** Tên khách ở các dòng `Master` không xác định được bàn — bị bỏ khỏi sơ đồ. */
  unresolvedDeskNames: string[];
  /** Khách còn máy cũ chưa thu (`Thu lại máy` = "Thu máy sau" ở dòng mới nhất). */
  pendingDevice: StaffCustomer[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isMock: boolean;
  refresh: () => void;
}

export function useDashboardData(): UseDashboardDataResult {
  const settings = useLarkSettings();
  const cfg = useMemo(() => toRuntimeConfig(settings), [settings]);
  const isMock = cfg.useMock;
  // Signature that changes when anything affecting a fetch/map changes.
  const sig = useMemo(() => JSON.stringify(settings), [settings]);

  const [raw, setRaw] = useState<RawState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [nonce, setNonce] = useState(0);
  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    if (isMock) {
      // Mock uses default column names.
      setRaw({
        ...mapDeskStates(mockLarkTables, DEFAULT_FIELD_CONFIG),
        pendingDevice: mapPendingDevices(mockLarkTables, DEFAULT_FIELD_CONFIG),
      });
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
        setRaw({ ...mapDeskStates(tables), pendingDevice: mapPendingDevices(tables) });
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

  const desks: DeskData[] = ALL_POSITIONS.map((p) => ({
    ...p,
    ...(raw.statesById[p.id] ?? { hasData: false }),
  }));
  const summary = computeSummary(desks, {
    totalRegistered: raw.totalRegistered,
    checkedIn: raw.totalCheckIn,
  });

  return {
    desks,
    summary,
    waitingCheckin: raw.waitingCheckin,
    waitingDispatch: raw.waitingDispatch,
    endFlow: raw.endFlow,
    roster: raw.roster,
    unresolvedDeskNames: raw.unresolvedDeskNames,
    pendingDevice: raw.pendingDevice,
    loading,
    error,
    lastUpdated,
    isMock,
    refresh,
  };
}
