import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { DeskAlert } from '@/services/deskAlerts';
import { deskAlertStatus } from '@/services/deskAlerts';

/**
 * FilterBar — compact shortcut controls for the coordinator.
 */

interface FilterBarProps {
  /** Các bàn đã vào vùng cảnh báo leadtime (vàng hoặc đỏ). */
  overtimeDesks: OvertimeDesk[];
  onSelectOvertimeDesk: (deskId: string) => void;
  /** Phiên khách chỉ xem dashboard, không được mở form ghi Điều phối. */
  readOnly?: boolean;
  /** Số khách đã "End flow" — hiện badge trên nút. */
  endFlowCount: number;
  /** Bảng End Flow đang mở hay không (viền nổi bật khi mở). */
  endFlowOpen: boolean;
  onToggleEndFlow: () => void;
  /** Form Điều phối (ghi ra Lark qua webhook) đang mở hay không. */
  dispatchFormOpen: boolean;
  onToggleDispatchForm: () => void;
  /** Số khách còn máy cũ chưa thu — badge trên nút "Chờ thu máy". */
  pendingDeviceCount: number;
  pendingDeviceOpen: boolean;
  onTogglePendingDevice: () => void;
  supportAlerts: DeskAlert[];
  onSelectSupportDesk: (deskId: string) => void;
}

export interface OvertimeDesk {
  id: string;
  label: string;
  overdue: string;
}

