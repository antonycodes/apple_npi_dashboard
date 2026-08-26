/**
 * useSharedSettingsSync — mỗi máy tự kéo cấu hình Lark dùng chung từ worker và
 * áp dụng, để admin đổi 1 lần là cả 38 máy đổi theo (xem `appConfigApi.ts`).
 *
 * Gọi 1 lần ở `App.tsx` nên MỌI màn hình đều theo: dashboard điều phối, màn
 * hình STT, và điện thoại nhân viên.
 *
 * Mỗi lần tải trang sẽ bootstrap lại từ KV; trong phiên chỉ bỏ qua bản KV đã
 * áp để tránh render lặp. Không có bản cấu hình riêng của máy con.
 *
 * Lỗi mạng/Worker chưa deploy/mất mạng: im lặng bỏ qua, thử lại vòng sau. Đây là
 * đường phụ trợ, không được phép làm hỏng màn hình đang chạy.
 */
import { useEffect } from 'react';
import { larkSettingsStore, type LarkSettings } from '@/config/larkSettings';
import { DEFAULT_API_URL, LEGACY_API_URL, LEGACY_PUBLIC_API_URL } from '@/config/larkConfig';
import { fetchSharedSettings } from '@/services/appConfigApi';

const SYNC_MS = 5_000;
let appliedUpdatedAt = '';

function lastApplied(): string {
  return appliedUpdatedAt;
}

function markApplied(updatedAt: string) {
  appliedUpdatedAt = updatedAt;
}

export function useSharedSettingsSync(): void {
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function sync() {
      try {
        const env = await fetchSharedSettings(controller.signal);
        if (cancelled || !env?.settings || !env.updatedAt) return;
        const current = larkSettingsStore.getSnapshot();
        // CHỈ áp khi bản trên KV THAY ĐỔI so với lần đã áp.
        //
        // Trước đây còn một vế nữa: "hoặc khi máy khác KV thì cũng áp lại",
        // với ý định kéo máy bị chỉnh tay về đúng bản Live. Nhưng nó khiến
        // trang Cài đặt KHÔNG SỬA ĐƯỢC MẤY Ô DÙNG CHUNG (bug thật user báo
        // 2026-08-12: đổi Webhook sang `/record` thì 5 giây sau tự về
        // `/webhook2`) — admin gõ xong là vòng sync kế tiếp ghi đè, muốn lưu
        // phải thắng cuộc đua 5 giây.
        //
        // Ý định cũ vẫn còn nguyên: `appliedUpdatedAt` là biến module, reset
        // mỗi lần tải trang, nên lần sync ĐẦU TIÊN của mỗi phiên vẫn luôn áp
        // bản KV — máy bị chỉnh tay tự về đúng sau khi reload.
        if (env.updatedAt === lastApplied()) return;

        const incomingFields = (env.settings.fields ?? {}) as Partial<LarkSettings['fields']>;
        const mergedFields = {
          ...current.fields,
          ...incomingFields,
          checkin: { ...current.fields.checkin, ...(incomingFields.checkin ?? {}) },
          master: { ...current.fields.master, ...(incomingFields.master ?? {}) },
          dispatch: {
            ...current.fields.dispatch,
            ...(incomingFields.dispatch ?? {}),
            deskField: {
              ...current.fields.dispatch.deskField,
              ...(incomingFields.dispatch?.deskField ?? {}),
            },
          },
          dsMaster: {
            ...current.fields.dsMaster,
            ...(incomingFields.dsMaster ?? {}),
            staffId: String(incomingFields.dsMaster?.staffId ?? current.fields.dsMaster.staffId ?? '').trim() || 'MSNV',
            staffUsername: String(incomingFields.dsMaster?.staffUsername ?? current.fields.dsMaster.staffUsername ?? '').trim() || 'Username',
          },
        };

        const incomingApiUrl = env.settings.apiUrl?.trim() || '';
        const apiUrl = incomingApiUrl === LEGACY_API_URL || incomingApiUrl === LEGACY_PUBLIC_API_URL
          ? DEFAULT_API_URL
          : incomingApiUrl || current.apiUrl;
        const migrateEndpoint = (value: string, fallback: string) => {
          const trimmed = value.trim();
          if (!trimmed) return fallback;
          const legacyPrefix = trimmed.startsWith(LEGACY_API_URL)
            ? LEGACY_API_URL
            : trimmed.startsWith(LEGACY_PUBLIC_API_URL)
              ? LEGACY_PUBLIC_API_URL
              : '';
          return legacyPrefix
            ? `${DEFAULT_API_URL}${trimmed.slice(legacyPrefix.length)}`
            : trimmed;
        };

        larkSettingsStore.save({
          ...current,
          // Không kéo Mock từ KV nữa. Mock chỉ có hiệu lực trên /#/mock.
          sleepMode: Boolean(env.settings.sleepMode),
          guestLock: Boolean(env.settings.guestLock),
          apiUrl,
          dispatchWebhookUrl: migrateEndpoint(env.settings.dispatchWebhookUrl, current.dispatchWebhookUrl),
          staffActionWebhookUrl: migrateEndpoint(env.settings.staffActionWebhookUrl, current.staffActionWebhookUrl),
          leadtimeMinutes: {
            ...current.leadtimeMinutes,
            ...(env.settings.leadtimeMinutes ?? {}),
          },
          fields: mergedFields,
        });
        markApplied(env.updatedAt);
      } catch {
        // Chưa cấu hình API URL, worker chưa deploy, mất mạng… — bỏ qua.
      }
    }

    void sync();
    const timer = setInterval(() => void sync(), SYNC_MS);
    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(timer);
    };
  }, []);

}
