import http from 'k6/http';
import { check, fail, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const baseUrl = (__ENV.BASE_URL || 'https://vhws-lark-proxy.eventnpi2026.workers.dev').replace(/\/+$/, '');
const allowLiveWrites = (__ENV.ALLOW_LIVE_WRITES || '').toLowerCase() === 'true';
const dryRun = (__ENV.DRY_RUN || '').toLowerCase() === 'true';
const strictEmpty = (__ENV.STRICT_EMPTY || 'true').toLowerCase() === 'true';
const durationSec = Number(__ENV.DURATION_SEC || 600);
const pollSec = Number(__ENV.POLL_SEC || 5);
const runId = __ENV.RUN_ID || `NPI-CPS-${Date.now()}`;

const imagePaths = [1, 2, 3, 4, 5, 6]
  .map((index) => __ENV[`IMAGE_PATH_${index}`])
  .filter(Boolean);
if (!dryRun && imagePaths.length !== 6) fail('Cần truyền đủ IMAGE_PATH_1 đến IMAGE_PATH_6');
const images = imagePaths.map((path) => ({
  path,
  bytes: open(path, 'b'),
  mime: path.endsWith('.png') ? 'image/png' : path.endsWith('.webp') ? 'image/webp' : 'image/jpeg',
}));

const CASES = [
  { id: 'C01', label: 'Tư vấn, không Thu cũ, không Backup', stages: ['Tư vấn'] },
  { id: 'C02', label: 'Tư vấn, Thu cũ ngay', stages: ['Tư vấn', 'Thu cũ'], thuLaiMay: 'Thu máy ngay' },
  { id: 'C03', label: 'Tư vấn, Backup', stages: ['Tư vấn', 'Backup'] },
  { id: 'C04', label: 'Tư vấn, Thu cũ, Backup', stages: ['Tư vấn', 'Thu cũ', 'Backup'], thuLaiMay: 'Thu máy ngay' },
  { id: 'C05', label: 'Thu máy sau rồi quay lại Thu cũ', stages: ['Tư vấn', 'Thu cũ', 'Thu cũ'], thuLaiMay: 'Thu máy sau', retryTradeIn: true },
  { id: 'C06', label: 'Thu máy sau, Backup thu máy', stages: ['Tư vấn', 'Thu cũ', 'Backup'], thuLaiMay: 'Thu máy sau', backupCollects: true },
  { id: 'C07', label: 'Thu máy ngay rồi Backup', stages: ['Tư vấn', 'Thu cũ', 'Backup'], thuLaiMay: 'Thu máy ngay' },
  { id: 'C08', label: 'Backup chốt và thu máy', stages: ['Tư vấn', 'Thu cũ', 'Backup'], thuLaiMay: 'Thu máy sau', backupCollects: true },
  { id: 'C09', label: 'Recheck không Backup', stages: ['Tư vấn'], recheckBackup: 'Không' },
  { id: 'C10', label: 'Recheck có Backup', stages: ['Tư vấn', 'Backup'], recheckBackup: 'Có' },
];

const writes = new Counter('production_write_requests');
const writeErrors = new Rate('production_write_errors');
const writeLatency = new Trend('production_write_latency', true);
const reads = new Counter('production_snapshot_reads');
const readErrors = new Rate('production_read_errors');
const readLatency = new Trend('production_read_latency', true);
const staleSnapshots = new Counter('production_snapshot_stale');
const snapshotContentErrors = new Rate('production_snapshot_content_errors');
const uploads = new Counter('production_upload_requests');
const uploadErrors = new Rate('production_upload_errors');
const uploadLatency = new Trend('production_upload_latency', true);

export const options = {
  scenarios: {
    event_38_positions: {
      executor: 'per-vu-iterations',
      vus: 38,
      iterations: 1,
      maxDuration: `${Math.ceil(durationSec / 60) + 2}m`,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    production_write_errors: ['rate<0.01'],
    production_read_errors: ['rate<0.01'],
    production_snapshot_content_errors: ['rate<0.001'],
    production_upload_errors: ['rate<0.01'],
    production_write_latency: ['p(95)<5000'],
    production_read_latency: ['p(95)<5000'],
    production_upload_latency: ['p(95)<15000'],
  },
  tags: { run_id: runId, scenario: 'event-production-38-live' },
};

function json(response) {
  try { return response.json(); } catch { return null; }
}

function items(body) {
  const data = body?.data;
  return data?.items || data?.records || (Array.isArray(data) ? data : []);
}

function text(value) {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map((part) => part?.text || part?.name || String(part)).join('');
  return String(value);
}

function roleForDesk(desk) {
  if (/^DP\d+$/i.test(desk)) return 'Điều phối';
  if (/^TV\d+$/i.test(desk)) return 'Tư vấn';
  if (/^TC\d+$/i.test(desk)) return 'Thu cũ';
  if (/^BK\d+$/i.test(desk)) return 'Backup';
  if (/^KHO\d+$/i.test(desk)) return 'Kho';
  return '';
}

function numericDesk(desk) {
  return Number(String(desk).replace(/\D/g, '')) || 0;
}

function sortActors(a, b) {
  const order = { 'Điều phối': 0, 'Tư vấn': 1, 'Thu cũ': 2, Backup: 3, Kho: 4 };
  return order[a.role] - order[b.role] || numericDesk(a.desk) - numericDesk(b.desk);
}

function buildImei(sequence) {
  const base = `35693803${String(sequence).padStart(6, '0')}`;
  let sum = 0;
  for (let index = 0; index < base.length; index += 1) {
    let digit = Number(base[index]);
    if (index % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return `${base}${(10 - (sum % 10)) % 10}`;
}

function completionExtra(customerIndex, journey, kind, stageIndex) {
  const extra = {};
  if (kind !== 'Backup') extra.checkBackup = journey.recheckBackup || (journey.stages.includes('Backup') ? 'Có' : 'Không');
  if (kind === 'Thu cũ' || kind === 'Backup') {
    extra.thuLaiMay = kind === 'Backup' || journey.backupCollects
      ? 'Thu máy ngay'
      : journey.retryTradeIn && stageIndex === 2
        ? 'Thu máy ngay'
        : journey.thuLaiMay || 'Thu máy ngay';
    extra.scanQr = `MTC${(customerIndex % 100) + 1}`;
    extra.imei = buildImei(customerIndex + 1);
  }
  return extra;
}

function buildPlan(customers, actors) {
  const byRole = {};
  for (const actor of actors) (byRole[actor.role] ||= []).push(actor);
  const counters = { 'Điều phối': 0, 'Tư vấn': 0, 'Thu cũ': 0, Backup: 0 };
  const jobs = [];
  customers.forEach((customer, customerIndex) => {
    const journey = CASES[customerIndex % CASES.length];
    let stageStart = 20 + customerIndex * 7;
    journey.stages.forEach((kind, stageIndex) => {
      const deskActors = byRole[kind];
      const deskActor = deskActors[counters[kind] % deskActors.length];
      counters[kind] += 1;
      const dpActors = byRole['Điều phối'];
      const dpActor = dpActors[counters['Điều phối'] % dpActors.length];
      counters['Điều phối'] += 1;
      const receiveAt = stageStart + 5;
      const completeAt = receiveAt + 45 + ((customerIndex + stageIndex) % 4) * 5;
      jobs.push({
        customer,
        customerIndex,
        journey,
        kind,
        stageIndex,
        deskActor,
        dpActor,
        dispatchAt: stageStart,
        receiveAt,
        completeAt,
      });
      stageStart = completeAt + 10;
    });
  });

  const tvActors = byRole['Tư vấn'];
  const khoJobs = [];
  byRole.Kho.forEach((actor, khoIndex) => {
    [60, 270, 480].forEach((base, round) => {
      const recipient = tvActors[(khoIndex + round * byRole.Kho.length) % tvActors.length];
      khoJobs.push({ actor, recipient, at: base + khoIndex * 6, round });
    });
  });
  return { jobs, khoJobs };
}

function preflightGet(path, label) {
  const response = http.get(`${baseUrl}/${path}`, { tags: { endpoint: path, action: 'preflight' } });
  const body = json(response);
  if (!check(response, { [`${label} HTTP 200/code 0`]: (r) => r.status === 200 && body?.code === 0 })) {
    fail(`${label} lỗi: HTTP ${response.status} ${String(response.body).slice(0, 500)}`);
  }
  return body;
}

export function setup() {
  preflightGet('health', 'Worker health');
  const rosterBody = preflightGet('dsMaster', 'Master_DS');
  const checkinBody = preflightGet('checkin', 'Master_Check in');
  const masterBody = preflightGet('master', 'SS_Master');
  const dispatchBody = preflightGet('dispatch', 'Master_Điều phối');
  const masterFields = preflightGet('fields', 'Schema SS_Master');
  const dispatchFields = preflightGet('fields?table=dispatch', 'Schema Điều phối');

  const actors = items(rosterBody).map((row) => {
    const fields = row.fields || {};
    const desk = text(fields['STT bàn']).trim();
    return {
      desk,
      role: roleForDesk(desk),
      msnv: text(fields.MSNV).trim(),
      name: text(fields['NV Tư vấn']).trim(),
    };
  }).filter((actor) => actor.desk && actor.role).sort(sortActors);

  const expectedRoles = { 'Điều phối': 4, 'Tư vấn': 16, 'Thu cũ': 6, Backup: 6, Kho: 6 };
  Object.entries(expectedRoles).forEach(([role, count]) => {
    const actual = actors.filter((actor) => actor.role === role).length;
    if (actual !== count) fail(`Master_DS ${role}: cần ${count}, hiện có ${actual}`);
  });
  const incompleteActors = actors.filter((actor) => !actor.msnv || !actor.name);
  if (incompleteActors.length) fail(`Master_DS thiếu MSNV/tên: ${incompleteActors.map((a) => a.desk).join(', ')}`);

  const customers = items(checkinBody).map((row) => {
    const fields = row.fields || {};
    return { stt: text(fields['STT Input']).trim(), hoTen: text(fields['Họ và tên'] || fields['Họ và tên khách lẻ']).trim() };
  }).filter((customer) => customer.stt && customer.hoTen)
    .sort((a, b) => Number(a.stt) - Number(b.stt));
  if (customers.length !== 42) fail(`Cần đúng 42 khách Check-in, hiện có ${customers.length}`);
  if (new Set(customers.map((customer) => customer.stt)).size !== 42) fail('STT Check-in không duy nhất');

  const masterCount = items(masterBody).length;
  const dispatchCount = items(dispatchBody).length;
  if (strictEmpty && (masterCount !== 0 || dispatchCount !== 0)) {
    fail(`Preflight yêu cầu bảng trống: SS_Master=${masterCount}, Điều phối=${dispatchCount}`);
  }
  const requiredMaster = ['stt', 'trangThai', 'phanLoai', 'submitBy', 'hinhNghiemThu', 'scanQr', 'imei', 'leadtimeGiay (worker tính)'];
  const badMaster = (masterFields.data?.mapping || []).filter((field) => requiredMaster.includes(field.key) && !field.ok);
  const badDispatch = (dispatchFields.data?.mapping || []).filter((field) => !field.ok);
  if (badMaster.length || badDispatch.length) fail(`Schema chưa sẵn sàng: ${JSON.stringify({ badMaster, badDispatch })}`);

  const plan = buildPlan(customers, actors);
  if (plan.jobs.length !== 95 || plan.khoJobs.length !== 18) fail(`Plan sai số lượng: stages=${plan.jobs.length}, kho=${plan.khoJobs.length}`);
  console.log(`PREFLIGHT_OK dryRun=${dryRun} actors=${actors.length} customers=${customers.length} stages=${plan.jobs.length} kho=${plan.khoJobs.length}`);
  return { startedAt: Date.now(), actors, ...plan };
}

function poll(actor) {
  const response = http.get(`${baseUrl}/dashboard/snapshot?role=${encodeURIComponent(actor.desk)}`, {
    tags: { endpoint: 'dashboard/snapshot', role: actor.role, desk: actor.desk },
  });
  const body = json(response);
  const tables = body?.data?.tables;
  const warnings = Array.isArray(body?.data?.warnings) ? body.data.warnings : [];
  const contentOk = body?.code === 0
    && tables
    && Array.isArray(tables.checkin) && tables.checkin.length > 0
    && Array.isArray(tables.orders) && tables.orders.length > 0
    && Array.isArray(tables.master)
    && Array.isArray(tables.dispatch) && tables.dispatch.length > 0
    && Array.isArray(tables.dsMaster) && tables.dsMaster.length === 38;
  const ok = check(response, {
    'snapshot HTTP 2xx': (r) => r.status >= 200 && r.status < 300,
    'snapshot content usable': () => Boolean(contentOk),
  });
  if (warnings.length || body?.msg === 'stale snapshot') {
    staleSnapshots.add(1, { role: actor.role, desk: actor.desk });
  }
  reads.add(1, { role: actor.role, desk: actor.desk });
  readErrors.add(!ok, { role: actor.role, desk: actor.desk });
  snapshotContentErrors.add(!contentOk, { role: actor.role, desk: actor.desk });
  readLatency.add(response.timings.duration, { role: actor.role, desk: actor.desk });
}

function waitUntil(startedAt, targetSec, actor) {
  while (Date.now() < startedAt + targetSec * 1000) {
    poll(actor);
    const remaining = (startedAt + targetSec * 1000 - Date.now()) / 1000;
    if (remaining > 0) sleep(Math.min(pollSec, remaining));
  }
}

function post(endpoint, payload, actor, action, job) {
  const response = http.post(`${baseUrl}/${endpoint}`, JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint, action, role: actor.role, desk: actor.desk, case: job?.journey?.id || 'KHO' },
  });
  const body = json(response);
  const ok = check(response, {
    [`${endpoint} HTTP 2xx`]: (r) => r.status >= 200 && r.status < 300,
    [`${endpoint} code 0`]: () => body?.code === 0,
  });
  writes.add(1, { endpoint, action, role: actor.role, desk: actor.desk });
  writeErrors.add(!ok, { endpoint, action, role: actor.role, desk: actor.desk });
  writeLatency.add(response.timings.duration, { endpoint, action, role: actor.role, desk: actor.desk });
  if (!ok) console.log(`WRITE_FAILED ${actor.desk}/${action} HTTP=${response.status} body=${String(response.body).slice(0, 500)}`);
  return ok;
}

function uploadImage(actor, sequence) {
  const image = images[sequence % images.length];
  const filename = `nghiem-thu-${actor.desk}-${sequence + 1}.${image.mime === 'image/png' ? 'png' : image.mime === 'image/webp' ? 'webp' : 'jpg'}`;
  const response = http.post(`${baseUrl}/upload`, { file: http.file(image.bytes, filename, image.mime) }, {
    tags: { endpoint: 'upload', action: 'upload', role: actor.role, desk: actor.desk },
  });
  const body = json(response);
  const ok = check(response, {
    'upload HTTP 2xx': (r) => r.status >= 200 && r.status < 300,
    'upload code 0/fileToken': () => body?.code === 0 && !!body?.data?.fileToken,
  });
  uploads.add(1, { role: actor.role, desk: actor.desk });
  uploadErrors.add(!ok, { role: actor.role, desk: actor.desk });
  uploadLatency.add(response.timings.duration, { role: actor.role, desk: actor.desk });
  if (!ok) console.log(`UPLOAD_FAILED ${actor.desk} HTTP=${response.status} body=${String(response.body).slice(0, 500)}`);
  return ok ? body.data.fileToken : null;
}

function dispatchPayload(job) {
  const actor = job.dpActor;
  return {
    stt: job.customer.stt,
    hoTen: job.customer.hoTen,
    phanLoai: job.kind,
    maBan: job.deskActor.desk,
    nhanSu: job.deskActor.name,
    msnv: job.deskActor.msnv,
    submitBy: actor.msnv,
    dieuPhoiId: actor.msnv,
    dieuPhoiTen: actor.name,
    dieuPhoiViTri: actor.desk,
    thoiGian: new Date().toISOString(),
  };
}

function staffPayload(job, action, fileToken) {
  const actor = job.deskActor;
  const extra = action === 'hoan_tat' ? completionExtra(job.customerIndex, job.journey, job.kind, job.stageIndex) : {};
  return {
    action,
    trangThai: action === 'tiep_nhan' ? 'Tiếp nhận' : 'Hoàn tất',
    stt: job.customer.stt,
    hoTen: job.customer.hoTen,
    maBan: actor.desk,
    msnv: actor.msnv,
    phanLoai: job.kind,
    nhanSu: actor.name,
    submitBy: actor.msnv,
    thoiGian: new Date().toISOString(),
    ...extra,
    ...(fileToken ? { hinhNghiemThu: [fileToken] } : {}),
  };
}

function runDispatchActor(data, actor) {
  const jobs = data.jobs.filter((job) => job.dpActor.desk === actor.desk).sort((a, b) => a.dispatchAt - b.dispatchAt);
  jobs.forEach((job) => {
    waitUntil(data.startedAt, job.dispatchAt, actor);
    post('dispatch-record', dispatchPayload(job), actor, 'dispatch', job);
  });
}

function runServiceActor(data, actor) {
  const jobs = data.jobs.filter((job) => job.deskActor.desk === actor.desk).sort((a, b) => a.receiveAt - b.receiveAt);
  jobs.forEach((job, index) => {
    waitUntil(data.startedAt, job.receiveAt, actor);
    post('record', staffPayload(job, 'tiep_nhan', null), actor, 'tiep_nhan', job);
    let fileToken = null;
    if (job.kind === 'Thu cũ' || job.kind === 'Backup') {
      waitUntil(data.startedAt, Math.max(job.receiveAt, job.completeAt - 12), actor);
      fileToken = uploadImage(actor, job.customerIndex + job.stageIndex + index);
    }
    waitUntil(data.startedAt, job.completeAt, actor);
    post('record', staffPayload(job, 'hoan_tat', fileToken), actor, 'hoan_tat', job);
  });
}

function runKhoActor(data, actor) {
  const jobs = data.khoJobs.filter((job) => job.actor.desk === actor.desk).sort((a, b) => a.at - b.at);
  jobs.forEach((job, index) => {
    waitUntil(data.startedAt, job.at, actor);
    const fileToken = uploadImage(actor, 100 + numericDesk(actor.desk) + index);
    post('record', {
      action: 'ban_giao',
      trangThai: 'Bàn giao kho',
      stt: '',
      hoTen: '',
      maBan: job.recipient.desk,
      msnv: actor.msnv,
      phanLoai: '',
      nhanSu: job.recipient.name,
      submitBy: actor.msnv,
      thoiGian: new Date().toISOString(),
      scanQr: job.recipient.desk,
      ...(fileToken ? { hinhNghiemThu: [fileToken] } : {}),
    }, actor, 'ban_giao', null);
  });
}

export default function (data) {
  if (dryRun) return;
  if (!allowLiveWrites) fail('Bài test production cần ALLOW_LIVE_WRITES=true');
  if (!Number.isFinite(durationSec) || durationSec < 600 || durationSec > 3600) {
    fail('DURATION_SEC phải từ 600 đến 3600 giây');
  }
  const actor = data.actors[__VU - 1];
  if (!actor) fail(`Không tìm thấy actor cho VU ${__VU}`);
  if (actor.role === 'Điều phối') runDispatchActor(data, actor);
  else if (actor.role === 'Kho') runKhoActor(data, actor);
  else runServiceActor(data, actor);
  waitUntil(data.startedAt, durationSec, actor);
}
