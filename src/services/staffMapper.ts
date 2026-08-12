/**
 * staffMapper — dữ liệu cho MÀN HÌNH ĐIỆN THOẠI CỦA 1 NHÂN VIÊN (`#/nv`).
 *
 * Mỗi nhân viên TV/TC/BK mở app trên điện thoại của mình, chọn đúng mã bàn của
 * họ 1 lần; từ đó màn hình chỉ còn 1 bàn: khách đang tiếp nhận + STT khách tiếp
 * theo + 2 nút Tiếp nhận / Hoàn tất.
 *
 * File RIÊNG (không sửa `larkMapper`/`queueMapper`) theo đúng quy ước sẵn có
 * của repo: dashboard điều phối và màn hình STT không được thay đổi hành vi vì
 * màn hình này. Ở đây chỉ ĐỌC LẠI output của `mapDeskStates` rồi bổ sung 2 thứ
 * mà 2 màn kia không cần:
 *   - chi tiết khách của "STT tiếp theo" (join `Master_Check in` theo STT),
 *   - URL cho 2 nút bấm.
 *
 * **Nguồn URL cho 2 nút** (user tự tạo hyperlink trong Lark Base, xem
 * `larkConfig.ts`) — ưu tiên link RIÊNG TỪNG KHÁCH, hết mới tới link cấp BÀN:
 *   - Tiếp nhận: `Master_Check in."Hyperlink Tiếp nhận"` của khách kế tiếp →
 *     `Master_DS."Hyperlink Tiếp nhận"` của bàn.
 *   - Hoàn tất:  `Master."Hyperlink Master"` của khách đang tiếp nhận →
 *     `Master_DS."Hyperlink Hoàn tất"` của bàn.
 * Không có link nào thì trả `null` — UI vô hiệu hoá nút và nói rõ thiếu cột
 * nào, thay vì mở 1 link sai (vd link Điều phối) làm hỏng dữ liệu Base.
 */
import type { CheckinFieldMap, DsMasterFieldMap, FieldConfig } from '@/config/larkConfig';
import { toFieldConfig } from '@/config/larkSettings';
import { ALL_POSITIONS } from '@/config/layoutConfig';
import type { ClusterKey, DeskCustomer } from '@/types/desk';
import { cellToBool, cellToString, cellToUrl, cellToUsername, mapDeskStates, normalizeDeskCode } from './larkMapper';
import type { LarkRecord, LarkTables } from './larkTypes';

/** 1 khách trên màn hình NV — như `DeskCustomer`, thêm URL cho nút bấm. */
export interface StaffCustomer extends DeskCustomer {
  /** Link mở form Tiếp nhận trong Lark cho đúng khách này (chỉ khách kế tiếp mới cần). */
  receiveUrl?: string | null;
}

/** Toàn bộ những gì 1 màn hình nhân viên cần hiển thị. */
export interface StaffDeskView {
  id: string;
  label: string;
  cluster: ClusterKey;
  /** NV đang đứng bàn này (`Master."Người"`, hoặc roster `Master_DS`). */
  staffName: string | null;
  /** MSNV tra từ Master_DS theo mã bàn. */
  staffId: string | null;
  /** Username/email Lark dùng để map vào cột Submit by. */
  submitBy: string | null;
  /** Khách đang "Tiếp nhận" tại bàn — thường 1, có thể nhiều nếu NV phục vụ song song. */
  current: StaffCustomer[];
  /** Khách của "STT tiếp theo" (`Master_DS`) — null nếu bàn chưa có ai chờ. */
  next: StaffCustomer | null;
  /** Số khách đang chờ tới lượt ở bàn này (`Master_DS."Sl khách chờ"`). */
  waiting: number;
  /**
   * Khách đã tiếp nhận rồi hoàn tất tại bàn này (`DeskLiveState.completedCustomers`,
   * mới nhất trước) — lịch sử phục vụ trong ngày, hiện trong danh sách sổ xuống
   * ở cuối màn hình (`StaffDeskScreen`), KHÔNG tính vào `current`/`busy`.
   */
  completedHistory: StaffCustomer[];
  /** Link Tiếp nhận cấp bàn — dự phòng khi khách kế tiếp không có link riêng. */
  deskReceiveUrl: string | null;
  /** Link Hoàn tất cấp bàn — dự phòng khi khách đang tiếp nhận không có Hyperlink Master. */
  deskCompleteUrl: string | null;
}

