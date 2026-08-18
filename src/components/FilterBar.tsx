/**
 * FilterBar — compact shortcut controls for the coordinator.
 */

interface FilterBarProps {
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

export default function FilterBar({
  endFlowCount,
  endFlowOpen,
  onToggleEndFlow,
  dispatchFormOpen,
  onToggleDispatchForm,
  pendingDeviceCount,
  pendingDeviceOpen,
  onTogglePendingDevice,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/*
        "Điều phối" đứng TRƯỚC "End Flow" và luôn tô đỏ: đây là thao tác chính
        trong ca (mở form ghi ra Lark), còn End Flow chỉ để tra cứu — nút phụ
        nên giữ dạng viền nhạt, chỉ tô đỏ khi đang mở.
      */}
      <Chip solid active={dispatchFormOpen} onClick={onToggleDispatchForm}>
        Điều phối
      </Chip>
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
