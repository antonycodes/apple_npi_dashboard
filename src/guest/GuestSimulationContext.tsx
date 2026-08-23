import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_FIELD_CONFIG } from '@/config/larkSettings';
import { DEFAULT_API_URL } from '@/config/larkConfig';
import type { FieldConfig } from '@/config/larkConfig';
import { cellToString } from '@/services/larkMapper';
import type { LarkCellValue, LarkRecord, LarkTables } from '@/services/larkTypes';
import type { ClusterKey } from '@/types/desk';

type SimulationStatus = 'waiting' | 'active' | 'completed';

interface Assignment {
  stt: string;
  stage: ClusterKey;
  deskId: string;
  status: SimulationStatus;
  at: number;
  checkBackup?: 'Có' | 'Không';
  thuLaiMay?: 'Thu máy ngay' | 'Thu máy sau';
  scanQr?: string;
  imei?: string;
  hinhNghiemThu?: Array<{ file_token: string; name?: string }>;
}

interface GuestDeviceData {
  scanQr?: string;
  imei?: string;
  hinhNghiemThu?: Array<{ file_token: string; name?: string }>;
}

interface GuestSimulationValue {
  tables: LarkTables;
  roomCode: string | null;
  roomStatus: 'local' | 'creating' | 'connected' | 'error';
  roomError: string | null;
  joinUrl: string | null;
  seed: (tables: LarkTables) => LarkTables;
  dispatch: (stt: string, stage: ClusterKey, deskId: string) => void;
  receive: (stt: string, stage: ClusterKey, deskId?: string) => void;
  complete: (stt: string, stage: ClusterKey, checkBackup?: 'Có' | 'Không', thuLaiMay?: 'Thu máy ngay' | 'Thu máy sau', device?: GuestDeviceData) => void;
  quickDevice: (stt: string, stage: ClusterKey, deskId?: string, device?: GuestDeviceData) => void;
  staffTables: (deskId: string) => LarkTables;
}

const EMPTY_TABLES: LarkTables = { checkin: [], orders: [], master: [], dispatch: [], dsMaster: [] };
const STAGE_LABEL: Record<ClusterKey, string> = { consult: 'Tư vấn', tradein: 'Thu cũ', backup: 'Backup' };

function record(id: string, fields: Record<string, unknown>): LarkRecord {
  return { record_id: `guest_${id}`, fields: fields as LarkRecord['fields'] };
}

function incrementGuestNghiemThu(value: unknown): string {
  const text = cellToString(value as LarkCellValue) ?? '';
  const match = text.match(/Đã nghiệm thu\s*\((\d+)\)\s*máy/i);
  if (match) return text.replace(match[1], String(Number(match[1]) + 1));
  return '✅ Đã nghiệm thu (1) máy';
}

function deskForGuestRole(deskId: string): string | null {
  const exact = deskId.match(/^Guest_(TV|TC|BK)(\d+)$/);
  if (exact) return `${exact[1]}${exact[2]}`;
  if (deskId === 'Guest_TV') return 'TV1';
  if (deskId === 'Guest_TC') return 'TC1';
  if (deskId === 'Guest_BK') return 'BK1';
  return null;
}

