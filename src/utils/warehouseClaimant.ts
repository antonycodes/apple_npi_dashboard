import type { WarehouseOrderClaim } from '@/types/warehouse';

function uniqueParts(parts: Array<string | undefined>) {
  return Array.from(new Set(parts.map((part) => part?.trim()).filter((part): part is string => Boolean(part))));
}

/** Nhãn gọn trên App Kho: ưu tiên đúng vị trí bàn Kho. */
export function warehouseClaimantShort(claim: WarehouseOrderClaim) {
  return claim.claimedDesk?.trim() || claim.claimedBy?.trim() || 'KHO';
}

/** Nhãn đầy đủ cho màn hình giám sát: KHO · tên · MSNV. */
export function warehouseClaimantFull(claim: WarehouseOrderClaim) {
  const parts = uniqueParts([claim.claimedDesk, claim.claimedName, claim.claimedMsnv]);
  return parts.length ? parts.join(' · ') : warehouseClaimantShort(claim);
}