/** Chi tiết khách theo STT (khoá join cho "STT tiếp theo", vốn chỉ là 1 con số). */
function indexCheckinByStt(rows: LarkRecord[], fm: CheckinFieldMap): Map<string, StaffCustomer> {
  const m = new Map<string, StaffCustomer>();
  for (const r of rows) {
    const stt = cellToString(r.fields[fm.stt]);
    if (!stt) continue;
    m.set(stt, {
      stt,
      name: cellToString(r.fields[fm.name]),
      productName: cellToString(r.fields[fm.product]),
      paymentNote: cellToString(r.fields[fm.note]),
      deviceAccepted: cellToBool(r.fields[fm.deviceAccepted]),
      deviceAcceptedText: cellToString(r.fields[fm.deviceAccepted]),
      oldDeviceCheck: cellToString(r.fields[fm.oldDeviceCheck]),
      backupCheck: cellToString(r.fields[fm.backupCheck]),
      receiveUrl: cellToUrl(r.fields[fm.receiveHyperlink]),
    });
  }
  return m;
}

/** Mã bàn → 2 link cấp bàn trong `Master_DS`. */
function indexDeskUrls(
  rows: LarkRecord[],
  fm: DsMasterFieldMap,
): Map<string, { receive: string | null; complete: string | null }> {
  const m = new Map<string, { receive: string | null; complete: string | null }>();
  for (const r of rows) {
    const code = normalizeDeskCode(cellToString(r.fields[fm.code]));
    if (!code) continue;
    const receive = cellToUrl(r.fields[fm.receiveHyperlink]);
    const complete = cellToUrl(r.fields[fm.completeHyperlink]);
    const prev = m.get(code);
    // Roster có thể có nhiều dòng cùng mã bàn (đổi ca) — giữ link đầu tiên tìm
    // được cho từng nút, giống quy ước "dòng đầu tiên thắng" ở larkMapper.
    m.set(code, { receive: prev?.receive ?? receive, complete: prev?.complete ?? complete });
  }
  return m;
}

/** Tên NV theo mã bàn từ roster `Master_DS` — dùng khi bàn đang trống (Master không có dòng nào). */
function indexRosterStaffByDesk(rows: LarkRecord[], fm: DsMasterFieldMap): Map<string, { name: string; staffId: string | null; username: string | null; stage: string | null }> {
  const m = new Map<string, { name: string; staffId: string | null; username: string | null; stage: string | null }>();
  for (const r of rows) {
    const code = normalizeDeskCode(cellToString(r.fields[fm.code]));
    const staff = cellToString(r.fields[fm.staff]);
    // `MSNV` là cột schema cố định của Master_DS; fallback này giúp các máy
    // còn localStorage cấu hình cũ vẫn đọc đúng sau khi cập nhật app.
    const staffId = cellToString(r.fields[fm.staffId || 'MSNV']) ?? cellToString(r.fields.MSNV);
    const username = cellToUsername(r.fields[fm.staffUsername]) ?? cellToUsername(r.fields[fm.staff]);
    const stage = cellToString(r.fields[fm.loai]);
    if (code && staff && !m.has(code)) m.set(code, { name: staff, staffId, username, stage });
  }
  return m;
}

/**
 * Dựng view cho ĐÚNG 1 bàn. Bàn không có trong `ALL_POSITIONS` (mã lạ trong
 * localStorage) → trả `null` để UI bắt chọn lại bàn.
 */
export function mapStaffDeskView(
  tables: LarkTables,
  deskId: string,
  fields: FieldConfig = toFieldConfig(),
): StaffDeskView | null {
  const pos = ALL_POSITIONS.find((p) => p.id === deskId);
  if (!pos) return null;

  const { statesById } = mapDeskStates(tables, fields);
  const state = statesById[pos.id];
  const checkinByStt = indexCheckinByStt(tables.checkin, fields.checkin);
  const deskUrls = indexDeskUrls(tables.dsMaster, fields.dsMaster);
  const rosterStaff = indexRosterStaffByDesk(tables.dsMaster, fields.dsMaster);

  const nextStt = state?.nextWaitingStt ?? null;
  const next = nextStt ? checkinByStt.get(nextStt) ?? { stt: nextStt, name: null } : null;
  const urls = deskUrls.get(pos.id);

  return {
    id: pos.id,
    label: pos.label,
    cluster: pos.cluster,
    staffName: state?.staffName ?? rosterStaff.get(pos.id)?.name ?? null,
    staffId: rosterStaff.get(pos.id)?.staffId ?? null,
    submitBy: rosterStaff.get(pos.id)?.username ?? null,
    current: state?.receivedCustomers ?? [],
    next,
    waiting: state?.waiting ?? 0,
    completedHistory: state?.completedCustomers ?? [],
    deskReceiveUrl: urls?.receive ?? null,
    deskCompleteUrl: urls?.complete ?? null,
  };
}