function buildTables(base: LarkTables, assignments: Assignment[], fields: FieldConfig): LarkTables {
  const dispatchRows: LarkRecord[] = [];
  const masterRows: LarkRecord[] = [];
  const waitingByDesk = new Map<string, string[]>();

  assignments.forEach((item, index) => {
    const name = base.checkin.find((row) => cellToString(row.fields[fields.checkin.stt]) === item.stt);
    const customerName = name ? cellToString(name.fields[fields.checkin.name]) ?? item.stt : item.stt;
    const stageField = item.stage === 'consult'
      ? fields.dispatch.deskField.consult
      : item.stage === 'tradein'
        ? fields.dispatch.deskField.tradein
        : fields.dispatch.backupDeskField;
    dispatchRows.push(record(`dispatch_${index}`, {
      [fields.dispatch.name]: customerName,
      [stageField]: item.deskId,
    }));

    if (item.status === 'waiting') {
      const queue = waitingByDesk.get(item.deskId) ?? [];
      queue.push(item.stt);
      waitingByDesk.set(item.deskId, queue);
      return;
    }

    masterRows.push(record(`master_${index}`, {
      [fields.master.deskCode]: item.deskId,
      [fields.master.status]: item.status === 'active' ? 'Tiếp nhận' : 'Hoàn tất',
      [fields.master.name]: customerName,
      [fields.master.staff]: 'Guest',
      [fields.master.submitBy]: 'Guest',
      [fields.master.stage]: STAGE_LABEL[item.stage],
      [fields.master.time]: item.at,
      [fields.master.sttInput]: item.stt,
      ...(item.thuLaiMay ? { [fields.master.thuLaiMay]: item.thuLaiMay } : {}),
      ...(item.scanQr ? { [fields.master.scanQr]: item.scanQr } : {}),
      ...(item.imei ? { [fields.master.imei]: item.imei } : {}),
      ...(item.hinhNghiemThu?.length ? { [fields.master.hinhNghiemThu]: item.hinhNghiemThu } : {}),
    }));
  });

  const dsRows = [...waitingByDesk.entries()].map(([deskId, stts], index) => record(`ds_${index}`, {
    [fields.dsMaster.code]: deskId,
    [fields.dsMaster.nextStt]: stts[0],
    [fields.dsMaster.waitingCount]: stts.length,
    [fields.dsMaster.staff]: 'Guest',
    [fields.dsMaster.staffId]: 'Guest',
    [fields.dsMaster.loai]: STAGE_LABEL[
      deskId.startsWith('TC') ? 'tradein' : deskId.startsWith('BK') ? 'backup' : 'consult'
    ],
  }));

  return { ...base, master: masterRows, dispatch: dispatchRows, dsMaster: dsRows };
}

function remapForStaffRole(tables: LarkTables, deskId: string, fields: FieldConfig): LarkTables {
  const targetDesk = deskForGuestRole(deskId);
  if (!targetDesk) return tables;
  const prefix = targetDesk.slice(0, 2);
  const remap = (row: LarkRecord) => ({
    ...row,
    fields: Object.fromEntries(Object.entries(row.fields).map(([key, value]) => [
      key,
      typeof value === 'string' && value.startsWith(prefix) ? targetDesk : value,
    ])),
  });
  const exactDesk = /^Guest_(TV|TC|BK)\d+$/.test(deskId);
  const matchesDesk = (row: LarkRecord) => Object.values(row.fields).some(
    (value) => typeof value === 'string' && (exactDesk ? value === targetDesk : value.startsWith(prefix)),
  );
  // Máy đã chọn "Thu máy sau" không thuộc riêng bàn đã ghi nhận trước đó:
  // cả TC và BK đều phải tra được trong nút "Thu máy cũ".
  const isPendingDevice = (row: LarkRecord) =>
    prefix !== 'TV' && cellToString(row.fields[fields.master.thuLaiMay]) === 'Thu máy sau';
  return {
    ...tables,
    master: tables.master.filter((row) => matchesDesk(row) || isPendingDevice(row)).map(remap),
    dispatch: tables.dispatch.map(remap),
    dsMaster: tables.dsMaster.filter(matchesDesk).map(remap),
  };
}

const GuestSimulationContext = createContext<GuestSimulationValue | null>(null);

interface RoomState {
  baseTables: LarkTables;
  assignments: Assignment[];
  roomCode?: string;
}

async function roomRequest(apiUrl: string, path: string, init?: RequestInit) {
  const response = await fetch(`${apiUrl.replace(/\/+$/, '')}/guest-room${path}`, init);
  const body = await response.json() as { code: number; msg?: string; data?: RoomState };
  if (!response.ok || body.code !== 0 || !body.data) throw new Error(body.msg || 'Không thể kết nối phòng mô phỏng.');
  return body.data;
}

