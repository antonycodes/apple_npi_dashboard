import { useState } from 'react';

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
}

export interface OvertimeDesk {
  id: string;
  label: string;
  stt: string | null;
  elapsed: string;
  overdue: boolean;
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
}: FilterBarProps) {
  const [overtimeOpen, setOvertimeOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <button
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
          <div className="absolute left-0 top-full z-30 mt-2 min-w-64 rounded-xl border border-neutral-200 bg-white p-2 shadow-lg">
            <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wide text-neutral-400">
              BÀN GẦN VƯỢT LEADTIME
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
                  <span className="font-bold text-neutral-800">
                    {desk.label}{desk.stt ? ` · STT ${desk.stt}` : ''}
                  </span>
                  <span className={desk.overdue ? 'font-mono font-bold text-red-700' : 'font-mono font-bold text-amber-700'}>
                    {desk.elapsed}
                  </span>
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
