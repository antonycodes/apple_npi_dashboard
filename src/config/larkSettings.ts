/**
 * larkSettings — user-editable Lark connection + field mapping, persisted to
 * Cấu hình runtime trong bộ nhớ. Cấu hình chính thức nằm trên Worker KV và
 * được hook đồng bộ kéo về; không lưu API URL/webhook/field map vào trình duyệt.
 */
import { useSyncExternalStore } from 'react';
import type { ClusterKey } from '@/types/desk';
import type { TableKey } from '@/services/larkTypes';
import {
  DEFAULT_CHECKIN_FIELDS,
  DEFAULT_DISPATCH_FIELDS,
  DEFAULT_DS_MASTER_FIELDS,
  DEFAULT_MASTER_FIELDS,
  ENV_DEFAULTS,
  type CheckinFieldMap,
  type DispatchFieldMap,
  type DsMasterFieldMap,
  type FieldConfig,
  type LarkRuntimeConfig,
  type MasterFieldMap,
  type TableIdMap,
} from './larkConfig';

export type ConnMode = 'proxy';

/** Số phút trước leadtime mà timer chuyển sang cảnh báo màu vàng. */
export const LEADTIME_WARNING_MINUTES = 3;

export interface LarkSettings {
  useMock: boolean;
  /** Khóa các màn hình nhân viên từ xa; máy Điều phối không bị khóa. */
  sleepMode: boolean;
  /** Khóa route Guest trên toàn bộ thiết bị. */
  guestLock: boolean;
  /** Tên hiển thị thủ công cho từng bàn Guest. */
  guestUsers: Record<string, string>;
  mode: ConnMode;
  apiUrl: string;
  host: string;
  appToken: string;
  accessToken: string;
  /**
   * Webhook nhận form "Điều phối" (nút cạnh End Flow). Đường ghi MỘT CHIỀU ra
   * Lark Base — dashboard không bao giờ đọc lại dữ liệu form này.
   */
  dispatchWebhookUrl: string;
  /**
   * Webhook cho 2 nút Tiếp nhận / Hoàn tất ở màn hình nhân viên — workflow Lark
   * RIÊNG (secret `LARK_WEBHOOK_URL2` trên worker, route `/webhook2`), tạo
   * record trong SS_Master. Để TRỐNG = giữ nguyên cách cũ: 2 nút chỉ mở
   * hyperlink Lark, app không ghi gì.
   */
  staffActionWebhookUrl: string;
  pollSeconds: number;
  /** Leadtime mục tiêu theo từng khâu, tính bằng phút. */
  leadtimeMinutes: Record<ClusterKey, number>;
  tableIds: Record<TableKey, string>;
  fields: {
    checkin: CheckinFieldMap;
    master: MasterFieldMap;
    dispatch: DispatchFieldMap;
    dsMaster: DsMasterFieldMap;
  };
}

export function defaultSettings(): LarkSettings {
  return {
    useMock: ENV_DEFAULTS.useMock,
    sleepMode: false,
    guestLock: false,
    guestUsers: {},
    mode: 'proxy',
    apiUrl: ENV_DEFAULTS.apiUrl,
    host: ENV_DEFAULTS.host,
    appToken: ENV_DEFAULTS.appToken,
    accessToken: ENV_DEFAULTS.accessToken,
    dispatchWebhookUrl: ENV_DEFAULTS.dispatchWebhookUrl,
    staffActionWebhookUrl: ENV_DEFAULTS.staffActionWebhookUrl,
    pollSeconds: 5,
    leadtimeMinutes: { consult: 20, tradein: 20, backup: 20 },
    tableIds: { ...ENV_DEFAULTS.tableIds },
    fields: {
      checkin: { ...DEFAULT_CHECKIN_FIELDS },
      master: { ...DEFAULT_MASTER_FIELDS },
      dispatch: {
        deskField: { ...DEFAULT_DISPATCH_FIELDS.deskField },
        backupDeskField: DEFAULT_DISPATCH_FIELDS.backupDeskField,
        name: DEFAULT_DISPATCH_FIELDS.name,
      },
      dsMaster: { ...DEFAULT_DS_MASTER_FIELDS },
    },
  };
}

