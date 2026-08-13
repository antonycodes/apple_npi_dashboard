import http from 'k6/http';
import { check, fail, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

/**
 * 10 live customer journeys: Check-in -> Tư vấn -> Thu cũ/Backup -> End flow.
 *
 * This script writes synthetic SS_Master/dispatch log rows through the same
 * Worker routes used by the dashboard. It does not write Master_Check in;
 * TEST_CUSTOMERS must point at 10 real check-in rows in the target Base.
 */
const baseUrl = (__ENV.BASE_URL || 'https://vhws-lark-proxy.eventnpi2026.workers.dev').replace(/\/+$/, '');
const staffEndpoint = (__ENV.STAFF_ENDPOINT || 'record').replace(/^\/+|\/+$/g, '');
const runId = __ENV.RUN_ID || `JOURNEY-${Date.now()}`;
const stageDelay = Number(__ENV.STAGE_DELAY_SEC || 3);
const dispatchDelay = Number(__ENV.DISPATCH_DELAY_SEC || 2);
const verifyCheckin = (__ENV.VERIFY_CHECKIN || 'true').toLowerCase() === 'true';
const allowLiveWrites = (__ENV.ALLOW_LIVE_WRITES || '').toLowerCase() === 'true';
const verifyEndFlow = (__ENV.VERIFY_END_FLOW || 'false').toLowerCase() === 'true';
const endFlowPollSec = Number(__ENV.END_FLOW_POLL_SEC || 5);
const endFlowTimeoutSec = Number(__ENV.END_FLOW_TIMEOUT_SEC || 90);

const customers = JSON.parse(__ENV.TEST_CUSTOMERS || '[]');

const CASES = [
  { id: 'C01', label: 'Không thu cũ · Không Backup', stages: ['Tư vấn'] },
  { id: 'C02', label: 'Có thu cũ · Không Backup · Thu máy ngay', stages: ['Tư vấn', 'Thu cũ'], thuLaiMay: 'Thu máy ngay' },
  { id: 'C03', label: 'Không thu cũ · Có Backup', stages: ['Tư vấn', 'Backup'] },
  { id: 'C04', label: 'Có thu cũ · Có Backup · Thu máy ngay', stages: ['Tư vấn', 'Thu cũ', 'Backup'], thuLaiMay: 'Thu máy ngay' },
  { id: 'C05', label: 'Có thu cũ · Không Backup · Thu máy sau rồi thu lại', stages: ['Tư vấn', 'Thu cũ', 'Thu cũ'], thuLaiMay: 'Thu máy sau', retryTradeIn: true },
  { id: 'C06', label: 'Có thu cũ · Có Backup · Thu máy sau → Backup', stages: ['Tư vấn', 'Thu cũ', 'Backup'], thuLaiMay: 'Thu máy sau', backupCollects: true },
  { id: 'C07', label: 'Có thu cũ · Có Backup · Thu máy ngay tại Thu cũ', stages: ['Tư vấn', 'Thu cũ', 'Backup'], thuLaiMay: 'Thu máy ngay' },
  { id: 'C08', label: 'Có thu cũ · Có Backup · Thu máy sau, Backup chốt máy', stages: ['Tư vấn', 'Thu cũ', 'Backup'], thuLaiMay: 'Thu máy sau', backupCollects: true },
  { id: 'C09', label: 'Recheck: Check-in có Backup → thực tế Không Backup', stages: ['Tư vấn'], recheckBackup: 'Không' },
  { id: 'C10', label: 'Recheck: Check-in không Backup → thực tế Có Backup', stages: ['Tư vấn', 'Backup'], recheckBackup: 'Có' },
];

if (!allowLiveWrites) fail('Live journey test cần ALLOW_LIVE_WRITES=true');
if (customers.length !== CASES.length) fail(`TEST_CUSTOMERS phải có đúng ${CASES.length} khách đã Check-in`);
if (!Number.isFinite(stageDelay) || stageDelay < 0) fail('STAGE_DELAY_SEC phải là số không âm');

const requests = new Counter('journey_requests');
const applicationErrors = new Rate('journey_application_errors');
const latency = new Trend('journey_request_latency', true);
const completedCases = new Counter('journey_cases_completed');

export const options = {
  scenarios: {
    live_customer_journeys: {
      executor: 'per-vu-iterations',
      vus: CASES.length,
      iterations: 1,
      maxDuration: '15m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    journey_application_errors: ['rate<0.01'],
    journey_request_latency: ['p(95)<15000'],
  },
  tags: { loadtest: runId, scenario: 'live-customer-journeys' },
};

function post(endpoint, payload, tags) {
  const response = http.post(`${baseUrl}/${endpoint}`, JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint, ...tags },
  });
  requests.add(1, { endpoint, case: tags.case });
  const ok = check(response, { [`${endpoint} is 2xx`]: (r) => r.status >= 200 && r.status < 300 });
  applicationErrors.add(!ok, { endpoint, case: tags.case });
  latency.add(response.timings.duration, { endpoint, case: tags.case });
  if (!ok) fail(`${tags.case} ${endpoint} failed: HTTP ${response.status} ${response.body.slice(0, 180)}`);
}

