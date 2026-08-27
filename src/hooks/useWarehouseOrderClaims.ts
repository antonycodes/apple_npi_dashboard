import { useCallback, useEffect, useRef, useState } from 'react';
import type { WarehouseOrderClaim, WarehouseOrderClaims } from '@/types/warehouse';
import { claimWarehouseOrder, claimWarehouseOrders, fetchWarehouseOrderClaims, unlockWarehouseOrder } from '@/services/warehouseOrderClaims';

export function useWarehouseOrderClaims(apiUrl: string | undefined, enabled: boolean) {
  const [claims, setClaims] = useState<WarehouseOrderClaims>({});
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (!apiUrl || !enabled || inFlight.current) return;
    inFlight.current = true;
    try {
      setClaims(await fetchWarehouseOrderClaims(apiUrl));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      inFlight.current = false;
    }
  }, [apiUrl, enabled]);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2000);
    return () => window.clearInterval(timer);
  }, [enabled, refresh]);

  const claim = useCallback(async (order: Omit<WarehouseOrderClaim, 'claimedAt'>) => {
    if (!apiUrl) return false;
    const result = await claimWarehouseOrder(apiUrl, order);
    setClaims(result.claims);
    return result.won;
  }, [apiUrl]);

  const claimAll = useCallback(async (orders: Array<Omit<WarehouseOrderClaim, 'claimedAt'>>) => {
    if (!apiUrl) return false;
    const result = await claimWarehouseOrders(apiUrl, orders);
    setClaims(result.claims);
    return result.wonAll;
  }, [apiUrl]);

  const unlock = useCallback(async (orderCode: string) => {
    if (!apiUrl) return false;
    setClaims(await unlockWarehouseOrder(apiUrl, orderCode));
    return true;
  }, [apiUrl]);

  return { claims, error, refresh, claim, claimAll, unlock };
}
