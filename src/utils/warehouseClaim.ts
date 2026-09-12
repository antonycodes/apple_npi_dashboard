import type { WarehouseInboxOrder, WarehouseOrderClaim } from '@/types/warehouse';

interface ClaimCustomer {
  stt: string | null;
  name: string | null;
}

function normalize(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi-VN') ?? '';
}

/** Chỉ coi claim là của khách hiện tại khi thông tin nhận diện không lệch. */
export function warehouseClaimMatchesCustomer(
  claim: WarehouseOrderClaim | undefined,
  customer: ClaimCustomer,
): boolean {
  if (!claim) return false;
  const claimStt = normalize(claim.stt);
  const customerStt = normalize(customer.stt);
  if (claimStt && customerStt && claimStt !== customerStt) return false;

  const claimName = normalize(claim.customerName);
  const customerName = normalize(customer.name);
  if (claimName && customerName && claimName !== customerName) return false;
  return true;
}

/** Chỉ hiển thị Inbox order khi đúng cả STT và khách hiện tại. */
export function warehouseOrderMatchesCustomer(
  order: Pick<WarehouseInboxOrder, 'stt' | 'customerName'>,
  customer: ClaimCustomer,
): boolean {
  const orderStt = normalize(order.stt);
  const customerStt = normalize(customer.stt);
  if (orderStt && customerStt && orderStt !== customerStt) return false;

  const orderName = normalize(order.customerName);
  const customerName = normalize(customer.name);
  if (orderName && customerName && orderName !== customerName) return false;
  return true;
}
