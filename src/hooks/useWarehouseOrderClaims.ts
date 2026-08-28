import { useCallback, useEffect, useRef, useState } from 'react';
import type { WarehouseOrderClaim, WarehouseOrderClaims } from '@/types/warehouse';
import { claimWarehouseOrder, claimWarehouseOrders, fetchWarehouseOrderClaims, unlockWarehouseOrder } from '@/services/warehouseOrderClaims';

export function useWarehouseOrderClaims(apiUrl: string | undefined, enabled: boolean) {
  const [claims, setClaims] = useState<WarehouseOrderClaims>({});
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const inFlight = useRef(false);
  const mutationVersion = useRef(0);

  const refresh = useCallback(async () => {
    if (!apiUrl || !enabled || inFlight.current) return;
    const versionAtStart = mutationVersion.current;
    inFlight.current = true;
    try {
      const next = await fetchWarehouseOrderClaims(apiUrl);
      // Một GET bắt đầu trước thao tác nhận đơn có thể trả về sau POST. Không
      // cho snapshot cũ ghi đè kết quả claim vừa thành công trên thiết bị này.
      if (versionAtStart === mutationVersion.current) {
        setClaims(next);
        setReady(true);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      inFlight.current = false;
    }
  }, [apiUrl, enabled]);

  useEffect(() => {
    if (!enabled || !apiUrl) {
      setReady(false);
      return;
    }
    setReady(false);
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2000);
    return () => window.clearInterval(timer);
  }, [enabled, refresh]);

  const claim = useCallback(async (order: Omit<WarehouseOrderClaim, 'claimedAt'>) => {
    if (!apiUrl) return false;
    mutationVersion.current += 1;
    const result = await claimWarehouseOrder(apiUrl, order);
    setClaims(result.claims);
    setReady(true);
    return result.won;
  }, [apiUrl]);

  const claimAll = useCallback(async (orders: Array<Omit<WarehouseOrderClaim, 'claimedAt'>>) => {
    if (!apiUrl) return false;
    mutationVersion.current += 1;
    const result = await claimWarehouseOrders(apiUrl, orders);
    setClaims(result.claims);
    setReady(true);
    return result.wonAll;
  }, [apiUrl]);

  const unlock = useCallback(async (orderCode: string) => {
    if (!apiUrl) return false;
    mutationVersion.current += 1;
    setClaims(await unlockWarehouseOrder(apiUrl, orderCode));
    setReady(true);
    return true;
  }, [apiUrl]);

  return { claims, error, ready, refresh, claim, claimAll, unlock };
}
