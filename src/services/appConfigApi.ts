/**
 * appConfigApi — cấu hình Lark DÙNG CHUNG giữa mọi máy (`/config/app` trên
 * worker, lưu trong KV).
 *
 * Vấn đề nó giải: cấu hình vốn nằm trong `localStorage` TỪNG MÁY, nên admin bật
 * "Lark Base (live)" ở máy mình thì 38 điện thoại nhân viên vẫn chạy dữ liệu
 * mẫu. Giờ admin bấm "Đẩy cho mọi máy" 1 lần, các máy tự đọc lại mỗi 5 giây và
 * áp dụng (xem `hooks/useSharedSettingsSync.ts`).
 *
 * Cùng khuôn với `adminApi.ts`: ĐỌC công khai (máy NV không phải đăng nhập),
 * GHI bắt buộc Bearer token admin — worker mới là chỗ chặn thật.
 *
 * **Gà–trứng**: muốn đọc `/config/app` thì máy phải biết URL worker. Nguồn:
 * `VITE_LARK_API_URL` lúc build (khuyến nghị — mọi máy mở lên là live), hoặc
 * tham số `?api=` trong link riêng từng bàn (xem `config/staffLink.ts`).
 */
import { adminSessionStore } from '@/config/adminSession';
import type { LarkSettings } from '@/config/larkSettings';
import { DEFAULT_API_URL } from '@/config/larkConfig';
import { workerBaseUrl } from './adminApi';

/**
 * URL công khai của Worker mà mọi máy nhân viên có thể dùng để bootstrap.
 * Nếu máy chưa từng nhận link `?api=...` thì vẫn gọi được `/config/app` và
 * nhận cấu hình Live Base do admin đã đẩy lên KV.
 */
const PUBLIC_WORKER_URL = DEFAULT_API_URL;

function sharedConfigWorkerUrl(): string {
  try {
    return workerBaseUrl();
  } catch {
    return PUBLIC_WORKER_URL;
  }
}

/** Đúng phần cấu hình được chia sẻ — KHÔNG gồm thứ riêng của từng máy (bàn/điều phối viên của máy). */
export interface SharedSettings {
  useMock: boolean;
  sleepMode: boolean;
  apiUrl: string;
  dispatchWebhookUrl: string;
  staffActionWebhookUrl: string;
  leadtimeMinutes: LarkSettings['leadtimeMinutes'];
  fields: LarkSettings['fields'] | null;
}

export interface SharedSettingsEnvelope {
  settings: SharedSettings | null;
  /** ISO 8601 — mốc so sánh để biết máy đã áp bản này chưa. */
  updatedAt: string | null;
}

export interface SharedSleepEnvelope {
  sleepMode: boolean;
  updatedAt: string | null;
}

async function parse(res: Response): Promise<{ data?: unknown }> {
  let body: { code?: number; msg?: string; data?: unknown };
  try {
    body = await res.json();
  } catch {
    throw new Error(`Máy chủ trả về dữ liệu không hợp lệ (HTTP ${res.status})`);
  }
  if (!res.ok || body.code !== 0) throw new Error(body.msg || `HTTP ${res.status}`);
  return body;
}

/** Đọc công khai — mọi máy gọi được, không cần đăng nhập. */
export async function fetchSharedSettings(signal?: AbortSignal): Promise<SharedSettingsEnvelope> {
  const res = await fetch(`${sharedConfigWorkerUrl()}/config/app`, { signal });
  const body = await parse(res);
  return body.data as SharedSettingsEnvelope;
}

/** Đọc riêng trạng thái Sleep — dùng nhịp nhanh hơn cấu hình Lark đầy đủ. */
export async function fetchSharedSleep(signal?: AbortSignal): Promise<SharedSleepEnvelope> {
  const res = await fetch(`${sharedConfigWorkerUrl()}/config/app?mode=sleep`, {
    signal,
    cache: 'no-store',
  });
  const body = await parse(res);
  return body.data as SharedSleepEnvelope;
}

/** Ghi — bắt buộc token admin còn hạn. */
export async function pushSharedSettings(settings: SharedSettings): Promise<SharedSettingsEnvelope> {
  const token = adminSessionStore.getSnapshot();
  if (!token) throw new Error('Phiên đăng nhập đã hết hạn — đăng nhập lại.');
  const res = await fetch(`${workerBaseUrl()}/config/app`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ settings }),
  });
  const body = await parse(res);
  return body.data as SharedSettingsEnvelope;
}

/** Rút phần dùng chung ra khỏi settings đầy đủ của máy. */
export function toSharedSettings(s: LarkSettings): SharedSettings {
  return {
    // Giữ khóa cũ để Worker phiên bản cũ vẫn đọc được payload; Mock hiện
    // được kích hoạt bằng route /#/mock, không đồng bộ theo cấu hình nữa.
    useMock: false,
    sleepMode: s.sleepMode,
    apiUrl: s.apiUrl.trim(),
    dispatchWebhookUrl: s.dispatchWebhookUrl.trim(),
    staffActionWebhookUrl: s.staffActionWebhookUrl.trim(),
    leadtimeMinutes: s.leadtimeMinutes,
    fields: s.fields,
  };
}
