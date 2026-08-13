import http from 'k6/http';
import { check, fail, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Peak event model: 36 desk devices + 4 coordinator devices.
// The first 40 existing Check-in rows are supplied at runtime; no Check-in
// rows are created by this test.
const baseUrl = (__ENV.BASE_URL || 'https://vhws-lark-proxy.eventnpi2026.workers.dev').replace(/\/+$/, '');
const staffEndpoint = (__ENV.STAFF_ENDPOINT || 'record').replace(/^\/+|\/+$/g, '');
const runId = __ENV.RUN_ID || `PEAK-LIVE-${Date.now()}`;
const durationSec = Number(__ENV.DURATION_SEC || 300);
const pollSec = Number(__ENV.POLL_SEC || 5);
const actionDelaySec = Number(__ENV.ACTION_DELAY_SEC || 8);
const allowLiveWrites = (__ENV.ALLOW_LIVE_WRITES || '').toLowerCase() === 'true';
const writeEnabled = (__ENV.WRITE_ENABLED || 'true').toLowerCase() === 'true';
const verifyCheckin = (__ENV.VERIFY_CHECKIN || 'true').toLowerCase() === 'true';
const customers = JSON.parse(__ENV.TEST_CUSTOMERS || '[]');
const deviceCount = 40;
const coordinatorCount = 4;

const CASES = [
  { id: 'C01', stages: ['Tư vấn'] },
  { id: 'C02', stages: ['Tư vấn', 'Thu cũ'], thuLaiMay: 'Thu máy ngay' },
  { id: 'C03', stages: ['Tư vấn', 'Backup'] },
  { id: 'C04', stages: ['Tư vấn', 'Thu cũ', 'Backup'], thuLaiMay: 'Thu máy ngay' },
  { id: 'C05', stages: ['Tư vấn', 'Thu cũ', 'Thu cũ'], thuLaiMay: 'Thu máy sau', retryTradeIn: true },
  { id: 'C06', stages: ['Tư vấn', 'Thu cũ', 'Backup'], thuLaiMay: 'Thu máy sau', backupCollects: true },
  { id: 'C07', stages: ['Tư vấn', 'Thu cũ', 'Backup'], thuLaiMay: 'Thu máy ngay' },
  { id: 'C08', stages: ['Tư vấn', 'Thu cũ', 'Backup'], thuLaiMay: 'Thu máy sau', backupCollects: true },
  { id: 'C09', stages: ['Tư vấn'], recheckBackup: 'Không' },
  { id: 'C10', stages: ['Tư vấn', 'Backup'], recheckBackup: 'Có' },
];

if (writeEnabled && !allowLiveWrites) fail('Peak live write test cần ALLOW_LIVE_WRITES=true');
if (customers.length !== deviceCount) fail('TEST_CUSTOMERS phải có đúng 40 khách Check-in');
if (!Number.isFinite(durationSec) || durationSec < 60) fail('DURATION_SEC phải từ 60 giây');

const readRequests = new Counter('peak_read_requests');
const writeRequests = new Counter('peak_write_requests');
const applicationErrors = new Rate('peak_application_errors');
const readLatency = new Trend('peak_read_latency', true);
const writeLatency = new Trend('peak_write_latency', true);
let readErrorLogs = 0;

export const options = {
  scenarios: {
    peak_live: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: deviceCount },
        { duration: `${Math.max(1, durationSec - 20)}s`, target: deviceCount },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    peak_application_errors: ['rate<0.01'],
    peak_read_latency: ['p(95)<15000'],
    peak_write_latency: ['p(95)<15000'],
  },
  tags: { loadtest: runId, scenario: 'peak-live-40vu' },
};

function request(method, endpoint, payload, tags, metric) {
  const response = method === 'GET'
    ? http.get(`${baseUrl}/${endpoint}`, { tags })
    : http.post(`${baseUrl}/${endpoint}`, JSON.stringify(payload), {
      headers: { 'Content-Type': 'application/json' },
      tags,
    });
  const ok = check(response, { [`${endpoint} is 2xx`]: (r) => r.status >= 200 && r.status < 300 });
  applicationErrors.add(!ok, { endpoint, role: tags.role });
  metric.add(response.timings.duration, { endpoint, role: tags.role });
  if (method === 'GET') readRequests.add(1, { endpoint, role: tags.role });
  else writeRequests.add(1, { endpoint, role: tags.role });
  if (!ok) fail(`${tags.role} ${endpoint} failed: HTTP ${response.status} ${response.body.slice(0, 180)}`);
  return response;
}

function poll(role) {
  const started = Date.now();
  const response = http.get(`${baseUrl}/dashboard/snapshot?loadtest=${encodeURIComponent(runId)}&role=${role}&vu=${__VU}`, {
    tags: { endpoint: 'read:dashboard-snapshot', role },
  });
  const ok = check(response, { 'read dashboard snapshot is 2xx': (r) => r.status >= 200 && r.status < 300 });
  if (!ok && readErrorLogs < 2) {
    console.log(`snapshot error vu=${__VU} status=${response.status} body=${String(response.body).slice(0, 500)}`);
    readErrorLogs += 1;
  }
  applicationErrors.add(!ok, { endpoint: 'read:dashboard-snapshot', role });
  readRequests.add(1, { endpoint: 'dashboard-snapshot', role });
  readLatency.add(response.timings.duration, { endpoint: 'dashboard-snapshot', role });
  sleep(Math.max(0.2, pollSec - (Date.now() - started) / 1000));
}