export function GuestSimulationProvider({ children, fields = DEFAULT_FIELD_CONFIG, roomCode: initialRoomCode = null, role = 'Guest' }: { children: ReactNode; fields?: FieldConfig; roomCode?: string | null; role?: string }) {
  const [base, setBase] = useState<LarkTables>(EMPTY_TABLES);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [roomStatus, setRoomStatus] = useState<GuestSimulationValue['roomStatus']>(initialRoomCode ? 'creating' : 'local');
  const [roomError, setRoomError] = useState<string | null>(null);
  const creating = useRef(false);
  const roomCodeRef = useRef(roomCode);
  // Không để nhiều GET state chạy chồng lên nhau. Một response cũ có thể về
  // sau response mới rồi ghi đè state active thành waiting, nhất là khi DP và
  // màn hình TC đang ở hai thiết bị/mạng khác nhau.
  const roomRequestInFlight = useRef(false);
  roomCodeRef.current = roomCode;

  const applyRoomState = (next: RoomState) => {
    const nextAssignments = next.assignments ?? [];
    const nextBase = next.baseTables ?? EMPTY_TABLES;
    // Backup check là kết quả của thao tác Hoàn tất trong phòng mô phỏng.
    // Đồng bộ từ assignment luôn, để dashboard vẫn đổi ngay cả khi worker
    // đang chạy bản cũ chưa kịp ghi ngược vào dòng Check-in.
    const backupByStt = new Map(
      nextAssignments
        .filter((item) => item.checkBackup === 'Có' || item.checkBackup === 'Không')
        .map((item) => [item.stt, item.checkBackup as 'Có' | 'Không']),
    );
    const syncedBase = backupByStt.size
      ? {
          ...nextBase,
          checkin: nextBase.checkin.map((row) => {
            const stt = cellToString(row.fields[fields.checkin.stt]);
            const checkBackup = stt ? backupByStt.get(stt) : undefined;
            return checkBackup
              ? {
                  ...row,
                  fields: {
                    ...row.fields,
                    [fields.checkin.backupCheck]: checkBackup === 'Có' ? 'Có Backup' : 'Không Backup',
                    [fields.checkin.backupStatus]: checkBackup === 'Có' ? 'Có Backup' : 'Không Backup',
                  },
                }
              : row;
          }),
        }
      : nextBase;
    setBase(syncedBase);
    setAssignments(nextAssignments);
    setRoomStatus('connected');
    setRoomError(null);
  };

  useEffect(() => {
    if (!initialRoomCode) return;
    let cancelled = false;
    void roomRequest(DEFAULT_API_URL, `/${encodeURIComponent(initialRoomCode)}/state`)
      .then(async (next) => {
        if (cancelled) return;
        applyRoomState(next);
        await roomRequest(DEFAULT_API_URL, `/${encodeURIComponent(initialRoomCode)}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role }),
        });
      })
      .catch((error) => {
        if (!cancelled) {
          setRoomStatus('error');
          setRoomError(error instanceof Error ? error.message : String(error));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [initialRoomCode, role]);

  useEffect(() => {
    if (initialRoomCode || !base.checkin.length || roomCode || creating.current) return;
    creating.current = true;
    setRoomStatus('creating');
    void roomRequest(DEFAULT_API_URL, '/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tables: base }),
    })
      .then((next) => {
        // The create endpoint returns the room code alongside its state.
        if (next.roomCode) setRoomCode(next.roomCode);
        setRoomStatus('connected');
      })
      .catch((error) => {
        setRoomStatus('error');
        setRoomError(error instanceof Error ? error.message : String(error));
      });
  }, [base, initialRoomCode, roomCode]);

  useEffect(() => {
    if (!roomCode) return;
    const poll = async () => {
      if (roomRequestInFlight.current) return;
      roomRequestInFlight.current = true;
      try {
        const next = await roomRequest(DEFAULT_API_URL, `/${encodeURIComponent(roomCode)}/state`);
        applyRoomState(next);
      } catch {
        // Một nhịp mạng lỗi không được làm mất state đang hiển thị.
      } finally {
        roomRequestInFlight.current = false;
      }
    };
    const timer = window.setInterval(() => {
      void poll();
    }, 1500);
    return () => window.clearInterval(timer);
  }, [roomCode]);

  const postAction = (action: string, stt: string, stage: ClusterKey, deskId: string, extra: Record<string, string> = {}) => {
    const code = roomCodeRef.current;
    if (!code) return;
    void (async () => {
      // Nếu đúng lúc bấm nút đang có một GET state, chờ GET đó xong thay vì
      // bỏ action — bỏ action sẽ khiến TC thấy đã nhận nhưng DP không bao giờ
      // nhận được thay đổi.
      while (roomRequestInFlight.current) {
        await new Promise((resolve) => window.setTimeout(resolve, 50));
      }
      roomRequestInFlight.current = true;
      try {
        const next = await roomRequest(DEFAULT_API_URL, `/${encodeURIComponent(code)}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, stt, stage, deskId, ...extra }),
        });
        applyRoomState(next);
      } catch {
        // Guest vẫn giữ state lạc quan; nhịp poll kế tiếp sẽ đồng bộ lại nếu
        // action thực sự chưa được ghi vào phòng.
      } finally {
        roomRequestInFlight.current = false;
      }
    })();
  };

  const markEndFlowIfReady = (nextAssignments: Assignment[], stt: string, latestBackup?: 'Có' | 'Không') => {
    const customer = base.checkin.find((row) => cellToString(row.fields[fields.checkin.stt]) === stt);
    if (!customer) return;
    const oldDevice = cellToString(customer.fields[fields.checkin.oldDeviceCheck])?.toLowerCase() ?? '';
    const backup = (latestBackup ?? cellToString(customer.fields[fields.checkin.backupCheck]))?.toLowerCase() ?? '';
    const needsTradein = oldDevice.includes('có') || oldDevice.includes('thu cũ') || oldDevice.includes('thu cu');
    const needsBackup = backup.includes('có') || backup.includes('backup');
    const completed = new Set(nextAssignments.filter((item) => item.stt === stt && item.status === 'completed').map((item) => item.stage));
    const ready = completed.has('consult') && (!needsTradein || completed.has('tradein')) && (!needsBackup || completed.has('backup'));
    if (!ready) return;
    setBase((current) => ({
      ...current,
      checkin: current.checkin.map((row) =>
        cellToString(row.fields[fields.checkin.stt]) === stt
          ? { ...row, fields: { ...row.fields, [fields.checkin.endFlow]: 'End flow' } }
          : row,
      ),
    }));
  };

  const value = useMemo<GuestSimulationValue>(() => {
    const tables = buildTables(base, assignments, fields);
    const joinUrl = roomCode && typeof window !== 'undefined'
      ? `${window.location.origin}/guest?room=${encodeURIComponent(roomCode)}`
      : null;
    return {
      tables,
      roomCode,
      roomStatus,
      roomError,
      joinUrl,
      seed(next) {
        setBase(next);
        return buildTables(next, assignments, fields);
      },
      dispatch(stt, stage, deskId) {
        setAssignments((current) => [
          ...current.filter((item) => !(item.stt === stt && item.stage === stage && item.status === 'waiting')),
          { stt, stage, deskId, status: 'waiting', at: Date.now() },
        ]);
        postAction('dispatch', stt, stage, deskId);
      },
      receive(stt, stage, guestDeskId) {
        const target = assignments.find((item) => item.stt === stt && item.stage === stage && item.status === 'waiting');
        const deskId = target?.deskId ?? (guestDeskId ? deskForGuestRole(guestDeskId) : null);
        if (!deskId) return;
        const at = Date.now();
        const nextAssignments = assignments.some((item) => item.stt === stt && item.stage === stage)
          ? assignments.map((item) =>
              item.stt === stt && item.stage === stage && item.status === 'waiting'
                ? { ...item, status: 'active' as const, at }
                : item,
            )
          : [...assignments, { stt, stage, deskId, status: 'active' as const, at }];
        setAssignments(nextAssignments);
        postAction('receive', stt, stage, deskId);
      },
      complete(stt, stage, checkBackup, thuLaiMay, device) {
        const target = assignments.find((item) => item.stt === stt && item.stage === stage && item.status === 'active');
        const nextAssignments = assignments.map((item) =>
          item.stt === stt && item.stage === stage && item.status === 'active'
            ? {
                ...item,
                status: 'completed' as const,
                at: Date.now(),
                ...(checkBackup ? { checkBackup } : {}),
                ...(thuLaiMay ? { thuLaiMay } : {}),
                ...(device?.scanQr ? { scanQr: device.scanQr } : {}),
                ...(device?.imei ? { imei: device.imei } : {}),
                ...(device?.hinhNghiemThu?.length ? { hinhNghiemThu: device.hinhNghiemThu } : {}),
              }
            : item,
        );
        setAssignments(nextAssignments);
        if (checkBackup || thuLaiMay === 'Thu máy ngay') {
          setBase((current) => ({
            ...current,
            checkin: current.checkin.map((row) =>
              cellToString(row.fields[fields.checkin.stt]) === stt
                ? {
                    ...row,
                    fields: {
                      ...row.fields,
                      ...(checkBackup
                        ? {
                            [fields.checkin.backupCheck]: checkBackup === 'Có' ? 'Có Backup' : 'Không Backup',
                            [fields.checkin.backupStatus]: checkBackup === 'Có' ? 'Có Backup' : 'Không Backup',
                          }
                        : {}),
                      ...(thuLaiMay === 'Thu máy ngay'
                        ? { [fields.checkin.deviceAccepted]: incrementGuestNghiemThu(row.fields[fields.checkin.deviceAccepted]) }
                        : {}),
                    },
                  }
                : row,
            ),
          }));
        }
        markEndFlowIfReady(nextAssignments, stt, checkBackup);
        if (target) postAction('complete', stt, stage, target.deskId, {
          ...(checkBackup ? { checkBackup } : {}),
          ...(thuLaiMay ? { thuLaiMay } : {}),
          ...(device?.scanQr ? { scanQr: device.scanQr } : {}),
          ...(device?.imei ? { imei: device.imei } : {}),
          ...(device?.hinhNghiemThu?.length ? { hinhNghiemThu: JSON.stringify(device.hinhNghiemThu) } : {}),
        });
      },
      quickDevice(stt, stage, guestDeskId, device) {
        const target = assignments.find((item) => item.stt === stt && item.stage === stage);
        const resolvedDesk = target?.deskId ?? (guestDeskId ? deskForGuestRole(guestDeskId) : null);
        if (!resolvedDesk) return;
        const deviceFields = {
          thuLaiMay: 'Thu máy ngay' as const,
          ...(device?.scanQr ? { scanQr: device.scanQr } : {}),
          ...(device?.imei ? { imei: device.imei } : {}),
          ...(device?.hinhNghiemThu?.length ? { hinhNghiemThu: device.hinhNghiemThu } : {}),
        };
        setAssignments((current) => current.some((item) => item.stt === stt && item.stage === stage)
          ? current.map((item) =>
              item.stt === stt && item.stage === stage ? { ...item, ...deviceFields } : item,
            )
          : [...current, { stt, stage, deskId: resolvedDesk, status: 'completed', at: Date.now(), ...deviceFields }],
        );
        setBase((current) => ({
          ...current,
          checkin: current.checkin.map((row) =>
            cellToString(row.fields[fields.checkin.stt]) === stt
              ? { ...row, fields: { ...row.fields, [fields.checkin.deviceAccepted]: incrementGuestNghiemThu(row.fields[fields.checkin.deviceAccepted]) } }
              : row,
          ),
        }));
        postAction('device', stt, stage, resolvedDesk, {
            ...(device?.scanQr ? { scanQr: device.scanQr } : {}),
            ...(device?.imei ? { imei: device.imei } : {}),
            ...(device?.hinhNghiemThu?.length ? { hinhNghiemThu: JSON.stringify(device.hinhNghiemThu) } : {}),
        });
      },
      staffTables(deskId) {
        return remapForStaffRole(tables, deskId, fields);
      },
    };
  }, [assignments, base, fields, roomCode, roomStatus, roomError]);

  return <GuestSimulationContext.Provider value={value}>{children}</GuestSimulationContext.Provider>;
}

export function useGuestSimulation(): GuestSimulationValue | null {
  return useContext(GuestSimulationContext);
}
