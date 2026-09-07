import { useEffect, useRef } from 'react';
import type { DeskAlert } from '@/services/deskAlerts';

interface DeskAlertNotificationsProps {
  alerts: DeskAlert[];
  onDismiss: (alertId: string) => void;
}

function DeskAlertNotification({ alert, onDismiss }: { alert: DeskAlert; onDismiss: (alertId: string) => void }) {
  const startY = useRef<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(alert.id), 3000);
    return () => window.clearTimeout(timer);
  }, [alert.id, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      onPointerDown={(event) => {
        startY.current = event.clientY;
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }}
      onPointerUp={(event) => {
        const deltaY = (startY.current ?? event.clientY) - event.clientY;
        startY.current = null;
        if (deltaY > 32) onDismiss(alert.id);
      }}
      className="w-[min(22rem,calc(100vw-2rem))] touch-pan-y rounded-xl border border-amber-200 bg-white px-4 py-3 text-left shadow-[0_8px_24px_rgba(120,53,15,0.14)]"
    >
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-neutral-900">Bàn {alert.deskId} gọi điều phối hỗ trợ</p>
          {(alert.role || alert.stt) && (
            <p className="mt-1 truncate text-xs font-medium text-neutral-500">
              {[alert.role, alert.stt ? `STT ${alert.stt}` : ''].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <button
          type="button"
          aria-label={`Tắt thông báo bàn ${alert.deskId}`}
          onClick={() => onDismiss(alert.id)}
          className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded text-lg leading-none text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default function DeskAlertNotifications({ alerts, onDismiss }: DeskAlertNotificationsProps) {
  if (!alerts.length) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[60] flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2 md:right-6 md:top-6" aria-label="Thông báo gọi điều phối">
      {alerts.map((alert) => (
        <div key={alert.id} className="pointer-events-auto">
          <DeskAlertNotification alert={alert} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}
