import { workerBaseUrl } from './adminApi';

const TOKEN_PREFIX = 'guest-r2:';

export function isGuestMediaToken(token: string): boolean {
  return token.startsWith(TOKEN_PREFIX);
}

export function guestMediaUrl(token: string): string | null {
  if (!isGuestMediaToken(token)) return null;
  const parts = token.split(':');
  if (parts.length !== 3 || !parts[1] || !parts[2]) return null;
  return `${workerBaseUrl()}/guest-room/${encodeURIComponent(parts[1])}/media/${encodeURIComponent(parts[2])}`;
}

export async function uploadGuestImage(roomCode: string, file: File): Promise<{ fileToken: string; name: string }> {
  const form = new FormData();
  form.append('file', file, file.name || 'guest-image');
  const response = await fetch(`${workerBaseUrl()}/guest-room/${encodeURIComponent(roomCode)}/media`, {
    method: 'POST',
    body: form,
  });
  let body: { code?: number; msg?: string; data?: { fileToken?: string; name?: string } };
  try {
    body = await response.json();
  } catch {
    throw new Error(`Máy chủ trả về dữ liệu không hợp lệ (HTTP ${response.status})`);
  }
  if (!response.ok || body.code !== 0 || !body.data?.fileToken) {
    throw new Error(body.msg || `Upload ảnh thất bại (HTTP ${response.status})`);
  }
  return { fileToken: body.data.fileToken, name: body.data.name || file.name || 'Ảnh nghiệm thu' };
}
