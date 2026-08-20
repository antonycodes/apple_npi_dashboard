/**
 * StaffDeskPicker — nhân viên chọn ĐÚNG bàn của mình 1 lần trên điện thoại.
 *
 * Lựa chọn lưu vào máy (`staffDeskIdentity`), nên lần sau mở app là vào thẳng
 * màn hình bàn đó. Danh sách lấy từ `ALL_POSITIONS` — cùng nguồn với sơ đồ điều
 * phối, không có bảng mã bàn thứ hai để lệch nhau.
 */
import { useMemo, useState } from 'react';
import { ALL_POSITIONS, CLUSTER_LABELS } from '@/config/layoutConfig';
import type { ClusterKey } from '@/types/desk';

const CLUSTER_ORDER: ClusterKey[] = ['consult', 'tradein', 'backup'];

export default function StaffDeskPicker({
  current,
  onPick,
  onCancel,
}: {
  current: string;
  onPick: (deskId: string) => void;
  onCancel?: () => void;
}) {
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const q = query.trim().toUpperCase().replace(/\s+/g, '');
    return CLUSTER_ORDER.map((cluster) => ({
      cluster,
      desks: ALL_POSITIONS.filter(
        (p) => p.cluster === cluster && (!q || p.label.includes(q) || p.id.includes(q)),
      ),
    })).filter((g) => g.desks.length > 0);
  }, [query]);

  return (
    <div className="mx-auto w-full max-w-[430px] px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
      <h2 className="text-lg font-bold text-neutral-900">Chọn bàn của bạn</h2>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        inputMode="search"
        placeholder="Tìm nhanh mã bàn (vd TV7)"
        className="mt-3 w-full rounded-xl border border-neutral-300 px-3 py-3 text-base focus:border-brand focus:outline-none"
      />

      <div className="mt-4 space-y-5">
        {groups.map((g) => (
          <section key={g.cluster}>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-400">
              {CLUSTER_LABELS[g.cluster]}
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {g.desks.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => onPick(d.id)}
                  className={[
                    'min-h-[56px] rounded-2xl border-2 text-lg font-bold active:scale-[0.98]',
                    d.id === current
                      ? 'border-brand bg-brand text-white'
                      : 'border-neutral-200 bg-white text-neutral-800',
                  ].join(' ')}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </section>
        ))}
        {groups.length === 0 && (
          <p className="rounded-xl bg-neutral-100 px-3 py-4 text-center text-sm text-neutral-500">
            Không có mã bàn nào khớp “{query}”.
          </p>
        )}
      </div>

      {onCancel && current && (
        <button
          type="button"
          onClick={onCancel}
          className="mt-5 min-h-[52px] w-full rounded-2xl border border-neutral-300 bg-white text-base font-semibold text-neutral-600"
        >
          Huỷ, giữ bàn {current}
        </button>
      )}
    </div>
  );
}