/** Merge a persisted (possibly partial/old) object onto fresh defaults. */
function hydrate(raw: unknown): LarkSettings {
  const base = defaultSettings();
  if (!raw || typeof raw !== 'object') return base;
  const p = raw as Partial<LarkSettings>;
  return {
    ...base,
    ...p,
    mode: 'proxy',
    pollSeconds: 5,
    leadtimeMinutes: {
      ...base.leadtimeMinutes,
      ...(p.leadtimeMinutes ?? {}),
    },
    tableIds: { ...base.tableIds, ...(p.tableIds ?? {}) },
    fields: {
      checkin: {
        ...base.fields.checkin,
        ...(p.fields?.checkin ?? {}),
        note: p.fields?.checkin?.note === 'Note UDTT' ? 'Check UD Thanh toán' : p.fields?.checkin?.note ?? base.fields.checkin.note,
      },
      master: { ...base.fields.master, ...(p.fields?.master ?? {}) },
      dispatch: {
        deskField: { ...base.fields.dispatch.deskField, ...(p.fields?.dispatch?.deskField ?? {}) },
        backupDeskField: p.fields?.dispatch?.backupDeskField ?? base.fields.dispatch.backupDeskField,
        name: p.fields?.dispatch?.name ?? base.fields.dispatch.name,
      },
      dsMaster: {
        ...base.fields.dsMaster,
        ...(p.fields?.dsMaster ?? {}),
        // Giá trị mặc định cố định theo schema Master_DS; cấu hình cũ không
        // được phép làm MSNV rơi về rỗng.
        staffId: p.fields?.dsMaster?.staffId?.trim() || 'MSNV',
        staffUsername: p.fields?.dsMaster?.staffUsername?.trim() || 'Username',
      },
    },
  };
}

function load(): LarkSettings {
  return hydrate(null);
}

let settings: LarkSettings = load();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export const larkSettingsStore = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },
  getSnapshot(): LarkSettings {
    return settings;
  },
  save(next: LarkSettings) {
    settings = next;
    emit();
  },
  reset() {
    settings = defaultSettings();
    emit();
  },
};

/** React hook: current settings (re-renders on save). */
export function useLarkSettings(): LarkSettings {
  return useSyncExternalStore(larkSettingsStore.subscribe, larkSettingsStore.getSnapshot, larkSettingsStore.getSnapshot);
}

// ── Derived views the rest of the app consumes ──────────────────────────────

function str(v: string): string | undefined {
  return v.trim() ? v.trim() : undefined;
}

