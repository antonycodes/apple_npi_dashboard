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
  /** Các mã đơn hàng thật của khách nhận cùng nội dung Order từ Tư vấn. */
  productOrders?: Array<{ label: string; product: string; orderCode: string | null }>;
  deskId: string;
  stt: string | null;
  customerName: string | null;
  sentBy: string;
  createdAt: number;
  /** Xóa mềm khỏi màn hình; log CSV vẫn giữ lại bản ghi. */
  deletedAt?: number;
  deletedBy?: string;
}
