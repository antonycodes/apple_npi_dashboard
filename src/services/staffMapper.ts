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
import type { CheckinFieldMap, DsMasterFieldMap, FieldConfig, MasterFieldMap } from '@/config/larkConfig';
import { toFieldConfig } from '@/config/larkSettings';
import { ALL_POSITIONS } from '@/config/layoutConfig';
import type { ClusterKey, DeskCustomer } from '@/types/desk';
import { cellToBool, cellToString, cellToUrl, cellToUsername, mapDeskStates, normalizeDeskCode } from './larkMapper';
import type { LarkRecord, LarkTables } from './larkTypes';

/** 1 ảnh nghiệm thu đã ghi vào Base từ lần trước. */
export interface PrevImage {
  fileToken: string;
  name: string | null;
}

/**
 * Dữ liệu máy cũ app ĐÃ GHI cho khách này ở lần Hoàn tất trước (đọc ngược từ
 * `Master`). Chỉ dùng để điền sẵn form khi lần trước chọn "Thu máy sau" — tức
 * máy chưa thu, khâu sau phải thu nốt (yêu cầu user 2026-08-12).
 */
export interface PrevDeviceData {
  thuLaiMay: string | null;
  scanQr: string | null;
  imei: string | null;
  images: PrevImage[];
}

/** 1 khách trên màn hình NV — như `DeskCustomer`, thêm URL cho nút bấm. */
export interface StaffCustomer extends DeskCustomer {
  /** Link mở form Tiếp nhận trong Lark cho đúng khách này (chỉ khách kế tiếp mới cần). */
  receiveUrl?: string | null;
  /** Dữ liệu máy cũ đã ghi lần trước — null nếu chưa từng ghi. */
  prevDevice?: PrevDeviceData | null;
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

/** Lấy danh sách file_token từ 1 ô đính kèm Bitable (mảng object). */
function cellToAttachments(v: unknown): PrevImage[] {
  if (!Array.isArray(v)) return [];
  const out: PrevImage[] = [];
  for (const part of v as Array<Record<string, unknown>>) {
    const token = part?.file_token;
    if (typeof token === 'string' && token.trim()) {
      out.push({ fileToken: token.trim(), name: typeof part.name === 'string' ? part.name : null });
    }
  }
  return out;
}

/**
 * Tra dữ liệu máy cũ đã ghi, theo `STT Input`.
 *
 * Lấy dòng MỚI NHẤT (theo `Thời gian`) có `Thu lại máy` — mỗi khách có thể có
 * nhiều dòng `Master` (Tiếp nhận, Hoàn tất, nhiều khâu), chỉ dòng nào thật sự
 * ghi trạng thái thu máy mới đáng dùng để điền lại form.
 */
function indexPrevDeviceByStt(rows: LarkRecord[], fm: MasterFieldMap): Map<string, PrevDeviceData> {
  const best = new Map<string, { time: number; data: PrevDeviceData }>();
  for (const r of rows) {
    const stt = cellToString(r.fields[fm.sttInput]);
    const thuLaiMay = cellToString(r.fields[fm.thuLaiMay]);
    if (!stt || !thuLaiMay) continue;
    const time = Number(r.fields[fm.time]) || 0;
    const prev = best.get(stt);
    if (prev && time < prev.time) continue;
    best.set(stt, {
      time,
      data: {
        thuLaiMay,
        scanQr: cellToString(r.fields[fm.scanQr]),
        imei: cellToString(r.fields[fm.imei]),
        images: cellToAttachments(r.fields[fm.hinhNghiemThu]),
      },
    });
  }
  return new Map([...best].map(([stt, v]) => [stt, v.data]));
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

  // Gắn dữ liệu máy cũ đã ghi lần trước vào từng khách, để form Hoàn tất điền
  // sẵn khi lần đó chọn "Thu máy sau".
  const prevByStt = indexPrevDeviceByStt(tables.master, fields.master);
  const withPrev = (c: StaffCustomer): StaffCustomer => ({
    ...c,
    prevDevice: c.stt ? prevByStt.get(c.stt) ?? null : null,
  });

  return {
    id: pos.id,
    label: pos.label,
    cluster: pos.cluster,
    staffName: state?.staffName ?? rosterStaff.get(pos.id)?.name ?? null,
    staffId: rosterStaff.get(pos.id)?.staffId ?? null,
    submitBy: rosterStaff.get(pos.id)?.username ?? null,
    current: (state?.receivedCustomers ?? []).map(withPrev),
    next: next ? withPrev(next) : null,
    waiting: state?.waiting ?? 0,
    completedHistory: state?.completedCustomers ?? [],
    deskReceiveUrl: urls?.receive ?? null,
    deskCompleteUrl: urls?.complete ?? null,
  };
}
