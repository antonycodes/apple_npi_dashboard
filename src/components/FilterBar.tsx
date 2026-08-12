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
}

export default function FilterBar({
  endFlowCount,
  endFlowOpen,
  onToggleEndFlow,
  dispatchFormOpen,
  onToggleDispatchForm,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip active={endFlowOpen} onClick={onToggleEndFlow}>
        End Flow{endFlowCount > 0 ? ` (${endFlowCount})` : ''}
      </Chip>
      <Chip active={dispatchFormOpen} onClick={onToggleDispatchForm}>
        Điều phối
      </Chip>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
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
        active
          ? 'border-brand bg-brand text-white shadow-sm'
          : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
