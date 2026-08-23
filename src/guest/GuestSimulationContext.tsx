import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_FIELD_CONFIG } from '@/config/larkSettings';
import { DEFAULT_API_URL } from '@/config/larkConfig';
import type { FieldConfig } from '@/config/larkConfig';
import { cellToString } from '@/services/larkMapper';
import type { LarkRecord, LarkTables } from '@/services/larkTypes';
import type { ClusterKey } from '@/types/desk';

type SimulationStatus = 'waiting' | 'active' | 'completed';

interface Assignment {
  stt: string;
  stage: ClusterKey;
  deskId: string;
  status: SimulationStatus;
  at: number;
}

interface GuestSimulationValue {
  tables: LarkTables;
  roomCode: string | null;
  roomStatus: 'local' | 'creating' | 'connected' | 'error';
  roomError: string | null;
  joinUrl: string | null;
  seed: (tables: LarkTables) => LarkTables;
  dispatch: (stt: string, stage: ClusterKey, deskId: string) => void;
  receive: (stt: string, stage: ClusterKey) => void;
  complete: (stt: string, stage: ClusterKey) => void;
  staffTables: (deskId: string) => LarkTables;
}

const EMPTY_TABLES: LarkTables = { checkin: [], orders: [], master: [], dispatch: [], dsMaster: [] };
const STAGE_LABEL: Record<ClusterKey, string> = { consult: 'Tư vấn', tradein: 'Thu cũ', backup: 'Backup' };

function record(id: string, fields: Record<string, unknown>): LarkRecord {
  return { record_id: `guest_${id}`, fields: fields as LarkRecord['fields'] };
}

function deskForGuestRole(deskId: string): string | null {
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

function remapForStaffRole(tables: LarkTables, deskId: string): LarkTables {
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
  return {
    ...tables,
    master: tables.master.filter((row) => {
      const desk = Object.values(row.fields).find((value) => typeof value === 'string' && value.startsWith(prefix));
      return Boolean(desk);
    }).map(remap),
    dispatch: tables.dispatch.map(remap),
    dsMaster: tables.dsMaster.filter((row) => {
      const desk = Object.values(row.fields).find((value) => typeof value === 'string' && value.startsWith(prefix));
      return Boolean(desk);
    }).map(remap),
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
  roomCodeRef.current = roomCode;

  const applyRoomState = (next: RoomState) => {
    setBase(next.baseTables ?? EMPTY_TABLES);
    setAssignments(next.assignments ?? []);
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
    const timer = window.setInterval(() => {
      void roomRequest(DEFAULT_API_URL, `/${encodeURIComponent(roomCode)}/state`)
        .then(applyRoomState)
        .catch(() => undefined);
    }, 1500);
    return () => window.clearInterval(timer);
  }, [roomCode]);

  const postAction = (action: string, stt: string, stage: ClusterKey, deskId: string) => {
    const code = roomCodeRef.current;
    if (!code) return;
    void roomRequest(DEFAULT_API_URL, `/${encodeURIComponent(code)}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, stt, stage, deskId }),
    }).then(applyRoomState).catch(() => undefined);
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
      receive(stt, stage) {
        const target = assignments.find((item) => item.stt === stt && item.stage === stage && item.status === 'waiting');
        setAssignments((current) => current.map((item) =>
          item.stt === stt && item.stage === stage && item.status === 'waiting'
            ? { ...item, status: 'active', at: Date.now() }
            : item,
        ));
        if (target) postAction('receive', stt, stage, target.deskId);
      },
      complete(stt, stage) {
        const target = assignments.find((item) => item.stt === stt && item.stage === stage && item.status === 'active');
        setAssignments((current) => current.map((item) =>
          item.stt === stt && item.stage === stage && item.status === 'active'
            ? { ...item, status: 'completed', at: Date.now() }
            : item,
        ));
        if (target) postAction('complete', stt, stage, target.deskId);
      },
      staffTables(deskId) {
        return remapForStaffRole(tables, deskId);
      },
    };
  }, [assignments, base, fields, roomCode, roomStatus, roomError]);

  return <GuestSimulationContext.Provider value={value}>{children}</GuestSimulationContext.Provider>;
}

export function useGuestSimulation(): GuestSimulationValue | null {
  return useContext(GuestSimulationContext);
}