export function toRuntimeConfig(s: LarkSettings = settings): LarkRuntimeConfig {
  const tableIds: TableIdMap = {
    checkin: str(s.tableIds.checkin),
    orders: str(s.tableIds.orders),
    master: str(s.tableIds.master),
    dispatch: str(s.tableIds.dispatch),
    dsMaster: str(s.tableIds.dsMaster),
  };
  return {
    // Mock là một route riêng (`/mock`), không còn là cờ cấu hình dùng chung.
    useMock: typeof window !== 'undefined' && (
    window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase() === 'mock'
    || window.location.hash.replace(/^#\/?/, '').split('?')[0].toLowerCase() === 'mock'
    ),
    apiUrl: str(s.apiUrl),
    host: str(s.host) ?? ENV_DEFAULTS.host,
    appToken: undefined,
    accessToken: undefined,
    tableIds,
    // 38 thiết bị dùng chung một snapshot ở Worker. Poll 10 giây giữ giao diện
    // đủ gần realtime nhưng tránh tạo burst đọc không cần thiết tại cao điểm.
    pollMs: 10_000,
  };
}

export function toFieldConfig(s: LarkSettings = settings): FieldConfig {
  return {
    checkin: s.fields.checkin,
    master: s.fields.master,
    dispatch: s.fields.dispatch,
    dsMaster: {
      ...s.fields.dsMaster,
      // KV/config cũ có thể thiếu field; không gọi `.trim()` trực tiếp trên
      // undefined để tránh làm trắng toàn bộ trang sau khi sync live.
      staffId: String(s.fields?.dsMaster?.staffId ?? '').trim() || 'MSNV',
      staffUsername: String(s.fields?.dsMaster?.staffUsername ?? '').trim() || 'Username',
    },
  };
}

/**
 * URL webhook cho form "Điều phối" (rỗng = chưa cấu hình → form báo lỗi rõ
 * thay vì im lặng nuốt dữ liệu người dùng vừa nhập).
 */
export function dispatchWebhookUrl(s: LarkSettings = settings): string {
  return String(s.dispatchWebhookUrl ?? '').trim();
}

/**
 * URL webhook cho 2 nút Tiếp nhận / Hoàn tất (rỗng = chưa cấu hình → màn hình
 * nhân viên giữ nguyên chế độ mở hyperlink, xem `StaffDeskScreen`).
 */
export function staffActionWebhookUrl(s: LarkSettings = settings): string {
  return String(s.staffActionWebhookUrl ?? '').trim();
}

/** True when a real HTTPS source is configured. */
export function hasLiveSource(s: LarkSettings = settings): boolean {
  const c = toRuntimeConfig(s);
  return Boolean(c.apiUrl);
}

/** Default field config (used for mock, which uses default column names). */
export const DEFAULT_FIELD_CONFIG: FieldConfig = {
  checkin: DEFAULT_CHECKIN_FIELDS,
  master: DEFAULT_MASTER_FIELDS,
  dispatch: DEFAULT_DISPATCH_FIELDS,
  dsMaster: DEFAULT_DS_MASTER_FIELDS,
};

export const CHECKIN_LABELS: Record<keyof CheckinFieldMap, string> = {
  stt: 'STT khách',
  name: 'Họ và tên',
  phone: 'Số điện thoại khách (SMS)',
  product: 'Tên sản phẩm (SP 1)',
  note: 'Ghi chú thanh toán',
  deviceAccepted: 'Check nghiệm thu (đã thu máy cũ)',
  oldDeviceCheck: 'Thu cũ check (lựa chọn — hiển thị nguyên văn)',
  backupCheck: 'Backup check (lựa chọn — hiển thị nguyên văn)',
  backupStatus: 'BC_Check backup (công thức trạng thái Dashboard)',
  dispatchHyperlink: 'Hyperlink Điều phối (khách Đã check-in)',
  receiveHyperlink: 'Hyperlink Tiếp nhận — theo KHÁCH (nút Tiếp nhận ở màn hình NV)',
  doneInFlow: 'Done in Flow (khâu vừa hoàn tất)',
  endFlow: 'End flow (đã xong toàn bộ quy trình)',
  time: 'Thời gian check-in (để sắp thứ tự)',
  endFlowTime: 'Thời gian End-flow',
};

export const MASTER_FIELD_LABELS: Record<keyof MasterFieldMap, string> = {
  deskCode: 'Mã bàn (TV_MãNV — khớp mã bàn trên sơ đồ)',
  status: 'Trạng thái (Tiếp nhận/Hoàn tất)',
  name: 'Họ và tên',
  staff: 'NV phụ trách (person field — KHÔNG dùng để suy bàn)',
  submitBy: 'MSNV người gửi (Submit by — dự phòng suy bàn qua DS Master)',
  stage: 'Loại khâu (Loại 2 — Tư vấn/Thu cũ/Backup)',
  hyperlink: 'Hyperlink Master',
  time: 'Thời gian (để sắp thứ tự nhiều khách/bàn)',
  sttInput: 'STT Input (khoá tra dữ liệu máy cũ đã ghi trước đó)',
  thuLaiMay: 'Thu lại máy (Thu máy ngay/Thu máy sau)',
  scanQr: 'Scan QR máy cũ',
  imei: 'Scan IMEI',
  hinhNghiemThu: 'Hình nghiệm thu máy cũ (cột đính kèm)',
};

export const DISPATCH_FIELD_LABEL = 'Họ và tên';
export const DISPATCH_DESK_FIELD_LABELS: Record<'tradein' | 'consult', string> = {
  tradein: 'Cột mã bàn — Kỹ thuật (vd "DS thu cũ")',
  consult: 'Cột mã bàn — Tư vấn (vd "DS Tư vấn")',
};
export const DISPATCH_BACKUP_FIELD_LABEL = 'Cột mã bàn — Backup (vd "DS Backup", chỉ hiển thị trong popover khách)';

export const DS_MASTER_FIELD_LABELS: Record<keyof DsMasterFieldMap, string> = {
  code: 'Mã bàn (khớp mã bàn trên sơ đồ)',
  nextStt: 'STT tiếp theo',
  waitingCount: 'SL khách chờ',
  staff: 'NV phụ trách (person field — dự phòng suy mã bàn khi Master thiếu TV_MãNV)',
  staffId: 'MSNV của nhân viên',
  staffUsername: 'Username / email Lark của nhân viên (Submit by)',
  loai: 'Loại (lọc dòng "Tư vấn"/"Thu cũ" — bỏ qua "Backup"/"Kho" khi suy mã bàn dự phòng)',
  receiveHyperlink: 'Hyperlink Tiếp nhận — theo BÀN (dự phòng khi khách không có link riêng)',
  completeHyperlink: 'Hyperlink Hoàn tất — theo BÀN (dự phòng khi khách không có Hyperlink Master)',
};

export const TABLE_LABELS: Record<TableKey, string> = {
  checkin: 'Check in (bảng "Master_Check in")',
  orders: 'Danh sách đơn hàng',
  master: 'Master_Staff (bảng logic Master / SS_Master)',
  dispatch: 'Master Điều phối (khách đã gán bàn, chờ NV nhận)',
  dsMaster: 'Master_DS (bảng logic DS Master)',
};

export type { ClusterKey };
