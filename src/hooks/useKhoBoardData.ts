/**
 * useKhoBoardData — nguồn dữ liệu polling cho màn hình Kho (`#/khoview`).
 *
 * Cùng vòng đời fetch/poll/mock với `useQueueBoardData` nhưng map qua
 * `khoMapper` và trả về TẤT CẢ các bàn (mặc định) hoặc lọc theo `cluster`,
 * vì kho cần nhìn nhiều cụm cùng lúc.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ALL_POSITIONS } from '@/config/layoutConfig';
import { DEFAULT_FIELD_CONFIG, toRuntimeConfig, useLarkSettings } from '@/config/larkSettings';
import { mockLarkTables } from '@/data/mockLarkData';
import { fetchLarkData } from '@/services/larkService';
import { mapKhoStates, type DeskKhoState } from '@/services/khoMapper';
import { TIMEOUT_MESSAGE, withRequestTimeout } from './requestTimeout';
import { startSerializedPolling } from './serializedPolling';
import type { ClusterKey } from '@/types/desk';

export interface UseKhoBoardDataResult {
  desks: DeskKhoState[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isMock: boolean;
  refresh: () => void;
}

function emptyState(id: string, label: string, cluster: ClusterKey): DeskKhoState {
  return { id, label, cluster, staffName: null, customers: [] };
}

/**
 * @param cluster  chỉ lấy bàn của 1 cụm; bỏ trống = tất cả.
 * @param enabled  `false` = KHÔNG fetch/poll. Dùng cho màn kho trên điện thoại
 *   (`KhoAppPage`), nơi bảng kanban nằm ở tab thứ hai: kho để máy ở tab Bàn
 *   giao suốt buổi, không việc gì phải map lại 36 bàn mỗi 5 giây.
 */
export function useKhoBoardData(cluster?: ClusterKey, enabled = true): UseKhoBoardDataResult {
  const settings = useLarkSettings();
  const cfg = useMemo(() => toRuntimeConfig(settings), [settings]);
  const isMock = cfg.useMock;
  const sig = useMemo(() => JSON.stringify(settings), [settings]);

  // Kèm nguồn sinh ra dữ liệu — xem ghi chú dài ở `useKhoHandoverData`: bảng
  // của chế độ mẫu mà hiện dưới nhãn "Lark (live)" là đọc sai toàn bộ mặt bàn.
  const [snapshot, setSnapshot] = useState<{ states: Record<string, DeskKhoState>; fromMock: boolean }>({
    states: {},
    fromMock: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [nonce, setNonce] = useState(0);
  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    if (!enabled) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    if (isMock) {
      setSnapshot({ states: mapKhoStates(mockLarkTables, DEFAULT_FIELD_CONFIG), fromMock: true });
      setError(null);
      setLoading(false);
      setLastUpdated(new Date());
      return () => {
        cancelled = true;
      };
    }

    async function load(initial: boolean) {
      if (initial) setLoading(true);
      // Hết giờ thì BỎ lượt này để vòng poll đi tiếp — xem `requestTimeout.ts`.
      const req = withRequestTimeout(controller.signal);
      try {
        const tables = await fetchLarkData(cfg, req.signal);
        if (cancelled) return;
        setSnapshot({ states: mapKhoStates(tables), fromMock: false });
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
    return () => {
      cancelled = true;
      controller.abort();
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMock, sig, nonce, enabled]);

  const khopCheDo = snapshot.fromMock === isMock;
  const statesById = khopCheDo ? snapshot.states : {};
  const desks = ALL_POSITIONS.filter((p) => !cluster || p.cluster === cluster).map(
    (p) => statesById[p.id] ?? emptyState(p.id, p.label, p.cluster),
  );

  return { desks, loading: loading || !khopCheDo, error, lastUpdated, isMock, refresh };
}
