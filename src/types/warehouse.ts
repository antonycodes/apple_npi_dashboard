/** Một order sản phẩm đã được Kho tiếp nhận trong một event. */
export interface WarehouseOrderClaim {
  /** Event hiện tại, ví dụ `HCM-2026-09-12`. */
  eventId: string;
  orderCode: string;
  stt: string | null;
  productLabel: string;
  product: string;
  /** Tên khách tại thời điểm Kho nhận order. */
  customerName?: string | null;
  claimedBy: string;
  claimedAt: number;
  claimedDesk?: string;
  claimedName?: string;
  claimedMsnv?: string;
}

export type WarehouseOrderClaims = Record<string, WarehouseOrderClaim>;

/** Payload từ client; eventId do Worker xác định theo event hiện tại. */
export type WarehouseOrderInput = Omit<WarehouseOrderClaim, 'eventId' | 'claimedAt'> & {
  eventId?: string;
};

export interface WarehouseInboxOrder {
  id: string;
  /** Event tạo order theo ngày vận hành Việt Nam. Legacy order có thể thiếu field này. */
  eventId?: string;
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
