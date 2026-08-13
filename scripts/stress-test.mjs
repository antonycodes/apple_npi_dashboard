#!/usr/bin/env node

/**
 * NPI Event load runner.
 *
 * Read mode exercises the Worker proxy and the same five table reads used by
 * the dashboard. Write mode exercises the fixed dispatch/staff webhook routes
 * with synthetic records. It is deliberately opt-in because write mode can
 * create records in Lark.
 */

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const value = process.argv[i];
  if (!value.startsWith('--')) continue;
  const [key, inline] = value.slice(2).split('=', 2);
  if (inline !== undefined) args.set(key, inline);
  else if (process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) args.set(key, process.argv[++i]);
  else args.set(key, 'true');
}

const get = (key, fallback) => args.has(key) ? args.get(key) : fallback;
const int = (key, fallback) => {
  const n = Number(get(key, fallback));
  if (!Number.isFinite(n) || n < 0) throw new Error(`--${key} phải là số không âm`);
  return Math.floor(n);
};

const mode = String(get('mode', 'read')).toLowerCase();
const baseUrl = String(get('base-url', 'https://vhws-lark-proxy.eventnpi2026.workers.dev')).replace(/\/+$/, '');
const durationSec = int('duration', 300);
const concurrency = int('concurrency', mode === 'read' ? 30 : 24);
const intervalMs = int('interval-ms', mode === 'read' ? 5000 : 1000);
const timeoutMs = int('timeout-ms', 15000);
const rampSec = int('ramp-sec', 20);
const dispatchUrl = String(get('dispatch-url', `${baseUrl}/webhook`));
const staffUrl = String(get('staff-url', `${baseUrl}/webhook2`));
const allowLiveWrites = args.get('allow-live-writes') === 'true';
const runId = String(get('run-id', `LOADTEST-${new Date().toISOString().replace(/[-:.TZ]/g, '')}`));

if (!['read', 'write'].includes(mode)) throw new Error('--mode chỉ nhận read hoặc write');
if (!durationSec) throw new Error('--duration phải lớn hơn 0');
if (!concurrency) throw new Error('--concurrency phải lớn hơn 0');
if (mode === 'write' && !allowLiveWrites) {
  throw new Error('Write mode có thể tạo record Lark. Thêm --allow-live-writes để xác nhận rõ ràng.');
}

const counters = { total: 0, ok: 0, failed: 0, timedOut: 0 };
const latencies = [];
const errors = new Map();
const startedAt = Date.now();
const deadline = startedAt + durationSec * 1000;
let stop = false;

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function recordError(label, message) {
  const key = `${label}: ${message}`.slice(0, 240);
  errors.set(key, (errors.get(key) || 0) + 1);
}

async function request(label, url, init = {}) {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  counters.total += 1;
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const latency = Math.round(performance.now() - started);
    latencies.push(latency);
    if (!response.ok) {
      const body = (await response.text()).replace(/\s+/g, ' ').slice(0, 180);
      counters.failed += 1;
      recordError(label, `HTTP ${response.status}${body ? ` ${body}` : ''}`);
      return false;
    }
    counters.ok += 1;
    return true;
  } catch (error) {
    counters.failed += 1;
    if (error?.name === 'AbortError') counters.timedOut += 1;
    recordError(label, error?.name === 'AbortError' ? 'timeout' : String(error?.message || error));
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function jsonInit(payload) {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  };
}

function syntheticFlow(worker, index) {
  const n = `${runId}-${String(worker).padStart(2, '0')}-${String(index).padStart(5, '0')}`;
  const numericStt = String(900000 + worker * 10000 + index);
  const kind = worker % 3 === 0 ? 'Thu cũ' : worker % 3 === 1 ? 'Backup' : 'Tư vấn';
  const prefix = kind === 'Thu cũ' ? 'TC' : kind === 'Backup' ? 'BK' : 'TV';
  const desk = `${prefix}${(worker % 10) + 1}`;
  const common = {
    stt: numericStt,
    hoTen: `${n} TEST ONLY`,
    maBan: desk,
    msnv: `LOAD-${worker}`,
    nhanSu: `${n} synthetic load`,
    submitBy: `LOAD-${worker}`,
    phanLoai: kind,
    thoiGian: new Date().toISOString(),
  };
  return { n, numericStt, kind, desk, common };
}

