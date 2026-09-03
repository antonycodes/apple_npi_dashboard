import type { DeskCustomer } from '@/types/desk';

/** Chuẩn hoá lựa chọn Lark để dùng chung cho danh sách chờ và layout. */
export function isTradeInCustomer(customer: Pick<DeskCustomer, 'oldDeviceCheck'>): boolean {
  const normalized = customer.oldDeviceCheck
    ?.normalize('NFKC')
    .toLocaleUpperCase('vi-VN')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  return normalized === 'CÓ THU CŨ';
}

export function tradeInTone(active: boolean, customer: Pick<DeskCustomer, 'oldDeviceCheck'>): string {
  if (!active) return '';
  return isTradeInCustomer(customer) ? 'bg-red-600' : 'bg-neutral-400';
}
