import type { DeskCustomer } from '@/types/desk';

/**
 * Giữ nguyên ba ô mã bàn `(TV)(TC)(BK)`. Mã từ Master Điều phối là màu đen;
 * mã đã có kết quả tiếp nhận trong Master là màu đỏ. Master có thể thay mã
 * được phân ban đầu, ví dụ TV1 → TV2, nên UI luôn hiển thị mã cuối cùng.
 */
export default function DispatchSummary({
  customer,
}: {
  customer: Pick<DeskCustomer, 'dsTuVan' | 'dsThuCu' | 'dsBackup' | 'dsTuVanReceived' | 'dsThuCuReceived' | 'dsBackupReceived'>;
}) {
  const slots = [
    { value: customer.dsTuVan, received: customer.dsTuVanReceived },
    { value: customer.dsThuCu, received: customer.dsThuCuReceived },
    { value: customer.dsBackup, received: customer.dsBackupReceived },
  ];

  return (
    <span aria-label="Mã bàn Tư vấn, Thu cũ, Backup">
      {slots.map((slot, index) => (
        <span key={index} className={slot.received ? 'text-red-600' : 'text-neutral-900'}>
          ({slot.value ?? ''})
        </span>
      ))}
    </span>
  );
}
