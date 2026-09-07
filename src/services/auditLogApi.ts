import { adminSessionStore } from '@/config/adminSession';
import { workerBaseUrl } from './adminApi';

export type AuditEvent = {
  action: string;
  stage?: string;
  deskCode?: string;
  msnv?: string;
  staffName?: string;
  stt?: string;
  customerName?: string;
  result?: 'success' | 'error' | 'cancelled';
  detail?: string;
};

export type AuditLogItem = AuditEvent & {
  id: string;
  site: string;
  event_at: string;
  route: string;
  actor_role: string;
};

/** Ghi audit không được làm gián đoạn thao tác chính của nhân sự. */
export function recordAuditEvent(event: AuditEvent): void {
  const token = adminSessionStore.getSnapshot();
  if (!token) return;
  void fetch(`${workerBaseUrl()}/audit/log`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...event, eventAt: new Date().toISOString(), route: window.location.pathname }),
    keepalive: true,
  }).catch(() => undefined);
}

export async function fetchAuditLogs(filters: {
  from?: string;
  to?: string;
  stage?: string;
  desk?: string;
}): Promise<AuditLogItem[]> {
  const token = adminSessionStore.getSnapshot();
  if (!token) throw new Error('Phiên admin đã hết hạn — đăng nhập lại.');
  const params = new URLSearchParams({ limit: '20000' });
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  const response = await fetch(`${workerBaseUrl()}/audit/logs?${params}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  const body = await response.json() as { code: number; msg?: string; data?: { items?: AuditLogItem[] } };
  if (!response.ok || body.code !== 0) throw new Error(body.msg || `HTTP ${response.status}`);
  return body.data?.items ?? [];
}

export function downloadAuditLogExcel(rows: AuditLogItem[], fileName: string): void {
  const headers = ['Thời gian app', 'Phân loại', 'Vị trí', 'MSNV', 'Nhân sự', 'STT', 'Khách hàng', 'Hành động', 'Kết quả', 'Chi tiết', 'Vai trò', 'Route', 'Site'];
  const escape = (value: unknown) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const body = rows.map((item) => [item.event_at, item.stage, item.deskCode, item.msnv, item.staffName, item.stt, item.customerName, item.action, item.result, item.detail, item.actor_role, item.route, item.site]);
  const html = `<html><head><meta charset="UTF-8"></head><body><table><tr>${headers.map((item) => `<th>${escape(item)}</th>`).join('')}</tr>${body.map((cells) => `<tr>${cells.map((cell) => `<td>${escape(cell)}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
  const blob = new Blob([`\ufeff${html}`], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
