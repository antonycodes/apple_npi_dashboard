import http from 'k6/http';
import { check, fail, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const baseUrl = (__ENV.BASE_URL || 'https://vhws-lark-proxy.eventnpi2026.workers.dev').replace(/\/+$/, '');
const runId = __ENV.RUN_ID || `FLOWTEST-${Date.now()}`;
const stageDelay = Number(__ENV.STAGE_DELAY_SEC || 2);
const dispatchDelay = Number(__ENV.DISPATCH_DELAY_SEC || 1);
const verifyCheckin = (__ENV.VERIFY_CHECKIN || 'true').toLowerCase() === 'true';
const allowLiveWrites = (__ENV.ALLOW_LIVE_WRITES || '').toLowerCase() === 'true';

// Four customers: two TV desks and two TC desks are active in parallel.
// Override with JSON when the test Base already has known check-in records.
const customers = JSON.parse(__ENV.TEST_CUSTOMERS || JSON.stringify([
  { stt: '910001', hoTen: `${runId}-KH01 TEST ONLY` },
  { stt: '910002', hoTen: `${runId}-KH02 TEST ONLY` },
  { stt: '910003', hoTen: `${runId}-KH03 TEST ONLY` },
  { stt: '910004', hoTen: `${runId}-KH04 TEST ONLY` },
]));

if (!allowLiveWrites) fail('Flow test ghi live cần ALLOW_LIVE_WRITES=true');
if (customers.length !== 4) fail('TEST_CUSTOMERS phải có đúng 4 khách');

const requestCount = new Counter('flow_requests');
const applicationErrors = new Rate('flow_application_errors');
const flowLatency = new Trend('flow_request_latency', true);

export const options = {
  scenarios: {
    customer_flows: {
      executor: 'per-vu-iterations',
      vus: 4,
      iterations: 1,
      maxDuration: '10m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    flow_application_errors: ['rate<0.01'],
    flow_request_latency: ['p(95)<15000'],
  },
  tags: { loadtest: runId, scenario: 'end-flow' },
};

function post(label, url, payload) {
  const response = http.post(url, JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint: label },
  });
  requestCount.add(1, { endpoint: label });
  const ok = check(response, { [`${label} is 2xx`]: (r) => r.status >= 200 && r.status < 300 });
  applicationErrors.add(!ok, { endpoint: label });
  flowLatency.add(response.timings.duration, { endpoint: label });
  if (!ok) fail(`${label} failed: HTTP ${response.status} ${response.body.slice(0, 160)}`);
  return response;
}

function dispatch(customer, kind, desk, coordinator) {
  return post('dispatch', `${baseUrl}/webhook`, {
    stt: customer.stt,
    hoTen: customer.hoTen,
    phanLoai: kind,
    maBan: desk,
    nhanSu: `${runId}-${desk}`,
    msnv: `LOAD-${desk}`,
    submitBy: `LOAD-${desk}`,
    dieuPhoiId: coordinator,
    dieuPhoiTen: `${runId}-${coordinator}`,
    dieuPhoiViTri: 'stress-test-end-flow',
    thoiGian: new Date().toISOString(),
  });
}

function staffAction(customer, kind, desk, action, extra = {}) {
  return post(action === 'tiep_nhan' ? 'receive' : 'complete', `${baseUrl}/webhook2`, {
    action,
    trangThai: action === 'tiep_nhan' ? 'Tiếp nhận' : 'Hoàn tất',
    stt: customer.stt,
    hoTen: customer.hoTen,
    maBan: desk,
    msnv: `LOAD-${desk}`,
    phanLoai: kind,
    nhanSu: `${runId}-${desk}`,
    submitBy: `LOAD-${desk}`,
    thoiGian: new Date().toISOString(),
    ...extra,
  });
}

export function setup() {
  const health = http.get(`${baseUrl}/health`, { tags: { endpoint: 'health' } });
  if (!check(health, { 'health is HTTP 200': (r) => r.status === 200 })) {
    fail(`Health check failed: HTTP ${health.status}`);
  }

  if (verifyCheckin) {
    const checkin = http.get(`${baseUrl}/checkin?loadtest=${encodeURIComponent(runId)}`, { tags: { endpoint: 'checkin-precondition' } });
    if (!check(checkin, { 'check-in table is HTTP 200': (r) => r.status === 200 })) {
      fail(`Cannot read check-in table: HTTP ${checkin.status}`);
    }
    const body = checkin.body;
    const missing = customers.filter((customer) => !body.includes(String(customer.stt)));
    if (missing.length) {
      fail(`Thiếu khách đã check-in: ${missing.map((customer) => customer.stt).join(', ')}. Không ghi flow.`);
    }
  }
  return { runId, customers };
}

export default function (data) {
  const index = __VU - 1;
  const customer = data.customers[index];
  const tvDesk = index % 2 === 0 ? 'TV1' : 'TV2';
  const tcDesk = index % 2 === 0 ? 'TC1' : 'TC2';
  const coordinator = ['DP1', 'DP2', 'DP3'][index % 3];

  // Stage 1: khách đã check-in -> DP điều phối -> TV tiếp nhận/hoàn tất.
  dispatch(customer, 'Tư vấn', tvDesk, coordinator);
  sleep(dispatchDelay);
  staffAction(customer, 'Tư vấn', tvDesk, 'tiep_nhan');
  sleep(stageDelay);
  staffAction(customer, 'Tư vấn', tvDesk, 'hoan_tat', { checkBackup: 'Không' });

  // Stage 2: DP điều phối tiếp -> TC tiếp nhận/hoàn tất -> End flow.
  sleep(dispatchDelay);
  dispatch(customer, 'Thu cũ', tcDesk, ['DP2', 'DP3', 'DP1'][index % 3]);
  sleep(dispatchDelay);
  staffAction(customer, 'Thu cũ', tcDesk, 'tiep_nhan');
  sleep(stageDelay);
  staffAction(customer, 'Thu cũ', tcDesk, 'hoan_tat', { thuLaiMay: 'Thu máy ngay' });
}