function kindFor(stage) {
  return stage === 'Thu cũ' || stage === 'Backup' ? stage : 'Tư vấn';
}

function deskFor(kind, deviceIndex, stageIndex) {
  if (kind === 'Tư vấn') return `TV${(deviceIndex % 18) + 1}`;
  if (kind === 'Thu cũ') return `TC${(deviceIndex % 10) + 1}`;
  return `BK${((deviceIndex + stageIndex) % 8) + 1}`;
}

function completeExtra(journey, kind, stageIndex) {
  const extra = {};
  if (kind !== 'Backup') extra.checkBackup = journey.recheckBackup || (journey.stages.includes('Backup') ? 'Có' : 'Không');
  if (kind === 'Thu cũ') extra.thuLaiMay = journey.retryTradeIn && stageIndex === 2 ? 'Thu máy ngay' : journey.thuLaiMay;
  if (kind === 'Backup' && (journey.backupCollects || journey.thuLaiMay === 'Thu máy ngay')) extra.thuLaiMay = 'Thu máy ngay';
  return extra;
}

function dispatch(customer, deviceIndex) {
  const dp = (deviceIndex - 36) + 1;
  request('POST', 'dispatch-record', {
    stt: String(customer.stt), hoTen: customer.hoTen, phanLoai: 'Tư vấn', maBan: `TV${dp}`,
    nhanSu: `${runId}-DP${dp}`, msnv: `LOAD-DP${dp}`, submitBy: `LOAD-DP${dp}`,
    dieuPhoiId: `LOAD-DP${dp}`, dieuPhoiTen: `${runId} DP${dp}`,
    dieuPhoiViTri: 'k6-peak-live-40vu', thoiGian: new Date().toISOString(),
  }, { endpoint: 'write:dispatch', role: `DP${dp}`, case: `DP${dp}` }, writeLatency);
}

function staffAction(customer, journey, deviceIndex, kind, desk, action, stageIndex) {
  request('POST', staffEndpoint, {
    action, trangThai: action === 'tiep_nhan' ? 'Tiếp nhận' : 'Hoàn tất',
    stt: String(customer.stt), hoTen: customer.hoTen, maBan: desk,
    msnv: `LOAD-${desk}`, phanLoai: kind, nhanSu: `${runId}-${desk}`,
    submitBy: `LOAD-${desk}`, thoiGian: new Date().toISOString(),
    ...(action === 'hoan_tat' ? completeExtra(journey, kind, stageIndex) : {}),
  }, { endpoint: `write:${staffEndpoint}`, role: `DESK-${desk}`, case: journey.id }, writeLatency);
}

export function setup() {
  const health = request('GET', 'health', null, { endpoint: 'health', role: 'setup' }, readLatency);
  if (health.status !== 200) fail(`Health check failed: HTTP ${health.status}`);
  if (verifyCheckin) {
    const checkin = request('GET', `checkin?loadtest=${encodeURIComponent(runId)}`, null, { endpoint: 'checkin-precondition', role: 'setup' }, readLatency);
    const missing = customers.filter((customer) => !checkin.body.includes(String(customer.stt)) || !checkin.body.includes(String(customer.hoTen)));
    if (missing.length) fail(`Thiếu khách Check-in: ${missing.map((c) => `${c.stt}/${c.hoTen}`).join(', ')}`);
  }
  return { customers, startedAt: Date.now() };
}

export default function (data) {
  const deviceIndex = __VU - 1;
  const customer = data.customers[deviceIndex];
  const role = deviceIndex >= 36 ? `DP${deviceIndex - 35}` : `DESK-${deviceIndex + 1}`;
  const endAt = data.startedAt + durationSec * 1000;

  // Four DP devices submit dispatch records for STT 37–40 and then keep polling.
  if (deviceIndex >= 36) {
    if (writeEnabled) dispatch(customer, deviceIndex);
    while (Date.now() < endAt) poll(role);
    return;
  }

  // Thirty-six desk devices process one unique customer through one of the 10 cases.
  const journey = CASES[deviceIndex % CASES.length];
  if (writeEnabled) {
    journey.stages.forEach((stage, stageIndex) => {
      const kind = kindFor(stage);
      const desk = deskFor(kind, deviceIndex, stageIndex);
      staffAction(customer, journey, deviceIndex, kind, desk, 'tiep_nhan', stageIndex);
      sleep(actionDelaySec);
      staffAction(customer, journey, deviceIndex, kind, desk, 'hoan_tat', stageIndex);
      sleep(actionDelaySec);
    });
  }
  while (Date.now() < endAt) poll(role);
}
