import { adminSessionStore } from '@/config/adminSession';
import { workerBaseUrl } from './adminApi';

export interface CheckinRecordPayload {
  stt: string;
  phone?: string;
  orderCode?: string;
  paymentConfirmation?: string;
  oldDeviceQuantity: number;
}

async function parseResponse(response: Response): Promise<{ data?: unknown; msg?: string }> {
  let body: { code?: number; data?: unknown; msg?: string };
  try {
    body = await response.json();
  } catch {
    throw new Error(`Máy chủ trả về dữ liệu không hợp lệ (HTTP ${response.status})`);
  }
  if (!response.ok || body.code !== 0) throw new Error(body.msg || `HTTP ${response.status}`);
  return body;
}

export async function submitCheckinRecord(payload: CheckinRecordPayload) {
  const token = adminSessionStore.getSnapshot();
  if (!token) throw new Error('Phiên Check-in đã hết hạn. Đăng nhập lại.');
  const response = await fetch(`${workerBaseUrl()}/checkin-record`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const body = await parseResponse(response);
  return body.data as { recordId?: string | null; stt: string; written: string[]; skipped: string[] };
}
