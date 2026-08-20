/**
 * khoMapper — dữ liệu cho màn hình Kho (`#/khoview`).
 *
 * Khác `queueMapper` (màn hình STT của Tư vấn/Thu cũ/Backup) ở chỗ Kho KHÔNG
 * cần "STT tiếp theo": kho chỉ cần biết bàn nào đang có STT nào, khách đó
 * đang "Tiếp nhận" hay đã "Hoàn tất", và SẢN PHẨM là gì để chuẩn bị máy.
 *
 * Vẫn đọc lại output của `mapDeskStates` (`receivedCustomers` = đang tiếp
 * nhận, `completedCustomers` = đã hoàn tất tại bàn đó) và để nguyên file
 * `queueMapper.ts`/`larkMapper.ts` — các view cũ không bị đụng tới.
 */
import type { DsMasterFieldMap, FieldConfig } from '@/config/larkConfig';
import { toFieldConfig } from '@/config/larkSettings';
import { ALL_POSITIONS } from '@/config/layoutConfig';
import { cellToString, mapDeskStates, normalizeDeskCode } from './larkMapper';
import { indexPrevDeviceByStt, type PrevDeviceData } from './staffMapper';
import type { ClusterKey, DeskCustomer } from '@/types/desk';
import type { LarkRecord, LarkTables } from './larkTypes';

/** Trạng thái của 1 khách trên màn hình Kho — đúng 2 giá trị như trong `Master`. */
export type KhoCustomerStatus = 'received' | 'completed';

export interface KhoCustomer extends DeskCustomer {
  status: KhoCustomerStatus;
  /**
   * Dữ liệu máy cũ app đã ghi cho khách này (`Master`: Thu lại máy / Scan QR /
   * Scan IMEI / ảnh nghiệm thu) — kho cần để đối chiếu máy thu về. `null` nếu
   * khách chưa từng có dòng thu máy nào.
   */
  device?: PrevDeviceData | null;
}

/** 1 bàn trên màn hình Kho: mã bàn + danh sách khách kèm trạng thái & sản phẩm. */
export interface DeskKhoState {
  id: string;
  label: string;
  cluster: ClusterKey;
  staffName: string | null;
  /** Đang "Tiếp nhận" tại bàn, rồi tới đã "Hoàn tất" (mới nhất trước). */
  customers: KhoCustomer[];
}

export function mapKhoStates(
  tables: LarkTables,
  fields: FieldConfig = toFieldConfig(),
): Record<string, DeskKhoState> {
  const { statesById } = mapDeskStates(tables, fields);
  // Dữ liệu thu cũ theo STT — dùng chung index với màn hình nhân viên
  // (`staffMapper`) để kho và NV luôn nhìn thấy CÙNG một dòng `Master`.
  const deviceByStt = indexPrevDeviceByStt(tables.master, fields.master);
  const withDevice = (c: DeskCustomer, status: KhoCustomerStatus): KhoCustomer => ({
    ...c,
    status,
    device: c.stt ? deviceByStt.get(c.stt) ?? null : null,
  });

  const out: Record<string, DeskKhoState> = {};
  for (const pos of ALL_POSITIONS) {
    const state = statesById[pos.id];
    const received: KhoCustomer[] = (state?.receivedCustomers ?? []).map((c) => withDevice(c, 'received'));
    const completed: KhoCustomer[] = (state?.completedCustomers ?? []).map((c) => withDevice(c, 'completed'));
    out[pos.id] = {
      id: pos.id,
      label: pos.label,
      cluster: pos.cluster,
      staffName: state?.staffName ?? null,
      customers: [...received, ...completed],
    };
  }
  return out;
}

// ── Bàn giao máy: kho quét QR nhân viên Tư vấn (2026-08-19) ─────────────────
//
// Tách khỏi `mapKhoStates` (vốn dựng theo BÀN) thay vì nhồi thêm vào đó.
// Chỉ còn ĐÚNG một phép tra: mã bàn TV → tên + MSNV nhân viên, để kho nhìn xác
// nhận đúng người nhận trước khi bấm. (Ô "STT khách" đã bỏ 2026-08-19 theo yêu
// cầu user — kho bàn giao theo người nhận, không theo từng khách.)

/** Nhân sự của 1 bàn, tra từ roster `Master_DS`. */
export interface KhoStaffInfo {
  desk: string;
  name: string | null;
  msnv: string | null;
  /** Cột `Loại` — dùng để cảnh báo khi quét trúng bàn không phải Tư vấn. */
  loai: string | null;
}

/**
 * Mã bàn → nhân sự đang đứng bàn đó.
 *
 * Dòng ĐẦU TIÊN của mỗi mã bàn thắng, đúng quy ước của `larkMapper` —
 * roster có thể có nhiều dòng cùng bàn (đổi ca).
 */
export function indexStaffByDesk(
  rows: LarkRecord[],
  fm: DsMasterFieldMap,
): Map<string, KhoStaffInfo> {
  const m = new Map<string, KhoStaffInfo>();
  for (const r of rows) {
    const desk = normalizeDeskCode(cellToString(r.fields[fm.code]));
    if (!desk || m.has(desk)) continue;
    m.set(desk, {
      desk,
      name: cellToString(r.fields[fm.staff]),
      msnv: cellToString(r.fields[fm.staffId]) ?? cellToString(r.fields.MSNV),
      loai: cellToString(r.fields[fm.loai]),
    });
  }
  return m;
}