async function runReadWorker(worker) {
  const tables = ['checkin', 'orders', 'master', 'dispatch', 'dsMaster'];
  if (rampSec) await sleep(Math.round(((worker - 1) / Math.max(1, concurrency)) * rampSec * 1000));
  let sequence = 0;
  while (!stop && Date.now() < deadline) {
    const round = sequence++;
    await Promise.all(tables.map((table) => request(`read:${table}`, `${baseUrl}/${table}?loadtest=${encodeURIComponent(runId)}&round=${round}`)));
    await sleep(intervalMs);
  }
}

async function runWriteWorker(worker) {
  if (rampSec) await sleep(Math.round(((worker - 1) / Math.max(1, concurrency)) * rampSec * 1000));
  let sequence = 0;
  while (!stop && Date.now() < deadline) {
    const flow = syntheticFlow(worker, sequence++);
    const dispatchPayload = {
      ...flow.common,
      dieuPhoiId: `LOAD-${worker}`,
      dieuPhoiTen: `${runId} điều phối giả lập`,
      dieuPhoiViTri: 'stress-test',
    };
    const staffBase = { action: 'tiep_nhan', trangThai: 'Tiếp nhận', ...flow.common };

    // A dispatch wave and a receive wave are simultaneous across workers.
    await Promise.all([
      request('write:dispatch', dispatchUrl, jsonInit(dispatchPayload)),
      request('write:receive', staffUrl, jsonInit(staffBase)),
    ]);
    await sleep(Math.min(1500, Math.max(250, intervalMs)));
    await request('write:complete', staffUrl, jsonInit({
      ...flow.common,
      action: 'hoan_tat',
      trangThai: 'Hoàn tất',
      checkBackup: flow.kind === 'Backup' ? undefined : 'Không',
    }));
    await sleep(intervalMs);
  }
}

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}

async function main() {
  console.log(JSON.stringify({
    mode, baseUrl, durationSec, concurrency, intervalMs, timeoutMs, rampSec,
    dispatchUrl: mode === 'write' ? dispatchUrl : undefined,
    staffUrl: mode === 'write' ? staffUrl : undefined,
    runId,
    warning: mode === 'write' ? 'LIVE WRITE ENABLED: synthetic Lark records may be created.' : 'read-only',
  }, null, 2));

  const healthOk = await request('health', `${baseUrl}/health?loadtest=${encodeURIComponent(runId)}`);
  if (!healthOk) throw new Error('Health check thất bại, dừng trước khi tạo tải.');

  const workers = Array.from({ length: concurrency }, (_, index) =>
    mode === 'read' ? runReadWorker(index + 1) : runWriteWorker(index + 1),
  );
  const progress = setInterval(() => {
    const elapsed = Math.round((Date.now() - startedAt) / 1000);
    console.log(JSON.stringify({ event: 'progress', elapsedSec: elapsed, ...counters }));
  }, 10000);
  await Promise.all(workers);
  stop = true;
  clearInterval(progress);

  const elapsedSec = Math.max(1, (Date.now() - startedAt) / 1000);
  const result = {
    event: 'complete', mode, runId, elapsedSec: Number(elapsedSec.toFixed(1)),
    ...counters,
    requestsPerSec: Number((counters.total / elapsedSec).toFixed(2)),
    latencyMs: { p50: percentile(latencies, 50), p95: percentile(latencies, 95), p99: percentile(latencies, 99), max: latencies.length ? Math.max(...latencies) : null },
    topErrors: [...errors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([message, count]) => ({ count, message })),
  };
  console.log(JSON.stringify(result, null, 2));
  if (counters.failed > 0) process.exitCode = 2;
}

main().catch((error) => {
  console.error(`stress-test: ${error.message}`);
  process.exitCode = 1;
});
