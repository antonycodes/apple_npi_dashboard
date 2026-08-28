import type { WarehouseInboxOrder, WarehouseOrderClaim, WarehouseOrderClaims } from '@/types/warehouse';
import { adminSessionStore } from '@/config/adminSession';

export async function fetchWarehouseOrderClaims(apiUrl: string, signal?: AbortSignal): Promise<WarehouseOrderClaims> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl.replace(/\/+$/, '')}/warehouse-order-claims?ts=${Date.now()}`, {
      signal,
      cache: 'no-store',
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('Không thể kết nối API trạng thái đơn hàng. Hãy bấm Làm mới.');
  }
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

export async function unlockWarehouseOrder(apiUrl: string, orderCode: string): Promise<WarehouseOrderClaims> {
  const token = adminSessionStore.getSnapshot();
  if (!token) throw new Error('Phiên admin đã hết hạn — đăng nhập lại.');
  const response = await fetch(`${apiUrl.replace(/\/+$/, '')}/warehouse-order-claims`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ orderCode }),
  });
  const body = await response.json() as { code: number; msg?: string; data?: { claims?: WarehouseOrderClaims } };
  if (!response.ok || body.code !== 0) throw new Error(body.msg || 'Không thể mở khóa order.');
  return body.data?.claims ?? {};
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
): Promise<{ order: WarehouseInboxOrder; webhookErrors: string[] }> {
  const response = await fetch(`${apiUrl.replace(/\/+$/, '')}/warehouse-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order),
  });
  const body = await response.json() as {
    code: number;
    msg?: string;
    data?: { order?: WarehouseInboxOrder; webhookErrors?: string[] };
  };
  if (!response.ok || body.code !== 0 || !body.data?.order) throw new Error(body.msg || 'Không thể gửi order tới Kho.');
  return {
    order: body.data.order,
    webhookErrors: Array.isArray(body.data.webhookErrors) ? body.data.webhookErrors : [],
  };
}
