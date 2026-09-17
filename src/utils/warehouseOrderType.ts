const WAREHOUSE_ORDER_TYPES = ['#Lấy hàng cho khách', '#Trả hàng về kho'] as const;

function isWarehouseOrderType(value: string | undefined): value is (typeof WAREHOUSE_ORDER_TYPES)[number] {
  return value !== undefined && WAREHOUSE_ORDER_TYPES.includes(value as (typeof WAREHOUSE_ORDER_TYPES)[number]);
}

/** Resolve the selected order type, with a raw-text fallback for legacy orders. */
export function warehouseOrderTypeLabel(orderType: string | null | undefined, rawText: string): string {
  const selectedType = orderType?.trim();
  if (isWarehouseOrderType(selectedType)) {
    return selectedType;
  }

  const firstLine = rawText.split(/\r?\n/, 1)[0]?.trim();
  return isWarehouseOrderType(firstLine)
    ? firstLine
    : '#Chưa phân loại';
}
