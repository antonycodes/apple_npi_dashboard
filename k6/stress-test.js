import http from 'k6/http';
import { check, fail, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const baseUrl = (__ENV.BASE_URL || 'https://vhws-lark-proxy.eventnpi2026.workers.dev').replace(/\/+$/, '');
const mode = (__ENV.MODE || 'read').toLowerCase();
const vus = Number(__ENV.VUS || 30);
const readVus = Number(__ENV.READ_VUS || Math.max(1, Math.round(vus * 0.7)));
const writeVus = Number(__ENV.WRITE_VUS || Math.max(1, vus - readVus));
const duration = __ENV.DURATION || '10m';
const rampSec = Number(__ENV.RAMP_SEC || 20);
const pollSec = Number(__ENV.POLL_SEC || 5);
const writeIntervalSec = Number(__ENV.WRITE_INTERVAL_SEC || 1);
const runId = __ENV.RUN_ID || `LOADTEST-${Date.now()}`;
const allowLiveWrites = (__ENV.ALLOW_LIVE_WRITES || '').toLowerCase() === 'true';
const maxP95 = Number(__ENV.MAX_P95_MS || 15000);

if (!['read', 'write', 'mixed'].includes(mode)) fail('MODE must be read, write, or mixed');
if (mode === 'write' && !allowLiveWrites) fail('Write mode requires ALLOW_LIVE_WRITES=true');

const readRequests = new Counter('loadtest_read_requests');
const writeRequests = new Counter('loadtest_write_requests');
const applicationErrors = new Rate('loadtest_application_errors');
const readLatency = new Trend('loadtest_read_latency', true);
const writeLatency = new Trend('loadtest_write_latency', true);

function rampingScenario(exec, targetVus) {
  return {
    executor: 'ramping-vus',
    exec,
    startVUs: 0,
    stages: [
      { duration: `${rampSec}s`, target: targetVus },
      { duration, target: targetVus },
      { duration: `${rampSec}s`, target: 0 },
    ],
    gracefulRampDown: '10s',
  };
}

export const options = {
  scenarios: mode === 'mixed'
    ? { read: rampingScenario('readScenario', readVus), write: rampingScenario('writeScenario', writeVus) }
    : { main: rampingScenario(mode === 'read' ? 'readScenario' : 'writeScenario', vus) },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    loadtest_application_errors: ['rate<0.01'],
    loadtest_read_latency: [`p(95)<${maxP95}`],
    loadtest_write_latency: [`p(95)<${maxP95}`],
  },
  tags: { loadtest: runId, mode },
};

export function setup() {
  const response = http.get(`${baseUrl}/health`, { tags: { endpoint: 'health' } });
  if (!check(response, { 'health is HTTP 200': (r) => r.status === 200 })) {
    fail(`Health check failed: HTTP ${response.status}`);
  }
  return { startedAt: new Date().toISOString() };
}

const tables = ['checkin', 'orders', 'master', 'dispatch', 'dsMaster'];

function runReadScenario() {
  const started = Date.now();
  const responses = http.batch(tables.map((table) => ({
    method: 'GET',
    url: `${baseUrl}/${table}?loadtest=${encodeURIComponent(runId)}&vu=${__VU}&iter=${__ITER}`,
    params: { tags: { endpoint: `read:${table}` } },
  })));
  responses.forEach((response, index) => {
    readRequests.add(1, { endpoint: tables[index] });
    const ok = check(response, { [`read ${tables[index]} is 2xx`]: (r) => r.status >= 200 && r.status < 300 });
    applicationErrors.add(!ok, { endpoint: `read:${tables[index]}` });
    readLatency.add(response.timings.duration, { endpoint: tables[index] });
  });
  sleep(Math.max(0, pollSec - (Date.now() - started) / 1000));
}

function flowPayload(worker, iteration) {
  const sequence = `${runId}-${String(worker).padStart(2, '0')}-${String(iteration).padStart(5, '0')}`;
  const numericStt = String(900000 + worker * 10000 + iteration);
  const kind = worker % 3 === 0 ? 'Thu cũ' : worker % 3 === 1 ? 'Backup' : 'Tư vấn';
  const prefix = kind === 'Thu cũ' ? 'TC' : kind === 'Backup' ? 'BK' : 'TV';
  return {
    sequence,
    kind,
    common: {
      stt: numericStt,
      hoTen: `${sequence} TEST ONLY`,
      maBan: `${prefix}${(worker % 10) + 1}`,
      msnv: `LOAD-${worker}`,
      nhanSu: `${sequence} synthetic load`,
      submitBy: `LOAD-${worker}`,
      phanLoai: kind,
      thoiGian: new Date().toISOString(),
    },
  };
}

const jsonParams = { headers: { 'Content-Type': 'application/json' } };

function runWriteScenario() {
  const flow = flowPayload(__VU, __ITER);
  const dispatchPayload = {
    ...flow.common,
    dieuPhoiId: `LOAD-${__VU}`,
    dieuPhoiTen: `${runId} điều phối giả lập`,
    dieuPhoiViTri: 'stress-test',
  };
  const receivePayload = { ...flow.common, action: 'tiep_nhan', trangThai: 'Tiếp nhận' };
  const start = Date.now();
  const firstWave = http.batch([
    { method: 'POST', url: `${baseUrl}/webhook`, body: JSON.stringify(dispatchPayload), params: { ...jsonParams, tags: { endpoint: 'write:dispatch' } } },
    { method: 'POST', url: `${baseUrl}/webhook2`, body: JSON.stringify(receivePayload), params: { ...jsonParams, tags: { endpoint: 'write:receive' } } },
  ]);
  firstWave.forEach((response, index) => {
    const label = index === 0 ? 'dispatch' : 'receive';
    writeRequests.add(1, { endpoint: label });
    const ok = check(response, { [`write ${label} is 2xx`]: (r) => r.status >= 200 && r.status < 300 });
    applicationErrors.add(!ok, { endpoint: `write:${label}` });
    writeLatency.add(response.timings.duration, { endpoint: label });
  });

  sleep(Math.min(1.5, Math.max(0.25, writeIntervalSec)));
  const completeResponse = http.post(`${baseUrl}/webhook2`, JSON.stringify({
    ...flow.common,
    action: 'hoan_tat',
    trangThai: 'Hoàn tất',
    ...(flow.kind === 'Backup' ? {} : { checkBackup: 'Không' }),
  }), { ...jsonParams, tags: { endpoint: 'write:complete' } });
  writeRequests.add(1, { endpoint: 'complete' });
  const completeOk = check(completeResponse, { 'write complete is 2xx': (r) => r.status >= 200 && r.status < 300 });
  applicationErrors.add(!completeOk, { endpoint: 'write:complete' });
  writeLatency.add(completeResponse.timings.duration, { endpoint: 'complete' });
  sleep(Math.max(0, writeIntervalSec - (Date.now() - start) / 1000));
}

export function readScenario() { runReadScenario(); }
export function writeScenario() { runWriteScenario(); }
