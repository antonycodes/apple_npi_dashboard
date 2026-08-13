import http from 'k6/http';
import { check, fail, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const baseUrl = (__ENV.BASE_URL || 'https://vhws-lark-proxy.eventnpi2026.workers.dev').replace(/\/+$/, '');
const runId = __ENV.RUN_ID || `EVENT-10M-MEDIA-${Date.now()}`;
const allowLiveWrites = (__ENV.ALLOW_LIVE_WRITES || '').toLowerCase() === 'true';
// Bắt buộc truyền IMAGE_PATH: mặc định cũ trỏ vào thư mục riêng của một máy,
// ai clone repo về chạy cũng gãy với lỗi "file not found" khó hiểu.
const imagePath = __ENV.IMAGE_PATH;
if (!imagePath) fail('Cần --env IMAGE_PATH=<đường dẫn ảnh mẫu để upload>');
const imageBytes = open(imagePath, 'b');
const customers = JSON.parse(__ENV.TEST_CUSTOMERS || '[]');
const durationSec = Number(__ENV.DURATION_SEC || 600);

const WAVES = [
  { id: 'W20', size: 20, startSec: 0, customerOffset: 0 },
  { id: 'W15', size: 15, startSec: 150, customerOffset: 20 },
  { id: 'W10', size: 10, startSec: 300, customerOffset: 35 },
  { id: 'W05', size: 5, startSec: 450, customerOffset: 45 },
];

const CASES = [
  { id: 'C01', label: 'Không thu cũ · Không Backup', stages: ['Tư vấn'] },
  { id: 'C02', label: 'Có thu cũ · Không Backup', stages: ['Tư vấn', 'Thu cũ'], thuLaiMay: 'Thu máy ngay' },
  { id: 'C03', label: 'Không thu cũ · Có Backup', stages: ['Tư vấn', 'Backup'] },
  { id: 'C04', label: 'Có thu cũ · Có Backup', stages: ['Tư vấn', 'Thu cũ', 'Backup'], thuLaiMay: 'Thu máy ngay' },
  { id: 'C05', label: 'Thu máy sau rồi thu lại', stages: ['Tư vấn', 'Thu cũ', 'Thu cũ'], thuLaiMay: 'Thu máy sau', retryTradeIn: true },
  { id: 'C06', label: 'Thu máy sau → Backup', stages: ['Tư vấn', 'Thu cũ', 'Backup'], thuLaiMay: 'Thu máy sau', backupCollects: true },
  { id: 'C07', label: 'Thu máy ngay → Backup', stages: ['Tư vấn', 'Thu cũ', 'Backup'], thuLaiMay: 'Thu máy ngay' },
  { id: 'C08', label: 'Backup chốt máy', stages: ['Tư vấn', 'Thu cũ', 'Backup'], thuLaiMay: 'Thu máy sau', backupCollects: true },
  { id: 'C09', label: 'Recheck Không Backup', stages: ['Tư vấn'], recheckBackup: 'Không' },
  { id: 'C10', label: 'Recheck Có Backup', stages: ['Tư vấn', 'Backup'], recheckBackup: 'Có' },
];

if (!allowLiveWrites) fail('Live media test cần ALLOW_LIVE_WRITES=true');
if (customers.length < 42) fail('TEST_CUSTOMERS cần ít nhất 42 khách đã Check-in');
if (durationSec < 600) fail('DURATION_SEC phải ít nhất 600 giây');

const uploadRequests = new Counter('media_upload_requests');
const uploadErrors = new Rate('media_upload_errors');
const uploadLatency = new Trend('media_upload_latency', true);
const writeRequests = new Counter('journey_write_requests');
const writeErrors = new Rate('journey_write_errors');
const writeLatency = new Trend('journey_write_latency', true);
const completedCustomers = new Counter('journey_customers_completed');
const completedStages = new Counter('journey_stages_completed');

export const options = {
  scenarios: {
    ten_minute_event: { executor: 'shared-iterations', vus: 1, iterations: 1, maxDuration: '12m' },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    media_upload_errors: ['rate<0.01'],
    journey_write_errors: ['rate<0.01'],
    media_upload_latency: ['p(95)<15000'],
    journey_write_latency: ['p(95)<15000'],
  },
  tags: { loadtest: runId, scenario: 'event-10m-media-live' },
};

function sleepUntil(timestampMs) {
  const seconds = (timestampMs - Date.now()) / 1000;
  if (seconds > 0) sleep(seconds);
}

function parseJson(response) {
  try { return response.json(); } catch { return null; }
}

function analyzeResponses(responses, metricBase, commonTags) {
  return responses.map((response, index) => {
    const body = parseJson(response);
    const ok = check(response, {
      [`${metricBase} HTTP 2xx`]: (r) => r.status >= 200 && r.status < 300,
      [`${metricBase} application code 0`]: () => body?.code === 0,
    });
    const tags = { ...commonTags, slot: String(index + 1) };
    if (metricBase === 'upload') {
      uploadRequests.add(1, tags);
      uploadErrors.add(!ok, tags);
      uploadLatency.add(response.timings.duration, tags);
    } else {
      writeRequests.add(1, tags);
      writeErrors.add(!ok, tags);
      writeLatency.add(response.timings.duration, tags);
    }
    if (!ok) console.log(`${metricBase} failed wave=${commonTags.wave} slot=${index + 1} HTTP=${response.status} body=${String(response.body).slice(0, 300)}`);
    return { ok, body, response };
  });
}

function batchPost(endpoint, payloads, commonTags) {
  const requests = payloads.map((payload, index) => ({
    method: 'POST',
    url: `${baseUrl}/${endpoint}`,
    body: JSON.stringify(payload),
    params: {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint, ...commonTags, slot: String(index + 1) },
    },
  }));
  return analyzeResponses(http.batch(requests), endpoint, commonTags);
}

