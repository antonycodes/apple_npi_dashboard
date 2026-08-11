/**
 * CoordinatorAssignModal — popup "đổi điều phối viên của máy này".
 *
 * Đây là CHỖ DUY NHẤT bắt đăng nhập trong luồng điều phối: mở app / xem sơ đồ
 * / gửi Form Điều phối đều KHÔNG cần đăng nhập, chỉ khi muốn đổi máy này là
 * ai mới phải nhập tài khoản admin — tránh một điều phối viên tự gán mình
 * thành người khác.
 *
 * **Luôn hỏi lại mật khẩu, KHÔNG dùng phiên 12h đang có** (siết 2026-08-11):
 * nếu chấp nhận phiên cũ thì sau khi admin đăng nhập 1 lần trên máy đó, cả ca
 * sau nhân viên vào đây đổi thoải mái không cần mật khẩu — đúng thứ user muốn
 * chặn. Đăng nhập xong cũng XOÁ phiên ngay khi đóng popup, để không để lại
 * quyền vào `#/admin` trên máy điều phối.
 */
import { useCallback, useEffect, useState } from 'react';
import AdminLoginForm from '@/components/AdminLoginForm';
import { adminSessionStore } from '@/config/adminSession';
import { deviceIdentityStore, useDeviceCoordinatorId } from '@/config/deviceIdentity';
import { useCoordinators } from '@/hooks/useCoordinators';

export default function CoordinatorAssignModal({ onClose }: { onClose: () => void }) {
  // Bắt đầu LUÔN ở bước đăng nhập, bất kể localStorage đang có token gì.
  const [verified, setVerified] = useState(false);
  const currentId = useDeviceCoordinatorId();
  const { coordinators, loading, error } = useCoordinators();
  const [draftId, setDraftId] = useState(currentId);

  /** Đóng popup = trả máy về trạng thái "muốn đổi phải nhập mật khẩu lại". */
  const close = useCallback(() => {
    adminSessionStore.clear();
    onClose();
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-label="Đổi điều phối viên"
      onClick={close}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-neutral-800">Đổi điều phối viên</h2>
            <p className="text-xs text-neutral-500">
              {verified ? 'Chọn người phụ trách máy này.' : 'Nhập lại mật khẩu admin để đổi.'}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Đóng"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-lg leading-none text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            ×
          </button>
        </div>

        {!verified ? (
          <AdminLoginForm submitLabel="Đăng nhập để đổi" onSuccess={() => setVerified(true)} />
        ) : (
          <div className="space-y-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-neutral-500">Điều phối viên</span>
              <select
                value={draftId}
                onChange={(e) => setDraftId(e.target.value)}
                className="rounded border border-neutral-300 bg-white px-2 py-2 text-sm focus:border-brand focus:outline-none"
              >
                <option value="">— Chưa gán —</option>
                {coordinators.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id} · {c.name}
                    {c.position ? ` · ${c.position}` : ''}
                  </option>
                ))}
              </select>
            </label>

            {loading && <p className="text-xs text-neutral-400">Đang tải danh sách…</p>}
            {error && <p className="text-xs text-red-600">✗ {error}</p>}
            {!loading && !error && coordinators.length === 0 && (
              <p className="text-xs text-amber-700">
                Danh sách trống — vào{' '}
                <a className="underline" href="#/admin">
                  trang Admin
                </a>{' '}
                để thêm điều phối viên.
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  deviceIdentityStore.set(draftId);
                  close();
                }}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
              >
                Lưu cho máy này
              </button>
              <button
                type="button"
                onClick={close}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Huỷ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