function dispatch(customer, journey, kind, desk, stageIndex) {
  post('webhook', {
    stt: String(customer.stt),
    hoTen: customer.hoTen,
    phanLoai: kind,
    maBan: desk,
    nhanSu: `${runId}-${desk}`,
    msnv: `LOAD-${desk}`,
    submitBy: `LOAD-${desk}`,
    dieuPhoiId: `LOAD-${desk}`,
    dieuPhoiTen: `${runId} điều phối test`,
    dieuPhoiViTri: 'k6-live-customer-journeys',
    thoiGian: new Date().toISOString(),
  }, { case: journey.id, journey: journey.label, stage: `${stageIndex + 1}-${kind}` });
}

function staffAction(customer, journey, kind, desk, action, stageIndex, extra = {}) {
  post(staffEndpoint, {
    action,
    trangThai: action === 'tiep_nhan' ? 'Tiếp nhận' : 'Hoàn tất',
    stt: String(customer.stt),
    hoTen: customer.hoTen,
    maBan: desk,
    msnv: `LOAD-${desk}`,
    phanLoai: kind,
    nhanSu: `${runId}-${desk}`,
    submitBy: `LOAD-${desk}`,
    thoiGian: new Date().toISOString(),
    ...extra,
  }, { case: journey.id, journey: journey.label, stage: `${stageIndex + 1}-${kind}`, action });
}

function stageConfig(journey, kind, stageIndex) {
  // C05 deliberately returns to the same Thu cũ desk for the "Thu máy sau"
  // retry; the other stages use different synthetic desks to make parallel
  // activity easier to distinguish on the dashboard.
  const suffix = journey.retryTradeIn && kind === 'Thu cũ' ? 2 : ((stageIndex + 1) % 10 || 10);
  const desk = kind === 'Tư vấn' ? `TV${suffix}` : kind === 'Thu cũ' ? `TC${suffix}` : `BK${suffix}`;
  const completeExtra = {};

  if (kind !== 'Backup') {
    completeExtra.checkBackup = journey.recheckBackup || (journey.stages.includes('Backup') ? 'Có' : 'Không');
  }
  if (kind === 'Thu cũ') {
    completeExtra.thuLaiMay = journey.retryTradeIn && stageIndex === 2
      ? 'Thu máy ngay'
      : journey.thuLaiMay;
  }
  if (kind === 'Backup' && (journey.backupCollects || journey.thuLaiMay === 'Thu máy ngay')) {
    completeExtra.thuLaiMay = 'Thu máy ngay';
  }
  return { desk, completeExtra };
}

function kindForStage(stage, journey) {
  if (stage === 'Thu cũ') return 'Thu cũ';
  if (stage === 'Backup') return 'Backup';
  return 'Tư vấn';
}

export function setup() {
  const health = http.get(`${baseUrl}/health`, { tags: { endpoint: 'health' } });
  if (!check(health, { 'health is HTTP 200': (r) => r.status === 200 })) fail(`Health check failed: HTTP ${health.status}`);

  if (verifyCheckin) {
    const checkin = http.get(`${baseUrl}/checkin?loadtest=${encodeURIComponent(runId)}`, { tags: { endpoint: 'checkin-precondition' } });
    if (!check(checkin, { 'check-in table is HTTP 200': (r) => r.status === 200 })) fail(`Cannot read check-in table: HTTP ${checkin.status}`);
    const missing = customers.filter((customer) => !checkin.body.includes(String(customer.stt)) || !checkin.body.includes(String(customer.hoTen)));
    if (missing.length) fail(`Thiếu khách trong Master_Check in: ${missing.map((customer) => `${customer.stt}/${customer.hoTen}`).join(', ')}`);
  }
  return { runId, customers };
}

function verifyEndFlowForCustomer(customer, journey) {
  if (!verifyEndFlow) return;
  const deadline = Date.now() + endFlowTimeoutSec * 1000;
  while (Date.now() < deadline) {
    const response = http.get(`${baseUrl}/checkin?loadtest=${encodeURIComponent(runId)}&verify_stt=${encodeURIComponent(customer.stt)}`, {
      tags: { endpoint: 'checkin-end-flow', case: journey.id },
    });
    if (response.status >= 200 && response.status < 300 && response.body.toLowerCase().includes('end flow')) return;
    sleep(endFlowPollSec);
  }
  fail(`${journey.id} STT ${customer.stt} chưa thấy End flow sau ${endFlowTimeoutSec}s`);
}

export default function (data) {
  const index = __VU - 1;
  const journey = CASES[index];
  const customer = data.customers[index];
  if (!customer?.stt || !customer?.hoTen) fail(`${journey.id} cần stt và hoTen`);

  journey.stages.forEach((stage, stageIndex) => {
    const kind = kindForStage(stage, journey);
    const { desk, completeExtra } = stageConfig(journey, kind, stageIndex);
    dispatch(customer, journey, kind, desk, stageIndex);
    sleep(dispatchDelay);
    staffAction(customer, journey, kind, desk, 'tiep_nhan', stageIndex);
    sleep(stageDelay);
    staffAction(customer, journey, kind, desk, 'hoan_tat', stageIndex, completeExtra);
    if (stageIndex < journey.stages.length - 1) sleep(dispatchDelay);
  });

  verifyEndFlowForCustomer(customer, journey);
  completedCases.add(1, { case: journey.id, journey: journey.label });
}
