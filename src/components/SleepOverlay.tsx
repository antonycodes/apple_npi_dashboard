import { useEffect, useState } from 'react';
import { useAdminInfo } from '@/config/adminSession';
import { useLarkSettings } from '@/config/larkSettings';
import { fetchSharedSleep } from '@/services/appConfigApi';

/** Khóa riêng các màn hình nhân viên khi Điều phối bật chế độ training. */
export default function SleepOverlay() {
  const settings = useLarkSettings();
  const session = useAdminInfo();
  const [locked, setLocked] = useState(() => settings.sleepMode);
  const exempt = session?.role === 'admin' || session?.msnv?.trim().toUpperCase() === 'S12196';

  // Lock có vòng đọc riêng, không phụ thuộc vào việc Dashboard đang bận đọc
  // 5 bảng Lark. Vì vậy sơ đồ nặng của Điều phối không làm chậm overlay.
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function sync() {
      try {
        const env = await fetchSharedSleep(controller.signal);
        if (!cancelled && env?.updatedAt) setLocked(Boolean(env.sleepMode));
      } catch {
        // Mất mạng không tự mở khóa màn hình; giữ trạng thái Lock hiện tại.
      }
    }

    void sync();
    const timer = setInterval(() => void sync(), 1_000);
    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(timer);
    };
  }, [settings.apiUrl]);

  if (!locked || exempt) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex min-h-dvh items-center justify-center bg-[#d40020]/85 px-6 text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Oops! Hệ thống đang gặp sự cố"
    >
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto flex h-52 w-52 items-center justify-center overflow-hidden rounded-[2.5rem]" aria-hidden="true">
          <img src="/system-issue-sticker.jpg" alt="" className="h-full w-full object-cover" />
        </div>
        <h1 className="mt-6 max-w-md text-xl font-black leading-tight tracking-tight">
          Oops! Hệ thống đang gặp sự cố
        </h1>
      </div>
    </div>
  );
}
