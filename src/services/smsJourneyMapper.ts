import {
  PRIMARY_DESK_LOAI,
  STATUS_COMPLETED,
  STATUS_RECEIVED,
  type FieldConfig,
} from '@/config/larkConfig';
import { toFieldConfig } from '@/config/larkSettings';
import type { ClusterKey } from '@/types/desk';
import type { SmsJourney, SmsStageJourney } from '@/types/sms';
import type { LarkRecord, LarkTables } from './larkTypes';
import {
  cellToBool,
  cellToNumber,
  cellToProducts,
  cellToString,
  fieldValue,
  normalizeDeskCode,
} from './larkMapper';

const STAGES: Array<{ key: ClusterKey; label: string }> = [
  { key: 'consult', label: 'Tư vấn' },
  { key: 'tradein', label: 'Thu cũ' },
  { key: 'backup', label: 'Backup' },
];

interface StageEvent {
  status: string;
  time: number;
  deskCode: string | null;
  staffName: string | null;
}

function canonicalStt(value: string | null): string | null {
  if (!value) return null;
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? String(number) : value.trim() || null;
}

function normalizeStage(value: string | null): ClusterKey | null {
  const stage = value?.trim().toLowerCase() ?? '';
  if (stage.includes('backup') || stage.includes('back up')) return 'backup';
  if (stage.includes('thu cũ') || stage.includes('thu cu')) return 'tradein';
  if (stage.includes('tư vấn') || stage.includes('tu van')) return 'consult';
  return null;
}

function inferStageFromDesk(value: string | null): ClusterKey | null {
  const code = value?.trim().toUpperCase() ?? '';
  if (code.startsWith('BK')) return 'backup';
  if (code.startsWith('TC') || code.startsWith('KT')) return 'tradein';
  if (code.startsWith('TV')) return 'consult';
  return null;
}

function isExplicitNo(value: string | null): boolean {
  const normalized = value?.toLocaleLowerCase('vi') ?? '';
  return normalized.includes('không') || normalized.includes('❌');
}

function displayDeskCode(raw: string | null, stage: ClusterKey): string | null {
  const clean = raw?.trim().toUpperCase() ?? '';
  if (stage === 'backup' && clean.startsWith('BK')) return clean;
  return normalizeDeskCode(raw);
}

function emptyStage(key: ClusterKey, label: string, notApplicable: boolean): SmsStageJourney {
  return {
    key,
    label,
    status: notApplicable ? 'not-applicable' : 'pending',
    deskCode: null,
    staffName: null,
    startedAt: null,
    completedAt: null,
    elapsedMs: null,
  };
}

function summarizeStage(
  key: ClusterKey,
  label: string,
  events: StageEvent[],
  notApplicable: boolean,
): SmsStageJourney {
  if (!events.length) return emptyStage(key, label, notApplicable);
  const ordered = [...events].sort((a, b) => a.time - b.time);
  const latest = ordered[ordered.length - 1];
  const completed = latest.status === STATUS_COMPLETED;
  const started = [...ordered]
    .reverse()
    .find((event) => event.status === STATUS_RECEIVED && (!completed || event.time <= latest.time));
  const startedAt = started?.time || null;
  const completedAt = completed ? latest.time || null : null;
  return {
    key,
    label,
    status: completed ? 'completed' : latest.status === STATUS_RECEIVED ? 'active' : 'pending',
    deskCode: latest.deskCode ?? started?.deskCode ?? null,
    staffName: latest.staffName ?? started?.staffName ?? null,
    startedAt,
    completedAt,
    elapsedMs: startedAt && completedAt ? Math.max(0, completedAt - startedAt) : null,
  };
}

function dispatchDetailsByName(rows: LarkRecord[], fields: FieldConfig) {
  const result = new Map<string, Partial<Record<ClusterKey, string>>>();
  for (const row of rows) {
    const name = cellToString(fieldValue(row.fields, fields.dispatch.name));
    if (!name) continue;
    const previous = result.get(name) ?? {};
    const consult = cellToString(fieldValue(row.fields, fields.dispatch.deskField.consult));
    const tradein = cellToString(fieldValue(row.fields, fields.dispatch.deskField.tradein));
    const backup = cellToString(fieldValue(row.fields, fields.dispatch.backupDeskField));
    result.set(name, {
      ...previous,
      ...(consult ? { consult } : {}),
      ...(tradein ? { tradein } : {}),
      ...(backup ? { backup } : {}),
    });
  }
  return result;
}

