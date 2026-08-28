import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { WarehouseInboxOrder } from '@/types/warehouse';
import { deleteWarehouseOrder, fetchWarehouseOrders, sendWarehouseOrder } from '@/services/warehouseOrderClaims';

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
    const result = await sendWarehouseOrder(apiUrl, order);
    setOrders((current) => [...current.filter((item) => item.id !== result.order.id), result.order].slice(-200));
    return result;
  }, [apiUrl]);
  const remove = useCallback(async (orderId: string) => {
    if (!apiUrl) throw new Error('Thiếu API URL của Worker.');
    await deleteWarehouseOrder(apiUrl, orderId);
    setOrders((current) => current.filter((item) => item.id !== orderId));
  }, [apiUrl]);
  const latestOrders = useMemo(() => {
    const latest = new Map<string, WarehouseInboxOrder>();
    for (const order of orders) {
      const key = order.stt?.trim() ? `${order.deskId}\u0000${order.stt.trim()}` : order.id;
      const previous = latest.get(key);
      if (!previous || order.createdAt >= previous.createdAt) latest.set(key, order);
    }
    return [...latest.values()].sort((a, b) => a.createdAt - b.createdAt);
  }, [orders]);
  return { orders: latestOrders, error, refresh, send, remove };
}
