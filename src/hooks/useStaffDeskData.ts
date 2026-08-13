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
import { mapStaffDeskView, type StaffDeskView } from '@/services/staffMapper';
import { startSerializedPolling } from './serializedPolling';

export interface UseStaffDeskDataResult {
  /** null = chưa chọn bàn, mã bàn không hợp lệ, hoặc chưa tải xong lần đầu. */
  view: StaffDeskView | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isMock: boolean;
  refresh: () => void;
}

export function useStaffDeskData(deskId: string): UseStaffDeskDataResult {
  const settings = useLarkSettings();
  const cfg = useMemo(() => toRuntimeConfig(settings), [settings]);
  const isMock = cfg.useMock;
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
      setView(mapStaffDeskView(mockLarkTables, deskId, DEFAULT_FIELD_CONFIG));
      setError(null);
      setLoading(false);
      setLastUpdated(new Date());
      return () => {
        cancelled = true;
      };
    }

    async function load(initial: boolean) {
      if (initial) setLoading(true);
      try {
        const tables = await fetchLarkData(cfg, controller.signal);
        if (cancelled) return;
        setView(mapStaffDeskView(tables, deskId));
        setError(null);
        setLastUpdated(new Date());
      } catch (err) {
        if (cancelled || controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
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
  }, [deskId, isMock, sig, nonce]);

  return { view, loading, error, lastUpdated, isMock, refresh };
}