export function mapSmsJourneys(
  tables: LarkTables,
  fields: FieldConfig = toFieldConfig(),
): Map<string, SmsJourney> {
  const byStt = new Map<string, SmsJourney>();
  const sttByName = new Map<string, string>();
  const explicitNo = new Map<string, Partial<Record<ClusterKey, boolean>>>();

  for (const row of tables.checkin) {
    const stt = canonicalStt(cellToString(fieldValue(row.fields, fields.checkin.stt)));
    const name = cellToString(fieldValue(row.fields, fields.checkin.name));
    if (!stt || !name) continue;
    sttByName.set(name, stt);
    explicitNo.set(stt, {
      tradein: isExplicitNo(cellToString(fieldValue(row.fields, fields.checkin.oldDeviceCheck))),
      backup: isExplicitNo(cellToString(fieldValue(row.fields, fields.checkin.backupCheck))),
    });
    byStt.set(stt, {
      stt,
      name,
      phone: cellToString(fieldValue(row.fields, fields.checkin.phone)) ?? '',
      products: cellToProducts(row.fields, fields.checkin.product),
      checkinAt: cellToNumber(fieldValue(row.fields, fields.checkin.time)) || null,
      endFlow: (cellToString(fieldValue(row.fields, fields.checkin.endFlow)) ?? '').trim().toLowerCase() === 'end flow',
      endFlowTime: cellToString(fieldValue(row.fields, fields.checkin.endFlowTime)),
      smsRequested: false,
      stages: Object.fromEntries(
        STAGES.map(({ key, label }) => [key, emptyStage(key, label, false)]),
      ) as Record<ClusterKey, SmsStageJourney>,
    });
  }

  const staffNameByDesk = new Map<string, string>();
  const deskByStaffId = new Map<string, string>();
  for (const row of tables.dsMaster) {
    const desk = normalizeDeskCode(cellToString(fieldValue(row.fields, fields.dsMaster.code)));
    const staff = cellToString(fieldValue(row.fields, fields.dsMaster.staff));
    const staffId = cellToString(fieldValue(row.fields, fields.dsMaster.staffId))?.trim().toUpperCase();
    const loai = cellToString(fieldValue(row.fields, fields.dsMaster.loai));
    if (desk && staff) staffNameByDesk.set(desk, staff);
    if (desk && staffId && loai && PRIMARY_DESK_LOAI.has(loai)) deskByStaffId.set(staffId, desk);
  }

  const dispatchByName = dispatchDetailsByName(tables.dispatch, fields);
  const eventsByStt = new Map<string, Record<ClusterKey, StageEvent[]>>();
  for (const row of tables.master) {
    const name = cellToString(fieldValue(row.fields, fields.master.name));
    const stt = canonicalStt(cellToString(fieldValue(row.fields, fields.master.sttInput)))
      ?? (name ? sttByName.get(name) ?? null : null);
    const status = cellToString(fieldValue(row.fields, fields.master.status));
    if (!stt || !name || (status !== STATUS_RECEIVED && status !== STATUS_COMPLETED)) continue;
    const rawDesk = cellToString(fieldValue(row.fields, fields.master.deskCode));
    const stage = normalizeStage(cellToString(fieldValue(row.fields, fields.master.stage))) ?? inferStageFromDesk(rawDesk);
    if (!stage) continue;
    const staffId = cellToString(fieldValue(row.fields, fields.master.submitBy))?.trim().toUpperCase();
    const fallbackDesk = staffId ? deskByStaffId.get(staffId) ?? null : null;
    const assignedDesk = dispatchByName.get(name)?.[stage] ?? null;
    const deskCode = displayDeskCode(rawDesk, stage) ?? displayDeskCode(fallbackDesk, stage) ?? displayDeskCode(assignedDesk, stage);
    const physicalDesk = normalizeDeskCode(deskCode);
    const groups = eventsByStt.get(stt) ?? { consult: [], tradein: [], backup: [] };
    groups[stage].push({
      status,
      time: cellToNumber(fieldValue(row.fields, fields.master.time)),
      deskCode,
      staffName: physicalDesk ? staffNameByDesk.get(physicalDesk) ?? null : null,
    });
    eventsByStt.set(stt, groups);
  }

  for (const [stt, journey] of byStt) {
    const groups = eventsByStt.get(stt) ?? { consult: [], tradein: [], backup: [] };
    const no = explicitNo.get(stt) ?? {};
    const assigned = dispatchByName.get(journey.name) ?? {};
    journey.stages = Object.fromEntries(STAGES.map(({ key, label }) => {
      const stage = summarizeStage(key, label, groups[key], Boolean(no[key]));
      const assignedDesk = assigned[key] ?? null;
      if (stage.status === 'pending' && assignedDesk) {
        stage.deskCode = displayDeskCode(assignedDesk, key);
        const physicalDesk = normalizeDeskCode(stage.deskCode);
        stage.staffName = physicalDesk ? staffNameByDesk.get(physicalDesk) ?? null : null;
      }
      return [key, stage];
    })) as Record<ClusterKey, SmsStageJourney>;
  }

  for (const row of tables.dispatch) {
    if (!cellToBool(fieldValue(row.fields, 'Đẩy SMS'))) continue;
    const stt = canonicalStt(
      cellToString(fieldValue(row.fields, 'STT input'))
        ?? cellToString(fieldValue(row.fields, 'STT Input')),
    );
    const journey = stt ? byStt.get(stt) : null;
    if (journey) journey.smsRequested = true;
  }

  return byStt;
}
