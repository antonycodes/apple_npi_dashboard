/**
 * larkMapper — turn raw Lark tables into per-desk live state.
 *
 * **Schema (2026-08-05, "no DS Master" revision)**: `DS Master` turned out to
 * be a personnel roster, not a per-desk operational registry — the app no
 * longer reads it at all. Instead, `mapDeskStates` computes state for every
 * FIXED position in `layoutConfig.ALL_POSITIONS` directly, from 2 sources:
 *   - `Master` (`indexMasterByDeskCode`) — who's being served where right
 *     now. `TV_MãNV` = desk code (khớp thẳng `TablePosition.id`), `Trạng
 *     thái` = Tiếp nhận/Hoàn tất, `Người` = NV. A desk is occupied (đỏ) iff
 *     it has ≥ 1 "Tiếp nhận" row here — no more reading a literal "trạng
 *     thái hiện tại" text field.
 *   - `Master Điều phối` (`indexDispatchByDeskCode`) — khách đã được điều
 *     phối viên gán vào 1 bàn cụ thể (cột `DS Thu cũ`/`DS Tư vấn` = mã bàn)
 *     nhưng CHƯA có dòng "Tiếp nhận" tương ứng trong `Master` → đếm vào
 *     `waiting` của đúng bàn đó (badge cam).
 * "Chờ điều phối" (2026-08-05, tiếp) đọc TRỰC TIẾP `Master.Trạng thái` =
 * "Hoàn tất" (không còn qua Check-in's "Status in <cụm>" — formula riêng, có
 * thể lệch nhịp với Master) — theo yêu cầu rõ của user. Chi tiết khách (SP,
 * ghi chú, nghiệm thu…) vẫn join theo TÊN từ `Master_Check in` như cũ.
 *
 * **Điều phối KHÔNG loại khỏi khu chờ chung** (2026-08-05, tiếp #5, sửa lại
 * quyết định trước đó): "đã điều phối" (có dòng trong `Master Điều phối`) chỉ
 * là ĐÃ ĐƯỢC GÁN bàn, chưa chắc đã có NV nhận — khách vẫn phải hiện ở
 * `waitingCheckin`/`waitingDispatch` (khu chung) CHO TỚI KHI thật sự có dòng
 * "Tiếp nhận" trong `Master` (tức `everSeenNames`/`activeNames`). Badge "khách
 * đang chờ" ở từng bàn (từ `Master Điều phối`) là THAM CHIẾU CHÉO, không phải
 * loại trừ — 1 khách có thể vừa hiện ở khu chung, vừa hiện trong badge của
 * đúng bàn được gán, cho tới lúc NV bấm nhận.
 *
 * **Mã bàn dự phòng — CHỈ theo MÃ, không theo tên người** (sửa 2026-08-17).
 * `Master` nhận dữ liệu từ HAI nguồn: web app (`/record`, có `TV_MãNV`) và
 * Lark form (`TV_MãNV` trống, `Người` = người bấm form làm trigger automation).
 * Bản cũ suy bàn từ `Người` nên mọi dòng vào qua Lark form đều tô đỏ bàn của
 * người vận hành — SAI VỊ TRÍ. Thứ tự hiện tại, xem `latestByDeskAndName`:
 *
 *   1. `TV_MãNV` trên dòng
 *   2. `Submit by` (MSNV) → `DS Master` (`indexDeskCodeByStaffId`) — cứu khách
 *      vào thẳng bàn, không qua Điều phối
 *   3. Bảng Điều phối theo TÊN KHÁCH + ĐÚNG KHÂU (`Loại 2`)
 *
 * Trượt cả ba thì bỏ dòng như cũ — không đoán bừa. Dòng `TV_MãNV` là mã option
 * Lark thô chưa resolve cũng coi như trống (`normalizeDeskCode` trả `null`).
 *
 * **Backup giao cho cả Tư vấn lẫn Thu cũ** (2026-08-06): Backup không phải
 * vị trí vật lý riêng, nhưng mã Backup vẫn phải được giữ để theo dõi đủ khâu.
 * BK1..BK8 thuộc TV1..TV8; BK11..BK13 thuộc TC1..TC3. Khi tính trạng thái
 * bàn, `normalizeDeskCode` quy mã BK về bàn chính tương ứng. Khi hiển thị
 * dòng "Nhân sự", mã BK vẫn giữ nguyên, không gộp thành TV/TC.
 * Khi build map dự phòng qua MSNV, `indexDeskCodeByStaffId` CHỈ lấy dòng
 * `DS Master` có "Loại" = "Tư vấn"/"Thu cũ" (bàn chính, vật lý) — bỏ qua dòng
 * "Loại" = "Backup"/"Kho", để 1 khách "Backup" được ghi Tiếp nhận sẽ tính đúng
 * vào bàn CHÍNH thường ngày của NV đó (Tư vấn hoặc Thu cũ), không phải 1 vị
 * trí Backup riêng.
 */
import {
  PRIMARY_DESK_LOAI,
  STATUS_COMPLETED,
  STATUS_RECEIVED,
  type CheckinFieldMap,
  type DispatchFieldMap,
  type DsMasterFieldMap,
  type FieldConfig,
  type MasterFieldMap,
} from '@/config/larkConfig';
import { toFieldConfig } from '@/config/larkSettings';
import { ALL_POSITIONS } from '@/config/layoutConfig';
import type {
  ClusterKey,
  DeskCustomer,
  DeskLiveState,
  RosterEntry,
  WaitingCustomer,
} from '@/types/desk';
import type { LarkCellValue, LarkRecord, LarkTables } from './larkTypes';

export function cellToString(v: LarkCellValue): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') return v.trim() || null;
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (Array.isArray(v)) {
    // 3 dạng thấy được từ Lark thật: rich-text segment ({text,type}, vd
    // "Done in Flow"), mảng string trần (link/lookup field, vd "TV_Nsư Tư
    // vấn" → ["optxXl70bv"]), và mảng object người dùng (person field, vd
    // "NV Tư vấn" → [{id,name,email,...}], không có `.text`) — xử lý cả 3.
    const s = v
      .map((seg) => (typeof seg === 'string' ? seg : seg?.text ?? seg?.name ?? ''))
      .join('')
      .trim();
    return s || null;
  }
  return null;
}

