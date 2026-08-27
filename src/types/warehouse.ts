/** Một order sản phẩm đã được Kho tiếp nhận. Khóa theo mã đơn hàng. */
export interface WarehouseOrderClaim {
  orderCode: string;
  stt: string | null;
  productLabel: string;
  product: string;
  claimedBy: string;
  claimedAt: number;
  claimedDesk?: string;
  claimedName?: string;
  claimedMsnv?: string;
}

export type WarehouseOrderClaims = Record<string, WarehouseOrderClaim>;

export type WarehouseOrderInput = Omit<WarehouseOrderClaim, 'claimedAt'>;

export interface WarehouseInboxOrder {
  id: string;
  orderCode: string;
  rawText: string;
  deskId: string;
  stt: string | null;
  customerName: string | null;
  sentBy: string;
  createdAt: number;
}
