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
import { cellToString } from '@/services/larkMapper';
import { useGuestSimulation } from '@/guest/GuestSimulationContext';
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

interface DashboardDataOptions {
  /** Chế độ khách: đọc Check-in thật nhưng cô lập dữ liệu demo khỏi vận hành. */
  guestMode?: boolean;
  /** Giữ API này cho các caller muốn ép fixture mock. */
  forceMock?: boolean;
}

function guestTables(tables: LarkTables, fields = DEFAULT_FIELD_CONFIG): LarkTables {
  const candidates = tables.checkin
    .filter((row) => {
      const name = cellToString(row.fields[fields.checkin.name]);
      const stt = cellToString(row.fields[fields.checkin.stt]);
      const endFlow = cellToString(row.fields[fields.checkin.endFlow])?.toLowerCase();
      return Boolean(name && stt && endFlow !== 'end flow');
    })
    .slice(0, 10);

  // Chỉ đưa 10 khách Check-in vào bản mô phỏng. Không đưa Master/Dispatch/DS
  // Master vào để sơ đồ bàn và các khâu thật không lộ dữ liệu vận hành.
  return {
    checkin: candidates,
    orders: candidates,
    master: [],
    dispatch: [],
    dsMaster: [],
  };
}

export function useDashboardData(options: DashboardDataOptions = {}): UseDashboardDataResult {
  const guestMode = options.guestMode ?? false;
  const forceMock = options.forceMock ?? false;
  const settings = useLarkSettings();
  const guestSimulation = useGuestSimulation();
  const cfg = useMemo(() => toRuntimeConfig(settings), [settings]);
  const isMock = !guestMode && (forceMock || cfg.useMock);
  // Lock có polling riêng trong SleepOverlay. Không để thay đổi sleepMode
  // khởi động lại snapshot Lark 5 bảng và làm chậm việc hiện overlay trên DP.
  const sig = useMemo(() => {
    const { sleepMode: _sleepMode, ...dataSettings } = settings;
    return JSON.stringify(dataSettings);
  }, [settings]);

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
      setRaw(forceMock ? EMPTY : {
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
        const liveTables = realtimeTables ?? await fetchLarkData(
          guestMode ? { ...cfg, useMock: false } : cfg,
          req.signal,
        );
        const tables = guestMode
          ? guestSimulation?.seed(guestTables(liveTables, settings.fields)) ?? guestTables(liveTables, settings.fields)
          : liveTables;
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

  useEffect(() => {
    if (!guestMode || !guestSimulation) return;
    const tables = guestSimulation.tables;
    setRaw({ ...mapDeskStates(tables, settings.fields), pendingDevice: mapPendingDevices(tables, settings.fields) });
    setError(null);
  }, [guestMode, guestSimulation, settings.fields]);

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
