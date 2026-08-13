import http from 'k6/http';
import { check, fail, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// 10 writer VUs, two waves: normal arrivals followed by a 10-submit peak.
const baseUrl = (__ENV.BASE_URL || 'https://vhws-lark-proxy.eventnpi2026.workers.dev').replace(/\/+$/, '');
const runId = __ENV.RUN_ID || `EVENT-PACED-${Date.now()}`;
const customers = JSON.parse(__ENV.TEST_CUSTOMERS || '[]');
const allowLiveWrites = (__ENV.ALLOW_LIVE_WRITES || '').toLowerCase() === 'true';
const peakAtSec = Number(__ENV.PEAK_AT_SEC || 180);
const receiveDelaySec = Number(__ENV.RECEIVE_DELAY_SEC || 5);
const normalOffsetsSec = [0, 7, 14, 21, 29, 37, 46, 55, 65, 75];

const cases = [
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

if (!allowLiveWrites) fail('Live write test cần ALLOW_LIVE_WRITES=true');
if (customers.length !== 20) fail('TEST_CUSTOMERS phải có đúng 20 khách đã Check-in');

const writes = new Counter('event_write_requests');
const errors = new Rate('event_write_errors');
const latency = new Trend('event_write_latency', true);
const completed = new Counter('event_customers_completed');

export const options = {
  scenarios: {
    event_writers: { executor: 'per-vu-iterations', vus: 10, iterations: 1, maxDuration: '8m' },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    event_write_errors: ['rate<0.01'],
    event_write_latency: ['p(95)<15000'],
  },
  tags: { loadtest: runId, scenario: 'event-paced-live' },
};

function sleepUntil(timestampMs) {
  const remainingSec = (timestampMs - Date.now()) / 1000;
  if (remainingSec > 0) sleep(remainingSec);
}

function post(endpoint, payload, tags) {
  const response = http.post(`${baseUrl}/${endpoint}`, JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint, ...tags },
  });
  let body;
  try { body = response.json(); } catch { body = null; }
  const ok = check(response, {
    [`${endpoint} HTTP 2xx`]: (r) => r.status >= 200 && r.status < 300,
    [`${endpoint} application code 0`]: () => body?.code === 0,
  });
  writes.add(1, { endpoint, action: tags.action, wave: tags.wave });
  errors.add(!ok, { endpoint, action: tags.action, wave: tags.wave });
  latency.add(response.timings.duration, { endpoint, action: tags.action, wave: tags.wave });
  if (!ok) fail(`${tags.wave}/${tags.case} ${endpoint} failed: HTTP ${response.status} ${String(response.body).slice(0, 300)}`);
}

function stageKind(stage) {
  return stage === 'Thu cũ' || stage === 'Backup' ? stage : 'Tư vấn';
}

function deskFor(kind, writerIndex, stageIndex) {
  if (kind === 'Tư vấn') return `TV${writerIndex + 1}`;
  if (kind === 'Thu cũ') return `TC${((writerIndex + stageIndex) % 10) + 1}`;
  return `BK${((writerIndex + stageIndex) % 8) + 1}`;
}

function completeExtra(journey, kind, stageIndex) {
  const extra = {};
  if (kind !== 'Backup') extra.checkBackup = journey.recheckBackup || (journey.stages.includes('Backup') ? 'Có' : 'Không');
  if (kind === 'Thu cũ') extra.thuLaiMay = journey.retryTradeIn && stageIndex === 2 ? 'Thu máy ngay' : journey.thuLaiMay;
  if (kind === 'Backup' && (journey.backupCollects || journey.thuLaiMay === 'Thu máy ngay')) extra.thuLaiMay = 'Thu máy ngay';
  return extra;
}

function dispatch(customer, journey, desk, kind, writerIndex, wave) {
  const dp = (writerIndex % 4) + 1;
  post('dispatch-record', {
    stt: String(customer.stt), hoTen: customer.hoTen, phanLoai: kind, maBan: desk,
    nhanSu: `${runId}-${desk}`, msnv: `LOAD-${desk}`, submitBy: `LOAD-DP${dp}`,
    dieuPhoiId: `LOAD-DP${dp}`, dieuPhoiTen: `${runId}-DP${dp}`,
    dieuPhoiViTri: 'k6-event-paced-live', thoiGian: new Date().toISOString(),
  }, { case: journey.id, wave, action: 'dispatch', desk });
}

function staffAction(customer, journey, desk, kind, writerIndex, wave, action, stageIndex) {
  post('record', {
    action, trangThai: action === 'tiep_nhan' ? 'Tiếp nhận' : 'Hoàn tất',
    stt: String(customer.stt), hoTen: customer.hoTen, maBan: desk,
    msnv: `LOAD-${desk}`, phanLoai: kind, nhanSu: `${runId}-${desk}`,
    submitBy: `LOAD-${desk}`, thoiGian: new Date().toISOString(),
    ...(action === 'hoan_tat' ? completeExtra(journey, kind, stageIndex) : {}),
  }, { case: journey.id, wave, action, desk, writer: writerIndex + 1 });
}

function processCustomer(customer, journey, writerIndex, wave) {
  journey.stages.forEach((stage, stageIndex) => {
    const kind = stageKind(stage);
    const desk = deskFor(kind, writerIndex, stageIndex);
    dispatch(customer, journey, desk, kind, writerIndex, wave);
    sleep(receiveDelaySec);
    staffAction(customer, journey, desk, kind, writerIndex, wave, 'tiep_nhan', stageIndex);
    sleep(15 + ((writerIndex + stageIndex) % 6) * 2);
    staffAction(customer, journey, desk, kind, writerIndex, wave, 'hoan_tat', stageIndex);
    if (stageIndex < journey.stages.length - 1) sleep(5 + (writerIndex % 3));
  });
  completed.add(1, { wave, case: journey.id });
}

export function setup() {
  const health = http.get(`${baseUrl}/health`, { tags: { endpoint: 'health', action: 'precondition' } });
  if (!check(health, { 'production Worker health is 200': (r) => r.status === 200 })) fail(`Health failed: HTTP ${health.status}`);
  const checkin = http.get(`${baseUrl}/checkin?loadtest=${encodeURIComponent(runId)}`, { tags: { endpoint: 'checkin', action: 'precondition' } });
  if (!check(checkin, { 'checkin is 200': (r) => r.status === 200 })) fail(`Check-in failed: HTTP ${checkin.status}`);
  const missing = customers.filter((customer) => !checkin.body.includes(String(customer.stt)) || !checkin.body.includes(customer.hoTen));
  if (missing.length) fail(`Thiếu khách Check-in: ${missing.map((c) => `${c.stt}/${c.hoTen}`).join(', ')}`);
  return { startedAt: Date.now(), customers };
}

export default function (data) {
  const writerIndex = __VU - 1;
  const journey = cases[writerIndex];
  sleepUntil(data.startedAt + normalOffsetsSec[writerIndex] * 1000);
  processCustomer(data.customers[writerIndex], journey, writerIndex, 'normal');
  sleepUntil(data.startedAt + peakAtSec * 1000);
  processCustomer(data.customers[writerIndex + 10], journey, writerIndex, 'peak-10');
}