export default function FilterBar({
  overtimeDesks,
  onSelectOvertimeDesk,
  readOnly = false,
  endFlowCount,
  endFlowOpen,
  onToggleEndFlow,
  dispatchFormOpen,
  onToggleDispatchForm,
  pendingDeviceCount,
  pendingDeviceOpen,
  onTogglePendingDevice,
  supportAlerts,
  onSelectSupportDesk,
}: FilterBarProps) {
  const [overtimeOpen, setOvertimeOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportFilter, setSupportFilter] = useState<'all' | 'pending' | 'acknowledged'>('all');
  const supportButtonRef = useRef<HTMLButtonElement>(null);
  const [supportPosition, setSupportPosition] = useState({ top: 0, left: 8 });
  const overtimeButtonRef = useRef<HTMLButtonElement>(null);
  const [overtimePosition, setOvertimePosition] = useState({ top: 0, left: 8 });

  useLayoutEffect(() => {
    if (!overtimeOpen) return;

    const updatePosition = () => {
      const button = overtimeButtonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const popupWidth = Math.min(416, window.innerWidth - 16);
      setOvertimePosition({
        top: rect.bottom + 8,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - popupWidth - 8)),
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [overtimeOpen]);

  useLayoutEffect(() => {
    if (!supportOpen) return;

    const updatePosition = () => {
      const button = supportButtonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const popupWidth = Math.min(416, window.innerWidth - 16);
      setSupportPosition({
        top: rect.bottom + 8,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - popupWidth - 8)),
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [supportOpen]);

  const latestSupportAlerts = useMemo(() => {
    const latest = new Map<string, DeskAlert>();
    [...supportAlerts]
      .sort((a, b) => b.createdAt - a.createdAt)
      .forEach((alert) => {
        if (!latest.has(alert.deskId)) latest.set(alert.deskId, alert);
      });
    return [...latest.values()];
  }, [supportAlerts]);
  const filteredSupportAlerts = latestSupportAlerts.filter((alert) => supportFilter === 'all' || deskAlertStatus(alert) === supportFilter);
  const pendingSupportCount = latestSupportAlerts.filter((alert) => deskAlertStatus(alert) === 'pending').length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <button
          ref={supportButtonRef}
          type="button"
          onClick={() => setSupportOpen((open) => !open)}
          aria-expanded={supportOpen}
          className={[
            'flex min-h-8 items-center rounded-full border px-3 text-xs font-semibold transition',
            pendingSupportCount > 0
              ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
              : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50',
          ].join(' ')}
        >
          Hỗ trợ{pendingSupportCount > 0 ? ` (${pendingSupportCount})` : ''}
        </button>
        {supportOpen && (
          <div
            className="fixed z-[70] w-[min(26rem,calc(100vw-1rem))] rounded-xl border border-neutral-200 bg-white p-2 shadow-lg"
            style={supportPosition}
          >
            <div className="flex items-center justify-between gap-3 px-2 pb-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">GỌI ĐIỀU PHỐI HỖ TRỢ</p>
              <div className="flex gap-1" role="group" aria-label="Lọc yêu cầu hỗ trợ">
                {([
                  ['all', 'Tất cả'],
                  ['pending', 'Chưa tiếp nhận'],
                  ['acknowledged', 'Đã tiếp nhận'],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSupportFilter(value)}
                    className={`rounded px-2 py-1 text-[10px] font-semibold ${supportFilter === value ? 'bg-neutral-800 text-white' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {filteredSupportAlerts.length > 0 ? (
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {filteredSupportAlerts.map((alert) => {
                  const acknowledged = deskAlertStatus(alert) === 'acknowledged';
                  const time = new Date(alert.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                  const detail = [
                    time,
                    alert.deskId,
                    alert.stt ? `STT ${alert.stt}` : '',
                    acknowledged ? (alert.acknowledgedBy || '') : '',
                    alert.callerMsnv || '',
                  ].filter(Boolean).join(' · ');
                  return (
                    <button
                      key={alert.id}
                      type="button"
                      onClick={() => {
                        onSelectSupportDesk(alert.deskId);
                        setSupportOpen(false);
                      }}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-xs transition hover:bg-neutral-50 ${acknowledged ? 'border-emerald-200 bg-emerald-50/70' : 'border-red-200 bg-red-50/70'}`}
                    >
                      <span className={`min-w-0 truncate font-mono font-semibold ${acknowledged ? 'text-emerald-800' : 'text-red-800'}`}>{detail}</span>
                      <span className={`shrink-0 text-[10px] font-bold ${acknowledged ? 'text-emerald-700' : 'text-red-700'}`}>
                        {acknowledged ? 'Đã tiếp nhận' : 'Chưa tiếp nhận'}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="px-2 py-3 text-sm text-neutral-500">Không có yêu cầu phù hợp.</p>
            )}
          </div>
        )}
      </div>
      <div className="relative">
        <button
          ref={overtimeButtonRef}
          type="button"
          onClick={() => setOvertimeOpen((open) => !open)}
          aria-expanded={overtimeOpen}
          className={[
            'flex min-h-8 items-center rounded-full border px-3 text-xs font-semibold transition',
            overtimeDesks.length > 0
              ? 'border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200'
              : 'border-neutral-300 bg-white text-neutral-500 hover:bg-neutral-50',
          ].join(' ')}
        >
          Overtime ({overtimeDesks.length})
        </button>
        {overtimeOpen && (
          <div
            className="fixed z-[70] w-[min(26rem,calc(100vw-1rem))] rounded-xl border border-neutral-200 bg-white p-2 shadow-lg"
            style={overtimePosition}
          >
            <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wide text-neutral-400">
              BÀN VƯỢT LEADTIME
            </p>
            {overtimeDesks.length > 0 ? (
              overtimeDesks.map((desk) => (
                <button
                  key={desk.id}
                  type="button"
                  onClick={() => {
                    onSelectOvertimeDesk(desk.id);
                    setOvertimeOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-4 rounded-lg px-2 py-2 text-left text-sm hover:bg-neutral-50"
                >
                  <span className="font-bold text-neutral-800">{desk.label}</span>
                  <span className="font-mono font-bold text-red-700">Vượt quá {desk.overdue}</span>
                </button>
              ))
            ) : (
              <p className="px-2 py-2 text-sm text-neutral-500">Chưa có bàn nào trong vùng cảnh báo.</p>
            )}
          </div>
        )}
      </div>
      {/*
        "Điều phối" đứng TRƯỚC "End Flow" và luôn tô đỏ: đây là thao tác chính
        trong ca (mở form ghi ra Lark), còn End Flow chỉ để tra cứu — nút phụ
        nên giữ dạng viền nhạt, chỉ tô đỏ khi đang mở.
      */}
      {!readOnly && (
        <Chip solid active={dispatchFormOpen} onClick={onToggleDispatchForm}>
          Điều phối
        </Chip>
      )}
      <Chip active={endFlowOpen} onClick={onToggleEndFlow}>
        End Flow{endFlowCount > 0 ? ` (${endFlowCount})` : ''}
      </Chip>
      {/* Ẩn hẳn khi không còn máy nào chờ: nút số 0 chỉ tổ làm điều phối bấm
          vào rồi thấy bảng rỗng. */}
      {pendingDeviceCount > 0 && (
        <Chip active={pendingDeviceOpen} onClick={onTogglePendingDevice}>
          Chờ thu máy ({pendingDeviceCount})
        </Chip>
      )}
    </div>
  );
}

function Chip({
  active,
  solid,
  onClick,
  children,
}: {
  active: boolean;
  /** Luôn tô đỏ (nút hành động chính), không chỉ khi `active`. */
  solid?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        // min-h-8 keeps the chips comfortably tappable on a tablet.
        'flex min-h-8 items-center rounded-full border px-3 text-xs font-medium transition',
        solid || active
          ? 'border-brand bg-brand text-white shadow-sm'
          : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50',
        // Nút đỏ cố định: vẫn phải thấy được trạng thái đang mở, nên dùng ring
        // thay cho đổi nền (đổi nền sẽ mất luôn màu đỏ user yêu cầu).
        solid && active ? 'ring-2 ring-brand ring-offset-1' : '',
        solid ? 'font-semibold hover:opacity-90' : '',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