function uploadImages(instances, wave) {
  const requests = instances.map((instance) => ({
    method: 'POST',
    url: `${baseUrl}/upload`,
    body: { file: http.file(imageBytes, `${runId}-${wave.id}-STT-${instance.customer.stt}.jpeg`, 'image/jpeg') },
    params: { tags: { endpoint: 'upload', wave: wave.id, burst: String(wave.size), case: instance.journey.id } },
  }));
  const results = analyzeResponses(http.batch(requests), 'upload', { wave: wave.id, burst: String(wave.size), action: 'upload' });
  return results.map((result) => result.ok ? result.body?.data?.fileToken ?? null : null);
}

function kindFor(stage) {
  return stage === 'Thu cũ' || stage === 'Backup' ? stage : 'Tư vấn';
}

function deskFor(kind, slot, stageIndex) {
  if (kind === 'Tư vấn') return `TV${(slot % 18) + 1}`;
  if (kind === 'Thu cũ') return `TC${((slot + stageIndex) % 10) + 1}`;
  return `BK${((slot + stageIndex) % 8) + 1}`;
}

function completionFields(instance, kind, stageIndex) {
  const extra = {};
  if (kind !== 'Backup') {
    extra.checkBackup = instance.journey.recheckBackup || (instance.journey.stages.includes('Backup') ? 'Có' : 'Không');
  }
  if (kind === 'Thu cũ' || kind === 'Backup') {
    const sampleNo = String((instance.sequence * 10 + stageIndex) % 10000).padStart(4, '0');
    extra.thuLaiMay = kind === 'Backup' || instance.journey.backupCollects
      ? 'Thu máy ngay'
      : (instance.journey.retryTradeIn && stageIndex === 2 ? 'Thu máy ngay' : instance.journey.thuLaiMay || 'Thu máy ngay');
    extra.scanQr = `QR-SAMPLE-${runId}-${instance.customer.stt}-${stageIndex + 1}`;
    extra.imei = `35693803564${sampleNo}`;
    if (instance.fileToken) extra.hinhNghiemThu = [instance.fileToken];
  }
  return extra;
}

function dispatchPayload(instance, kind, desk) {
  const dp = (instance.slot % 4) + 1;
  return {
    stt: String(instance.customer.stt), hoTen: instance.customer.hoTen,
    phanLoai: kind, maBan: desk, nhanSu: `${runId}-${desk}`,
    msnv: `LOAD-${desk}`, submitBy: `LOAD-DP${dp}`,
    dieuPhoiId: `LOAD-DP${dp}`, dieuPhoiTen: `${runId}-DP${dp}`,
    dieuPhoiViTri: 'k6-event-10m-media-live', thoiGian: new Date().toISOString(),
  };
}