/** Lấy định danh tài khoản Lark từ person field hoặc cột text riêng. */
export function cellToUsername(v: LarkCellValue): string | null {
  if (typeof v === 'string') return v.trim() || null;
  if (!Array.isArray(v)) return null;
  for (const part of v as Array<Record<string, unknown>>) {
    for (const key of ['username', 'email', 'email_address', 'id']) {
      const value = part[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
  }
  return null;
}

/**
 * Lark responses copied through some proxy/browser paths can expose Vietnamese
 * column names as mojibake (for example `DS Thu cÅ©`). Read the exact key first
 * and then compare a repaired form so dispatch still works during that state.
 */
function repairMojibake(value: string): string {
  try {
    const bytes = Uint8Array.from(value, (ch) => ch.charCodeAt(0) & 0xff);
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return value;
  }
}

function fieldValue(fields: Record<string, LarkCellValue>, fieldName: string): LarkCellValue {
  if (Object.prototype.hasOwnProperty.call(fields, fieldName)) return fields[fieldName];
  const wanted = fieldName.trim().toLocaleLowerCase();
  const found = Object.keys(fields).find(
    (key) => repairMojibake(key).trim().toLocaleLowerCase() === wanted,
  );
  return found ? fields[found] : undefined;
}

/** Lấy URL từ hyperlink field Lark (plain URL hoặc object/link segment). */
export function cellToUrl(v: LarkCellValue): string | null {
  if (typeof v === 'string') return /^https?:\/\//i.test(v.trim()) ? v.trim() : null;
  if (!Array.isArray(v)) return null;
  for (const part of v as Array<Record<string, unknown>>) {
    for (const candidate of [part.url, part.link, part.href, part.text]) {
      if (typeof candidate === 'string' && /^https?:\/\//i.test(candidate.trim())) return candidate.trim();
    }
  }
  return null;
}

export function cellToNumber(v: LarkCellValue): number {
  if (typeof v === 'number') return v;
  const s = cellToString(v);
  const n = s == null ? NaN : Number(s);
  return Number.isFinite(n) ? n : 0;
}

const TRUTHY_TEXT = new Set(['true', '1', 'x', 'có', 'yes', 'checked']);

/**
 * Coerce a Lark cell to boolean. Handles a plain checkbox (boolean) and the
 * real "Check nghiệm thu" field, which is a FORMULA column rendering as a
 * colored tag string — "✅ Đã nghiệm thu (1) máy" / "❌ Chưa nghiệm thu máy" —
 * so match by emoji/keyword rather than exact string (the trailing count varies).
 */
export function cellToBool(v: LarkCellValue): boolean {
  if (typeof v === 'boolean') return v;
  const s = cellToString(v);
  if (!s) return false;
  const norm = s.trim().toLowerCase();
  if (norm.includes('✅') || norm.includes('đã nghiệm thu')) return true;
  if (norm.includes('❌') || norm.includes('chưa nghiệm thu')) return false;
  return TRUTHY_TEXT.has(norm);
}

export interface MappedData {
  statesById: Record<string, DeskLiveState>;
  totalCheckIn: number;
  totalRegistered: number;
  /** Đã check-in nhưng chưa từng được điều phối vào bàn nào — chờ điều phối lần đầu. */
  waitingCheckin: WaitingCustomer[];
  /** Vừa hoàn tất 1 cụm, chưa được điều phối sang cụm tiếp theo (và chưa dispatch vào bàn nào). */
  waitingDispatch: WaitingCustomer[];
  /** Đã hoàn tất toàn bộ quy trình (Check-in cột "End flow" = "End flow"). */
  endFlow: WaitingCustomer[];
  /**
   * Roster nhân sự nguyên văn từ `Master_DS` — CHỈ form Điều phối dùng, không
   * phần nào của dashboard đọc tới (xem `RosterEntry`).
   */
  roster: RosterEntry[];
  /**
   * Tên khách ở các dòng `Master` KHÔNG xác định được bàn (trượt cả 3 nấc, xem
   * `latestByDeskAndName`) — những dòng bị bỏ hẳn.
   *
   * Có mặt ở đây để dashboard NÓI RA thay vì bỏ im lặng. Chính sự im lặng đó
   * đã giấu bug "Lark form suy bàn từ `Người`" (2026-08-17): dòng vẫn vào Base,
   * dashboard vẫn xanh mượt, không ai biết đang thiếu.
   *
   * Trùng tên đã gộp; sắp theo thứ tự gặp để danh sách ổn định giữa các lần poll.
   */
  unresolvedDeskNames: string[];
}

const END_FLOW_DONE = 'end flow';

/** Check-in "End flow" — "End flow" (đã xong toàn bộ) vs "In flow" (đang trong luồng). */
function isEndFlowValue(v: LarkCellValue): boolean {
  const s = cellToString(v);
  return s ? s.trim().toLowerCase() === END_FLOW_DONE : false;
}

interface CheckinIndexEntry {
  stt: string | null;
  product: string | null;
  note: string | null;
  deviceAccepted: boolean;
  deviceAcceptedText: string | null;
  /** Cột "Thu cũ check" — nguyên văn lựa chọn (single-select, có thể ≥ 2 tuỳ chọn). */
  oldDeviceCheck: string | null;
  /** Cột "Backup check" — nguyên văn lựa chọn. */
  backupCheck: string | null;
  /** Cột công thức "BC_Check backup" — trạng thái hiển thị trên Dashboard. */
  backupStatus: string | null;
  /** Khâu vừa hoàn tất (Check-in cột "Done in Flow") — chỉ có ý nghĩa khi khách đã xong 1 khâu. */
  doneInFlow: string | null;
  /** Đã hoàn tất toàn bộ quy trình (Check-in cột "End flow"). */
  endFlow: boolean;
}

/**
 * Index Check-in rows by customer name.
 *
 * Check-in's `STT` is the ONE canonical queue number for a customer — assigned
 * once at check-in and unchanged for the whole event.
 */
function indexCheckinByName(rows: LarkRecord[], fm: CheckinFieldMap): Map<string, CheckinIndexEntry> {
  const m = new Map<string, CheckinIndexEntry>();
  for (const r of rows) {
    const name = cellToString(fieldValue(r.fields, fm.name));
    if (name) {
      m.set(name, {
        stt: cellToString(r.fields[fm.stt]),
        product: cellToString(r.fields[fm.product]),
        note: cellToString(r.fields[fm.note]),
        deviceAccepted: cellToBool(r.fields[fm.deviceAccepted]),
        deviceAcceptedText: cellToString(r.fields[fm.deviceAccepted]),
        oldDeviceCheck: cellToString(r.fields[fm.oldDeviceCheck]),
        backupCheck: cellToString(r.fields[fm.backupCheck]),
        backupStatus: cellToString(r.fields[fm.backupStatus]),
        doneInFlow: cellToString(r.fields[fm.doneInFlow]),
        endFlow: isEndFlowValue(r.fields[fm.endFlow]),
      });
    }
  }
  return m;
}

function indexMasterHyperlinkByName(rows: LarkRecord[], fm: MasterFieldMap): Map<string, string> {
  const result = new Map<string, string>();
  for (const r of rows) {
    const name = cellToString(r.fields[fm.name]);
    const url = cellToUrl(r.fields[fm.hyperlink]);
    if (name && url) result.set(name, url);
  }
  return result;
}

/**
 * Mã option Lark thô (dạng "optXXXXXXXXXX") — leak ra khi 1 field
 * single-select dùng OPTIONS ĐỘNG (vd `TV_MãNV`, options lấy từ `DS Master`
 * qua `optionsRule` thay vì danh sách cố định) và REST API không tự resolve
 * được thành chữ hiển thị (bug thật user báo 2026-08-06: TV5 không đổi trạng
 * thái dù `Trạng thái` đã "Tiếp nhận" — vì `TV_MãNV` trả về "opt..." thay vì
 * "TV5", cùng cơ chế với bug "Done in Flow" trước đó, khác là field này
 * không sửa được bằng công thức Lark nên phải lọc ở code). Coi như KHÔNG có
 * giá trị — dùng mã rác làm khoá join sẽ tạo 1 "bàn ma" không khớp vị trí
 * nào; trả `null` để rơi về fallback qua NV (`deskCodeByStaffName`, xem
 * `latestByDeskAndName`) thay vì mất trắng như khi thật sự không có mã bàn.
 */
function isUnresolvedOptionId(v: string): boolean {
  return /^opt[A-Za-z0-9]{6,}$/.test(v);
}

/**
 * "BK<n>" giờ map TRỰC TIẾP vào đúng 1 vị trí thật trên sơ đồ theo quy ước
 * user đặt (2026-08-06, tiếp — cụ thể hoá quyết định "Backup giao cho cả Tư
 * vấn lẫn Thu cũ, quy về bàn CHÍNH của NV" ở trên): NV Tư vấn làm Backup vẫn
 * NGỒI ĐÚNG bàn Tư vấn của mình khi đó — BK1..BK8 = TV1..TV8 (khớp số); NV
 * Thu cũ làm Backup thì BK11..BK13 = TC1..TC3 (lệch 10 để không trùng số với
 * dải TV). Đây là quy ước CỐ ĐỊNH, đáng tin hơn suy qua `DS Master` (phụ
 * thuộc dữ liệu roster có đúng/đủ hay không — từng lỗi nhiều lần trong
 * session này) — dùng map này TRƯỚC khi rơi về fallback qua NV. Trong thực
 * tế API hầu như luôn trả mã option chưa resolve (xem `isUnresolvedOptionId`)
 * thay vì chữ "BK5" thật, nên map này chủ yếu là lớp phòng thủ thêm — fallback
 * qua NV (`deskCodeByStaffName`) vẫn là đường chính khi gặp mã option thô.
 */
const BK_TO_DESK: Record<string, string> = {
  BK1: 'BK1',
  BK2: 'BK2',
  BK3: 'BK3',
  BK4: 'BK4',
  BK5: 'BK5',
  BK6: 'BK6',
  BK7: 'BK7',
  BK8: 'BK8',
  BK9: 'BK9',
  BK10: 'BK10',
  BK11: 'TC1',
  BK12: 'TC2',
  BK13: 'TC3',
};

/** Mã hiển thị Kỹ thuật trong Điều phối → mã join cũ đang dùng trong Lark. */
const KT_TO_DESK: Record<string, string> = {
  KT1: 'TC1',
  KT2: 'TC2',
  KT3: 'TC3',
};

/**
 * NV "Backup" (mã "BK<n>") KHÔNG map cứng vào riêng Kỹ thuật nữa (đảo ngược
 * quyết định 2026-08-06 trước đó): giờ backup được giao cho CẢ NV Tư vấn lẫn
 * Thu cũ. "BK<n>" khớp `BK_TO_DESK` thì dùng luôn (quy ước cố định, xem
 * trên); không khớp (vd "BK9"/"BK10" ngoài phạm vi, hoặc mã option thô) thì
 * coi như KHÔNG hợp lệ (trả `null`) để rơi về fallback qua NV
 * (`deskCodeByStaffName`), tìm đúng bàn CHÍNH (Tư vấn/Thu cũ) mà NV đó đang
 * ngồi — xem module doc.
 */
export function normalizeDeskCode(raw: string | null): string | null {
  if (!raw || isUnresolvedOptionId(raw)) return null;
  // Lark single-select/lookup values may arrive with spaces or the UI alias
  // (KT1) instead of the stored technical code (TC1). Normalize both forms
  // before joining dispatch rows to the fixed layout position.
  const normalized = raw.trim().toUpperCase().replace(/\s+/g, '');
  // BK.X is a real standalone Lark code (not BK11/BK13). Some integrations
  // strip punctuation from single-select values, so accept both spellings.
  if (normalized === 'BK.X' || normalized === 'BKX') return 'BK.X';
  if (normalized === 'BK.X2' || normalized === 'BKX2') return 'BK.X2';
  if (KT_TO_DESK[normalized]) return KT_TO_DESK[normalized];
  const kt = /^K(?:T|ỸTHUẬT)([1-3])$/.exec(normalized);
  if (kt) return `TC${kt[1]}`;
  const tc = /^TC([1-3])$/.exec(normalized);
  if (tc) return `TC${tc[1]}`;
  const m = /^BK\d+$/i.exec(raw);
  if (m) return BK_TO_DESK[normalized] ?? null;
  return normalized;
}

/** Suy cụm từ tiền tố mã bàn — "TC..." → Kỹ thuật, "TV..." → Tư vấn (xem layoutConfig.ts's `ID_PREFIX`). */
function clusterFromDeskCode(code: string | null): ClusterKey | null {
  if (!code) return null;
  if (code === 'BK.X' || code === 'BK.X2') return 'backup';
  if (code.startsWith('TC')) return 'tradein';
  if (code.startsWith('TV')) return 'consult';
  if (code.startsWith('BK')) return 'backup';
  return null;
}

interface DeskGroup {
  customers: DeskCustomer[];
}

/** 1 dòng `Master`, giữ nguyên field thô cần cho bước "chỉ lấy dòng mới nhất". */
interface MasterRow {
  deskCode: string;
  name: string;
  time: number;
  status: string | null;
}

/**
 * Lark có thể ghi 1 DÒNG MỚI mỗi lần đổi trạng thái (Tiếp nhận → Hoàn tất)
 * thay vì sửa lại dòng cũ — nếu chỉ lọc "có dòng nào đó = Tiếp nhận" thì dòng
 * Tiếp nhận cũ (chưa bị xoá) sẽ khiến khách bị KẸT LẠI ở bàn dù đã có dòng
 * Hoàn tất mới hơn cho đúng cặp (bàn, khách) đó (bug thật user báo
 * 2026-08-05: STT4 đã Hoàn tất nhưng vẫn hiện ở bàn Tư vấn). Gom theo cặp
 * (mã bàn, tên khách), chỉ giữ dòng có `Thời gian` LỚN NHẤT cho mỗi cặp.
 *
 * **Vị trí KHÔNG BAO GIỜ suy từ cột `Người`** (bỏ 2026-08-17, thay cho fallback
 * `deskCodeByStaffName` cũ). Dữ liệu vào bảng này từ HAI nguồn:
 *
 * - Web app (`/record`): có `TV_MãNV` = mã bàn thật, `Người` để trống.
 * - Lark form: `TV_MãNV` trống, `Người` là NGƯỜI BẤM FORM (dùng làm trigger cho
 *   automation bên Lark) — không phải NV ngồi bàn.
 *
 * Suy bàn từ `Người` nên tô đỏ đúng bàn của người vận hành trong `DS Master`,
 * tức SAI VỊ TRÍ mỗi khi khách vào qua Lark form. Giờ chỉ còn hai nguồn, cả
 * hai đều khoá theo đúng đối tượng cần biết:
 *
 * 1. `TV_MãNV` ghi thẳng trên dòng — mã bàn.
 * 2. `Submit by` (MSNV) → roster `DS Master`. Cứu khách VÀO THẲNG bàn không
 *    qua Điều phối: dòng đó không có gì bên Điều phối để tra. Đặt TRƯỚC nấc 3
 *    vì dữ liệu của chính dòng đó đáng tin hơn tra chéo bảng khác (phân công
 *    cũ có thể đã đổi).
 * 3. Bảng Điều phối, tra theo TÊN KHÁCH **và ĐÚNG KHÂU** (`Loại 2`): một khách
 *    có thể lần lượt qua TV, TC rồi BK, nên không được lấy bừa cột đầu tiên
 *    khác rỗng.
 *
 * Cả ba trượt thì bỏ dòng như cũ — không đoán bừa.
 */
function latestByDeskAndName(
  rows: LarkRecord[],
  fm: MasterFieldMap,
  dispatchDetailByName: Map<string, DispatchDetail>,
  deskCodeByStaffId: Map<string, string>,
): { rows: MasterRow[]; unresolvedNames: string[] } {
  const latest = new Map<string, MasterRow>();
  // Set để tên trùng chỉ đếm 1 lần (1 khách thường có cả dòng Tiếp nhận lẫn
  // Hoàn tất), nhưng vẫn giữ thứ tự gặp — danh sách ổn định giữa các lần poll.
  const unresolved = new Set<string>();
  for (const r of rows) {
    const name = cellToString(fieldValue(r.fields, fm.name));
    if (!name) continue;
    // CHỈ xét dòng mang trạng thái phục vụ. Bảng còn có dòng "Thu máy nhanh"
    // (thao tác chỉ-cầm-máy, xem `staffActionWebhook.StaffActionPayload`) —
    // nó phải VÔ HẠI đúng như thiết kế, nhưng nếu để lọt vào đây thì với tư
    // cách dòng MỚI NHẤT của cặp (bàn, khách) nó sẽ che dòng "Hoàn tất" cũ
    // hơn, làm khách biến mất khỏi bàn ở CẢ hai danh sách (đang tiếp nhận và
    // đã hoàn tất) — bug thật user báo 2026-08-19: TC1 hoàn tất 1 khách nhưng
    // màn hình Kho không hiện. Dòng trạng thái rỗng cũng bị loại vì cùng lý do.
    const rowStatus = cellToString(fieldValue(r.fields, fm.status));
    if (rowStatus !== STATUS_RECEIVED && rowStatus !== STATUS_COMPLETED) continue;
    const stage = normalizedStage(cellToString(fieldValue(r.fields, fm.stage)));
    const msnv = cellToString(fieldValue(r.fields, fm.submitBy))?.trim().toUpperCase();
    const deskCode =
      normalizeDeskCode(cellToString(fieldValue(r.fields, fm.deskCode))) ??
      (msnv ? deskCodeByStaffId.get(msnv) ?? null : null) ??
      normalizeDeskCode(deskCodeFromDispatch(dispatchDetailByName.get(name), stage)) ??
      null;
    if (!deskCode) {
      unresolved.add(name);
      continue;
    }
    const time = cellToNumber(fieldValue(r.fields, fm.time));
    const key = `${deskCode} ${name}`;
    const prev = latest.get(key);
    if (!prev || time >= prev.time) {
      latest.set(key, { deskCode, name, time, status: rowStatus });
    }
  }
  return { rows: [...latest.values()], unresolvedNames: [...unresolved] };
}

/**
 * Mã bàn đã điều phối cho khách này Ở ĐÚNG KHÂU của dòng `Master`.
 *
 * `Loại 2` trống/không nhận ra thì mới rơi về thứ tự ưu tiên cũ (Backup → Thu
 * cũ → Tư vấn) — chấp nhận đoán, nhưng chỉ khi thật sự không có gì để phân
 * biệt, thay vì đoán mặc định như trước.
 */
function deskCodeFromDispatch(
  detail: DispatchDetail | undefined,
  stage: 'consult' | 'tradein' | 'backup' | null,
): string | null {
  if (!detail) return null;
  if (stage === 'backup') return detail.dsBackup;
  if (stage === 'tradein') return detail.dsThuCu;
  if (stage === 'consult') return detail.dsTuVan;
  return detail.dsBackup ?? detail.dsThuCu ?? detail.dsTuVan;
}

/**
 * Gom khách đang "Tiếp nhận" (bảng `Master`) theo MÃ BÀN (`TV_MãNV`, khớp
 * thẳng `TablePosition.id`), từ danh sách ĐÃ dedupe theo dòng mới nhất mỗi
 * cặp (bàn, khách) — xem `latestByDeskAndName`. Sắp theo "Thời gian" tăng dần.
 *
 * KHÔNG còn lấy tên NV từ cột `Người`: dòng vào qua Lark form mang tên người
 * bấm form, hiện lên node bàn là sai người. Tên NV giờ lấy từ roster
 * `DS Master` theo mã bàn (`staffNameByDeskCode`), nguồn duy nhất biết ai ngồi
 * bàn nào.
 */
function indexMasterByDeskCode(
  latestRows: MasterRow[],
  checkinByName: Map<string, CheckinIndexEntry>,
  dispatchDetailByName: Map<string, DispatchDetail>,
  hyperlinkByName: Map<string, string>,
): Map<string, DeskGroup> {
  const entries: Array<{ deskCode: string; time: number; customer: DeskCustomer }> = [];

  for (const row of latestRows) {
    if (row.status !== STATUS_RECEIVED) continue;
    const ci = checkinByName.get(row.name);
    const dd = dispatchDetailByName.get(row.name);
    entries.push({
      deskCode: row.deskCode,
      time: row.time,
      customer: {
        stt: ci?.stt ?? null,
        name: row.name,
        productName: ci?.product ?? null,
        paymentNote: ci?.note ?? null,
        deviceAccepted: ci?.deviceAccepted ?? null,
        deviceAcceptedText: ci?.deviceAcceptedText ?? null,
        hyperlink: hyperlinkByName.get(row.name) ?? null,
        oldDeviceCheck: ci?.oldDeviceCheck ?? null,
        backupCheck: ci?.backupCheck ?? null,
        backupStatus: ci?.backupStatus ?? null,
        dsTuVan: dd?.dsTuVan ?? null,
        dsThuCu: dd?.dsThuCu ?? null,
        dsBackup: dd?.dsBackup ?? null,
      },
    });
  }

  entries.sort((a, b) => a.time - b.time);
  const result = new Map<string, DeskGroup>();
  for (const e of entries) {
    const g = result.get(e.deskCode) ?? { customers: [] };
    g.customers.push(e.customer);
    result.set(e.deskCode, g);
  }
  return result;
}

/**
 * Gom tên khách đã được điều phối vào 1 mã bàn cụ thể (bảng `Master Điều
 * phối`, cột `DS Thu cũ`/`DS Tư vấn` tuỳ cụm — 1 dòng chỉ có ĐÚNG 1 trong 2
 * cột này khác rỗng tuỳ "Phân loại", nên đọc cả 2 cột trên mọi dòng là an toàn).
 */
export function unusedIndexDispatchByDeskCode(rows: LarkRecord[], fm: DispatchFieldMap): Map<string, Set<string>> {
  // Base vẫn lưu mã thật TC1/TC2/TC3 và BK11/BK12/BK13. normalizeDeskCode
  // quy cả hai về vị trí nội bộ TC1/TC2/TC3; layout sẽ render thành KT1/KT2/KT3.
  // DS Backup cũng là một phân công hợp lệ nên phải tính vào hàng chờ của vị
  // trí tương ứng, không chỉ dùng để hiển thị popover.
  const deskFields = [fm.deskField.tradein, fm.deskField.consult, fm.backupDeskField];
  const result = new Map<string, Set<string>>();
  for (const r of rows) {
    const name = cellToString(r.fields[fm.name]);
    if (!name) continue;
    for (const field of deskFields) {
      const deskCode = normalizeDeskCode(cellToString(fieldValue(r.fields, field)));
      if (!deskCode) continue;
      const set = result.get(deskCode) ?? new Set<string>();
      set.add(name);
      result.set(deskCode, set);
    }
  }
  return result;
}

/** 3 cột mã bàn thô của 1 khách trong `Master Điều phối` — CHỈ để hiển thị, xem `DispatchFieldMap`'s doc. */
interface DispatchDetail {
  dsTuVan: string | null;
  dsThuCu: string | null;
  dsBackup: string | null;
}

/**
 * Chuẩn hoá riêng mã HIỂN THỊ ở cột DS Backup. Backup có mã khâu độc lập dù
 * cùng một người/bàn chính đảm nhận: TV1..TV8 → BK1..BK8 và
 * TC1..TC3 → BK11..BK13. Nếu Lark đã trả BK<n> thì giữ nguyên.
 */
function backupDisplayCode(raw: string | null): string | null {
  if (!raw || isUnresolvedOptionId(raw)) return null;
  const code = raw.toUpperCase();
  if (/^BK\d+$/.test(code)) return code;
  const tv = /^TV([1-9]|10)$/.exec(code);
  if (tv) return `BK${tv[1]}`;
  const tc = /^TC([1-3])$/.exec(code);
  if (tc) return `BK${Number(tc[1]) + 10}`;
  return raw;
}

/**
 * Tên khách → 3 mã khâu ("DS Tư vấn"/"DS Thu cũ"/"DS Backup") trong
 * `Master Điều phối`. Một khách có thể có nhiều dòng Điều phối qua nhiều
 * khâu, nên cộng dồn giá trị mới nhất của TỪNG CỘT; không để dòng mới chỉ có
 * TV ghi đè và làm mất TC/BK của dòng cũ.
 */
function indexDispatchDetailByName(rows: LarkRecord[], fm: DispatchFieldMap): Map<string, DispatchDetail> {
  const result = new Map<string, DispatchDetail>();
  for (const r of rows) {
    const name = cellToString(fieldValue(r.fields, fm.name));
    if (!name) continue;
    const previous = result.get(name) ?? { dsTuVan: null, dsThuCu: null, dsBackup: null };
    const dsTuVan = cellToString(fieldValue(r.fields, fm.deskField.consult));
    const dsThuCu = cellToString(fieldValue(r.fields, fm.deskField.tradein));
    const dsBackup = backupDisplayCode(cellToString(fieldValue(r.fields, fm.backupDeskField)));
    result.set(name, {
      dsTuVan: dsTuVan ?? previous.dsTuVan,
      dsThuCu: dsThuCu ?? previous.dsThuCu,
      dsBackup: dsBackup ?? previous.dsBackup,
    });
  }
  return result;
}

function normalizedStage(raw: string | null): 'consult' | 'tradein' | 'backup' | null {
  const stage = raw?.trim().toLowerCase() ?? '';
  if (stage.includes('backup') || stage.includes('back up')) return 'backup';
  if (stage.includes('thu cũ') || stage.includes('thu cu')) return 'tradein';
  if (stage.includes('tư vấn') || stage.includes('tu van')) return 'consult';
  return null;
}

/**
 * Ghi đè dữ liệu Điều phối bằng người/bàn THỰC TẾ đã tiếp nhận trong
 * SS_Master. Chỉ ghi đè đúng khâu của từng record (`Loại 2`), vì cùng một
 * khách có thể lần lượt qua TV, TC và BK ở các thời điểm khác nhau.
 *
 * Cũng KHÔNG suy bàn từ `Người` nữa — cùng lý do ở `latestByDeskAndName`: dòng
 * vào qua Lark form mang tên người bấm form, suy ra là ghi nhầm bàn vào chi
 * tiết phân công của khách.
 */
function mergeReceivedDetailByName(
  dispatchDetails: Map<string, DispatchDetail>,
  rows: LarkRecord[],
  fm: MasterFieldMap,
  deskCodeByStaffId: Map<string, string>,
): Map<string, DispatchDetail> {
  const result = new Map<string, DispatchDetail>();
  for (const [name, detail] of dispatchDetails) result.set(name, { ...detail });

  const ordered = [...rows].sort(
    (a, b) => cellToNumber(fieldValue(a.fields, fm.time)) - cellToNumber(fieldValue(b.fields, fm.time)),
  );
  for (const row of ordered) {
    const name = cellToString(fieldValue(row.fields, fm.name));
    const status = cellToString(fieldValue(row.fields, fm.status));
    const stage = normalizedStage(cellToString(fieldValue(row.fields, fm.stage)));
    if (!name || (status !== STATUS_RECEIVED && status !== STATUS_COMPLETED)) continue;

    const rawDeskCode = cellToString(fieldValue(row.fields, fm.deskCode));
    const msnv = cellToString(fieldValue(row.fields, fm.submitBy))?.trim().toUpperCase();
    const primaryDeskCode =
      normalizeDeskCode(rawDeskCode) ??
      (msnv ? deskCodeByStaffId.get(msnv) ?? null : null) ??
      normalizeDeskCode(deskCodeFromDispatch(dispatchDetails.get(name), stage));
    const previous = result.get(name) ?? { dsTuVan: null, dsThuCu: null, dsBackup: null };

    // BK.X/BK.X2 are standalone Backup nodes. Once SS_Master records the
    // actual reception code, it must override the dispatch-side value so the
    // popup shows the real Backup node instead of an empty/old assignment.
    if (primaryDeskCode === 'BK.X' || primaryDeskCode === 'BK.X2') {
      previous.dsBackup = primaryDeskCode;
    }

    // A standalone Backup node must still be shown even if the stage field is
    // absent/mapped differently in the live Base response.
    if (!stage) {
      result.set(name, previous);
      continue;
    }

    if (stage === 'consult' && primaryDeskCode?.startsWith('TV')) previous.dsTuVan = primaryDeskCode;
    if (stage === 'tradein' && primaryDeskCode?.startsWith('TC')) previous.dsThuCu = primaryDeskCode;
    if (stage === 'backup') previous.dsBackup = backupDisplayCode(rawDeskCode) ?? backupDisplayCode(primaryDeskCode);
    result.set(name, previous);
  }
  return result;
}

/** Mã bàn → "STT tiếp theo" (bảng `DS Master` — CHỈ đọc field này, xem module doc). */
function indexNextSttByDeskCode(rows: LarkRecord[], fm: DsMasterFieldMap): Map<string, string> {
  const result = new Map<string, string>();
  for (const r of rows) {
    const deskCode = normalizeDeskCode(cellToString(r.fields[fm.code]));
    const nextStt = cellToString(r.fields[fm.nextStt]);
    if (deskCode && nextStt) result.set(deskCode, nextStt);
  }
  return result;
}

function indexWaitingCountByDeskCode(rows: LarkRecord[], fm: DsMasterFieldMap): Map<string, number> {
  const result = new Map<string, number>();
  for (const r of rows) {
    const deskCode = normalizeDeskCode(cellToString(fieldValue(r.fields, fm.code)));
    if (!deskCode) continue;
    const count = cellToNumber(fieldValue(r.fields, fm.waitingCount));
    result.set(deskCode, Math.max(0, count));
  }
  return result;
}

/**
 * Mã bàn → tên NV ngồi bàn đó (`DS Master`: "STT bàn" → "NV Tư vấn").
 *
 * Đây là nguồn DUY NHẤT cho tên NV hiện trên node bàn. Trước đây tên lấy từ
 * cột `Người` của bảng `Master`, nhưng dòng vào qua Lark form đặt ở đó tên
 * NGƯỜI BẤM FORM (trigger automation) chứ không phải NV ngồi bàn — hiện lên
 * sơ đồ là sai người. Roster thì luôn đúng theo định nghĩa.
 *
 * KHÔNG lọc `PRIMARY_DESK_LOAI` ở đây, khác với `indexDeskCodeByStaffId`: bộ
 * lọc đó cần cho chiều NGƯỢC (1 người có nhiều dòng nên phải chọn dòng bàn
 * chính), còn chiều này khoá là MÃ BÀN — vốn duy nhất mỗi dòng. Lọc chỉ làm
 * các node Backup mất tên NV. Trùng mã bàn (đổi ca) → lấy dòng đầu tiên, cùng
 * quy ước với các index khác trong file này.
 */
function indexStaffNameByDeskCode(rows: LarkRecord[], fm: DsMasterFieldMap): Map<string, string> {
  const result = new Map<string, string>();
  for (const r of rows) {
    const staffName = cellToString(r.fields[fm.staff]);
    const deskCode = normalizeDeskCode(cellToString(r.fields[fm.code]));
    if (staffName && deskCode && !result.has(deskCode)) result.set(deskCode, staffName);
  }
  return result;
}

/**
 * MSNV → mã bàn CHÍNH (`DS Master`: "MSNV" → "STT bàn").
 *
 * Đây là đường cứu khách VÀO THẲNG bàn, không qua Điều phối: dòng đó không có
 * gì trong bảng Điều phối để tra, nên nếu `TV_MãNV` cũng trống thì MSNV ở cột
 * `Submit by` là manh mối DUY NHẤT còn lại.
 *
 * Khác hẳn fallback theo `Người` đã bỏ: MSNV là MÃ NHÂN VIÊN cố định, không
 * phải tên người bấm form. Vẫn phải là mã của NV NGỒI BÀN — Lark form để người
 * vận hành điền MSNV của chính họ thì lại sai bàn y như cũ.
 *
 * Chỉ lấy dòng `PRIMARY_DESK_LOAI` (bỏ "Backup"/"Kho" — không phải vị trí vật
 * lý). 1 NV có ≥ 2 dòng bàn chính → lấy dòng đầu tiên gặp.
 */
function indexDeskCodeByStaffId(rows: LarkRecord[], fm: DsMasterFieldMap): Map<string, string> {
  const result = new Map<string, string>();
  for (const r of rows) {
    const loai = cellToString(r.fields[fm.loai]);
    if (!loai || !PRIMARY_DESK_LOAI.has(loai)) continue;
    const staffId = cellToString(r.fields[fm.staffId])?.trim().toUpperCase();
    const deskCode = normalizeDeskCode(cellToString(r.fields[fm.code]));
    if (staffId && deskCode && !result.has(staffId)) result.set(staffId, deskCode);
  }
  return result;
}

/**
 * Roster nhân sự từ `Master_DS`, giữ NGUYÊN VĂN cột "Loại" (kể cả "Kho" —
 * không có trên sơ đồ) và giữ cả dòng chưa gán NV. Khác hẳn
 * `indexDeskCodeByStaffId` (lọc `PRIMARY_DESK_LOAI`, khoá theo MSNV, phục vụ
 * việc suy mã bàn): ở đây khoá là MÃ BÀN nên các loại không đụng nhau, và
 * form Điều phối cần đúng bộ giá trị "Loại" thật của Lark để khớp field
 * single-select bên Base. Trùng mã bàn (đổi ca) → lấy dòng đầu tiên, cùng quy
 * ước với các index khác trong file này.
 */
function buildRoster(rows: LarkRecord[], fm: DsMasterFieldMap): RosterEntry[] {
  const seen = new Set<string>();
  const out: RosterEntry[] = [];
  for (const r of rows) {
    const deskCode = normalizeDeskCode(cellToString(r.fields[fm.code]));
    const loai = cellToString(r.fields[fm.loai]);
    if (!deskCode || !loai || seen.has(deskCode)) continue;
    seen.add(deskCode);
    out.push({
      deskCode,
      loai,
      staffName: cellToString(r.fields[fm.staff]) ?? '',
      staffId: cellToString(r.fields[fm.staffId || 'MSNV']) ?? cellToString(r.fields.MSNV) ?? '',
    });
  }
  return out;
}

export function mapDeskStates(tables: LarkTables, fields: FieldConfig = toFieldConfig()): MappedData {
  const { checkin, master, dispatch, dsMaster } = fields;
  const checkinByName = indexCheckinByName(tables.checkin, checkin);
  const hyperlinkByName = indexMasterHyperlinkByName(tables.master, master);
  const staffNameByDeskCode = indexStaffNameByDeskCode(tables.dsMaster, dsMaster);
  const deskCodeByStaffId = indexDeskCodeByStaffId(tables.dsMaster, dsMaster);
  const dispatchDetailByName = indexDispatchDetailByName(tables.dispatch, dispatch);
  const personnelDetailByName = mergeReceivedDetailByName(
    dispatchDetailByName,
    tables.master,
    master,
    deskCodeByStaffId,
  );
  // Dedupe 1 LẦN — dùng chung cho cả occupancy (dưới) lẫn "Chờ điều phối"
  // (xa hơn), tránh 1 dòng "Tiếp nhận" cũ chưa xoá đè lên dòng "Hoàn tất" mới
  // hơn cho cùng cặp (bàn, khách) — xem `latestByDeskAndName`.
  const { rows: latestMasterRows, unresolvedNames: unresolvedDeskNames } = latestByDeskAndName(
    tables.master,
    master,
    dispatchDetailByName,
    deskCodeByStaffId,
  );
  const activeByDeskCode = indexMasterByDeskCode(latestMasterRows, checkinByName, personnelDetailByName, hyperlinkByName);
  const nextSttByDeskCode = indexNextSttByDeskCode(tables.dsMaster, dsMaster);
  const waitingCountByDeskCode = indexWaitingCountByDeskCode(tables.dsMaster, dsMaster);
  const statesById: Record<string, DeskLiveState> = {};

  // Đang được phục vụ ở BẤT KỲ bàn nào ngay lúc này.
  const activeNames = new Set<string>();
  // Đã từng xuất hiện trong Master (bất kỳ trạng thái) — dùng để loại khỏi "Chờ check-in".
  const everSeenNames = new Set<string>();

  for (const r of tables.master) {
    const name = cellToString(r.fields[master.name]);
    if (name) everSeenNames.add(name);
  }

  // Khách ĐÃ hoàn tất tại từng bàn — dòng mới nhất mỗi cặp (bàn, khách) có
  // `Trạng thái` = "Hoàn tất" (cùng nguồn dedupe `latestMasterRows` ở trên,
  // nên 1 khách Tiếp nhận lại sau đó KHÔNG còn nằm ở đây nữa — đúng nghĩa
  // "lịch sử", không phải khách hiện tại). Sắp mới nhất trước (theo `row.time`
  // gốc, giảm dần) cho màn hình NV (`StaffDeskScreen`'s "Khách đã tiếp nhận ·
  // hoàn tất") — sort NGAY TRONG lúc còn giữ `row.time` vì `DeskCustomer`
  // (kiểu chung, dashboard cũng dùng) không có field thời gian.
  const completedRows = latestMasterRows
    .filter((row) => row.status === STATUS_COMPLETED)
    .sort((a, b) => b.time - a.time);
  const completedByDeskCode = new Map<string, DeskCustomer[]>();
  for (const row of completedRows) {
    const ci = checkinByName.get(row.name);
    const list = completedByDeskCode.get(row.deskCode) ?? [];
    list.push({
      stt: ci?.stt ?? null,
      name: row.name,
      productName: ci?.product ?? null,
      paymentNote: ci?.note ?? null,
      deviceAccepted: ci?.deviceAccepted ?? null,
      deviceAcceptedText: ci?.deviceAcceptedText ?? null,
      hyperlink: hyperlinkByName.get(row.name) ?? null,
      oldDeviceCheck: ci?.oldDeviceCheck ?? null,
      backupCheck: ci?.backupCheck ?? null,
      backupStatus: ci?.backupStatus ?? null,
    });
    completedByDeskCode.set(row.deskCode, list);
  }

  for (const pos of ALL_POSITIONS) {
    const code = pos.id;
    const group = activeByDeskCode.get(code);
    const receivedCustomers = group?.customers ?? [];
    const occupied = receivedCustomers.length > 0;
    for (const c of receivedCustomers) if (c.name) activeNames.add(c.name);

    // SL khách chờ và STT tiếp theo đều lấy trực tiếp từ DS Master.
    // Master Điều phối chỉ còn là nguồn chi tiết phân công/nhân sự.
    const waiting = waitingCountByDeskCode.get(code) ?? 0;

    const primary = receivedCustomers[0];
    statesById[code] = {
      staffName: staffNameByDeskCode.get(code) ?? null,
      waiting,
      nextWaitingStt: nextSttByDeskCode.get(code) ?? null,
      currentStatus: occupied ? 'Đang tiếp nhận' : 'Rảnh',
      isOccupied: occupied,
      hasData: true,
      customerSTT: primary?.stt ?? null,
      customerName: primary?.name ?? null,
      productName: primary?.productName ?? null,
      paymentNote: primary?.paymentNote ?? null,
      deviceAccepted: primary?.deviceAccepted ?? null,
      deviceAcceptedText: primary?.deviceAcceptedText ?? null,
      receivedCustomers,
      completedCustomers: completedByDeskCode.get(code) ?? [],
    };
  }

  // Ứng viên "chờ điều phối" — quét dòng MỚI NHẤT mỗi cặp (bàn, khách) trong
  // `Master` (cùng nguồn dedupe với occupancy ở trên): dòng nào `Trạng thái` =
  // "Hoàn tất" nghĩa là NV vừa xong 1 khách tại bàn đó (nguồn đáng tin hơn
  // Check-in's "Status in <cụm>", vốn là formula riêng có thể không đồng bộ
  // kịp với Master).
  const completedCandidates: WaitingCustomer[] = [];
  for (const row of latestMasterRows) {
    if (row.status !== STATUS_COMPLETED) continue;
    const ci = checkinByName.get(row.name);
    const dd = personnelDetailByName.get(row.name);
    completedCandidates.push({
      stt: ci?.stt ?? null,
      name: row.name,
      productName: ci?.product ?? null,
      paymentNote: ci?.note ?? null,
      deviceAccepted: ci?.deviceAccepted ?? null,
      deviceAcceptedText: ci?.deviceAcceptedText ?? null,
      hyperlink: hyperlinkByName.get(row.name) ?? null,
      oldDeviceCheck: ci?.oldDeviceCheck ?? null,
      backupCheck: ci?.backupCheck ?? null,
      backupStatus: ci?.backupStatus ?? null,
      dsTuVan: dd?.dsTuVan ?? null,
      dsThuCu: dd?.dsThuCu ?? null,
      dsBackup: dd?.dsBackup ?? null,
      fromCluster: clusterFromDeskCode(row.deskCode),
      doneInFlow: ci?.doneInFlow ?? null,
    });
  }

  // "Chờ điều phối": hoàn tất 1 khâu, chưa đang được phục vụ ở đâu. Đã điều
  // phối (Master Điều phối) hay chưa KHÔNG ảnh hưởng — chỉ khi thật sự có
  // dòng "Tiếp nhận" mới (tức góp mặt trong activeNames) mới rời khỏi đây.
  const dispatchSeen = new Set<string>();
  const waitingDispatch: WaitingCustomer[] = [];
  for (const cand of completedCandidates) {
    if (!cand.name || activeNames.has(cand.name) || dispatchSeen.has(cand.name)) continue;
    if (checkinByName.get(cand.name)?.endFlow) continue;
    dispatchSeen.add(cand.name);
    waitingDispatch.push(cand);
  }

  // "Chờ check-in": đã check-in nhưng chưa từng xuất hiện ở Master (tức chưa
  // từng được NV nào nhận — đã điều phối rồi cũng vẫn tính, cho tới lúc có
  // dòng "Tiếp nhận" thật).
  const waitingCheckin: WaitingCustomer[] = [];
  for (const r of tables.checkin) {
    const name = cellToString(r.fields[checkin.name]);
    if (!name || everSeenNames.has(name) || activeNames.has(name)) continue;
    const dd = personnelDetailByName.get(name);
    waitingCheckin.push({
      stt: cellToString(r.fields[checkin.stt]),
      name,
      productName: cellToString(r.fields[checkin.product]),
      paymentNote: cellToString(r.fields[checkin.note]),
      deviceAccepted: cellToBool(r.fields[checkin.deviceAccepted]),
      deviceAcceptedText: cellToString(r.fields[checkin.deviceAccepted]),
      oldDeviceCheck: cellToString(r.fields[checkin.oldDeviceCheck]),
      backupCheck: cellToString(r.fields[checkin.backupCheck]),
      backupStatus: cellToString(r.fields[checkin.backupStatus]),
      hyperlink: cellToUrl(r.fields[checkin.dispatchHyperlink]),
      dsTuVan: dd?.dsTuVan ?? null,
      dsThuCu: dd?.dsThuCu ?? null,
      dsBackup: dd?.dsBackup ?? null,
    });
  }

  // "End Flow": đã hoàn tất toàn bộ quy trình (Check-in cột "End flow").
  const endFlow: WaitingCustomer[] = [];
  for (const [name, ci] of checkinByName) {
    if (!ci.endFlow) continue;
    const dd = personnelDetailByName.get(name);
    endFlow.push({
      stt: ci.stt,
      name,
      productName: ci.product,
      paymentNote: ci.note,
      deviceAccepted: ci.deviceAccepted,
      deviceAcceptedText: ci.deviceAcceptedText,
      hyperlink: hyperlinkByName.get(name) ?? null,
      oldDeviceCheck: ci.oldDeviceCheck,
      backupCheck: ci.backupCheck,
      backupStatus: ci.backupStatus,
      dsTuVan: dd?.dsTuVan ?? null,
      dsThuCu: dd?.dsThuCu ?? null,
      dsBackup: dd?.dsBackup ?? null,
      doneInFlow: ci.doneInFlow,
    });
  }

  const totalCheckIn = new Set(
    tables.checkin
      .map((r) => cellToString(r.fields[checkin.stt]))
      .filter((s): s is string => Boolean(s)),
  ).size;

  // "Danh sách đơn hàng" — total registered (row count).
  const totalRegistered = tables.orders?.length ?? 0;

  return {
    statesById,
    totalCheckIn,
    totalRegistered,
    waitingCheckin,
    waitingDispatch,
    endFlow,
    roster: buildRoster(tables.dsMaster, dsMaster),
    unresolvedDeskNames,
  };
}
