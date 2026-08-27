import type { WarehouseInboxOrder, WarehouseOrderClaim, WarehouseOrderClaims } from '@/types/warehouse';

export async function fetchWarehouseOrderClaims(apiUrl: string, signal?: AbortSignal): Promise<WarehouseOrderClaims> {
  const response = await fetch(`${apiUrl.replace(/\/+$/, '')}/warehouse-order-claims`, { signal });
  const body = await response.json() as { code: number; msg?: string; data?: { claims?: WarehouseOrderClaims } };
  if (!response.ok || body.code !== 0) throw new Error(body.msg || 'Không thể tải trạng thái order Kho.');
  return body.data?.claims ?? {};
}

export async function claimWarehouseOrder(
  apiUrl: string,
  claim: Omit<WarehouseOrderClaim, 'claimedAt'>,
): Promise<{ won: boolean; claims: WarehouseOrderClaims }> {
  const response = await fetch(`${apiUrl.replace(/\/+$/, '')}/warehouse-order-claims`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(claim),
  });
  const body = await response.json() as { code: number; msg?: string; data?: { claim?: WarehouseOrderClaim; claims?: WarehouseOrderClaims } };
  if (!response.ok || body.code !== 0) throw new Error(body.msg || 'Không thể tiếp nhận order.');
  const key = claim.orderCode.trim().toUpperCase();
  const current = body.data?.claims?.[key];
  return { won: current?.claimedBy === claim.claimedBy, claims: body.data?.claims ?? {} };
}

export async function claimWarehouseOrders(
  apiUrl: string,
  orders: Array<Omit<WarehouseOrderClaim, 'claimedAt'>>,
): Promise<{ wonAll: boolean; claims: WarehouseOrderClaims }> {
  const response = await fetch(`${apiUrl.replace(/\/+$/, '')}/warehouse-order-claims`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orders }),
  });
  const body = await response.json() as { code: number; msg?: string; data?: { claims?: WarehouseOrderClaims; wonAll?: boolean } };
  if (!response.ok || body.code !== 0) throw new Error(body.msg || 'Không thể tiếp nhận các order.');
  return { wonAll: Boolean(body.data?.wonAll), claims: body.data?.claims ?? {} };
}

export async function fetchWarehouseOrders(apiUrl: string, signal?: AbortSignal): Promise<WarehouseInboxOrder[]> {
  const response = await fetch(`${apiUrl.replace(/\/+$/, '')}/warehouse-orders`, { signal });
  const body = await response.json() as { code: number; msg?: string; data?: { orders?: WarehouseInboxOrder[] } };
  if (!response.ok || body.code !== 0) throw new Error(body.msg || 'Không thể tải order gửi tới Kho.');
  return body.data?.orders ?? [];
}

export async function sendWarehouseOrder(
  apiUrl: string,
  order: Omit<WarehouseInboxOrder, 'id' | 'orderCode' | 'createdAt'> & { orderCode?: string },
): Promise<WarehouseInboxOrder> {
  const response = await fetch(`${apiUrl.replace(/\/+$/, '')}/warehouse-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order),
  });
  const body = await response.json() as { code: number; msg?: string; data?: { order?: WarehouseInboxOrder } };
  if (!response.ok || body.code !== 0 || !body.data?.order) throw new Error(body.msg || 'Không thể gửi order tới Kho.');
  return body.data.order;
}