function staffPayload(instance, kind, desk, action, stageIndex) {
  return {
    action, trangThai: action === 'tiep_nhan' ? 'Tiếp nhận' : 'Hoàn tất',
    stt: String(instance.customer.stt), hoTen: instance.customer.hoTen,
    maBan: desk, msnv: `LOAD-${desk}`, phanLoai: kind,
    nhanSu: `${runId}-${desk}`, submitBy: `LOAD-${desk}`,
    thoiGian: new Date().toISOString(),
    ...(action === 'hoan_tat' ? completionFields(instance, kind, stageIndex) : {}),
  };
}

function processStage(instances, wave, stageIndex) {
  const active = instances.filter((instance) => stageIndex < instance.journey.stages.length);
  if (!active.length) return;
  const stageRows = active.map((instance) => {
    const kind = kindFor(instance.journey.stages[stageIndex]);
    return { instance, kind, desk: deskFor(kind, instance.slot, stageIndex) };
  });
  const tags = { wave: wave.id, burst: String(wave.size), stage: String(stageIndex + 1) };

  batchPost('webhook', stageRows.map(({ instance, kind, desk }) => dispatchPayload(instance, kind, desk)), { ...tags, action: 'dispatch' });
  sleep(5);
  batchPost('record', stageRows.map(({ instance, kind, desk }) => staffPayload(instance, kind, desk, 'tiep_nhan', stageIndex)), { ...tags, action: 'tiep_nhan' });
  sleep(20);
  batchPost('record', stageRows.map(({ instance, kind, desk }) => staffPayload(instance, kind, desk, 'hoan_tat', stageIndex)), { ...tags, action: 'hoan_tat' });

  active.forEach((instance) => completedStages.add(1, { wave: wave.id, case: instance.journey.id }));
  if (stageIndex < 2) sleep(5);
}

function instancesForWave(wave) {
  return Array.from({ length: wave.size }, (_, slot) => ({
    slot,
    sequence: wave.customerOffset + slot,
    customer: customers[(wave.customerOffset + slot) % customers.length],
    journey: CASES[slot % CASES.length],
    fileToken: null,
  }));
}

export function setup() {
  const health = http.get(`${baseUrl}/health`, { tags: { endpoint: 'health', action: 'precondition' } });
  if (!check(health, { 'production Worker health is 200': (r) => r.status === 200 })) fail(`Health failed: HTTP ${health.status}`);
  const fields = http.get(`${baseUrl}/fields`, { tags: { endpoint: 'fields', action: 'precondition' } });
  if (!check(fields, { 'record field mapping is 200': (r) => r.status === 200 && parseJson(r)?.code === 0 })) fail(`Fields failed: HTTP ${fields.status}`);
  const fieldsBody = parseJson(fields);
  const required = ['hinhNghiemThu', 'scanQr', 'imei'];
  const badMapping = (fieldsBody?.data?.mapping ?? []).filter((row) => required.includes(row.key) && !row.ok);
  if (badMapping.length) fail(`Field ảnh/QR/IMEI chưa map được: ${JSON.stringify(badMapping)}`);
  const checkin = http.get(`${baseUrl}/checkin?loadtest=${encodeURIComponent(runId)}`, { tags: { endpoint: 'checkin', action: 'precondition' } });
  if (!check(checkin, { 'checkin is 200': (r) => r.status === 200 })) fail(`Check-in failed: HTTP ${checkin.status}`);
  const missing = customers.filter((customer) => !checkin.body.includes(String(customer.stt)) || !checkin.body.includes(customer.hoTen));
  if (missing.length) fail(`Thiếu khách Check-in: ${missing.map((c) => `${c.stt}/${c.hoTen}`).join(', ')}`);
  return { startedAt: Date.now() };
}

export default function (data) {
  for (const wave of WAVES) {
    sleepUntil(data.startedAt + wave.startSec * 1000);
    const instances = instancesForWave(wave);
    const tokens = uploadImages(instances, wave);
    instances.forEach((instance, index) => { instance.fileToken = tokens[index]; });
    sleep(3);
    processStage(instances, wave, 0);
    processStage(instances, wave, 1);
    processStage(instances, wave, 2);
    instances.forEach((instance) => completedCustomers.add(1, { wave: wave.id, case: instance.journey.id }));
  }
  sleepUntil(data.startedAt + durationSec * 1000);
}
