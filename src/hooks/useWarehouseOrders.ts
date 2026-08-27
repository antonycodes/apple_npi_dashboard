import { useCallback, useEffect, useRef, useState } from 'react';
import type { WarehouseInboxOrder } from '@/types/warehouse';
import { fetchWarehouseOrders, sendWarehouseOrder } from '@/services/warehouseOrderClaims';

export function useWarehouseOrders(apiUrl: string | undefined, enabled: boolean) {
  const [orders, setOrders] = useState<WarehouseInboxOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const refresh = useCallback(async () => {
    if (!apiUrl || !enabled || inFlight.current) return;
    inFlight.current = true;
    try {
      setOrders(await fetchWarehouseOrders(apiUrl));
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
  const send = useCallback(async (order: Omit<WarehouseInboxOrder, 'id' | 'orderCode' | 'createdAt'> & { orderCode?: string }) => {
    if (!apiUrl) throw new Error('Thiếu API URL của Worker.');
    const created = await sendWarehouseOrder(apiUrl, order);
    setOrders((current) => [...current.filter((item) => item.id !== created.id), created].slice(-200));
    return created;
  }, [apiUrl]);
  return { orders, error, refresh, send };
}
