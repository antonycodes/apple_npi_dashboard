/**
 * AdminPage (`#/admin`) — gán ID / tên / vị trí cho từng điều phối viên.
 *
 * Danh sách lưu ở Cloudflare KV qua worker nên MỌI MÁY dùng chung: admin sửa
 * một chỗ, các máy điều phối nhận theo ở lần tải kế tiếp. Trang này chỉ là
 * giao diện — kiểm tra mật khẩu và quyền ghi đều nằm ở worker, bundle web
 * không chứa thông tin đăng nhập nào (xem `services/adminApi.ts`).
 *
 * App không còn cổng đăng nhập chung, nên trang này TỰ chặn: chưa có token
 * thì hiện `LoginGate`, chứ không cho vào thẳng màn sửa danh sách.
 */
import { useCallback, useEffect, useState } from 'react';
import LoginGate from '@/components/LoginGate';
import { adminSessionStore, useAdminToken } from '@/config/adminSession';
import { fetchCoordinators, saveCoordinators } from '@/services/adminApi';
import type { Coordinator, CoordinatorConfig } from '@/types/coordinator';

export default function AdminPage() {
  const token = useAdminToken();
  if (!token) return <LoginGate note="Đăng nhập tài khoản admin để quản lý điều phối viên." />;

  return (
    <div className="min-h-full bg-neutral-100 text-neutral-800">
      <header className="border-b border-neutral-200 bg-white px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Admin · Danh sách điều phối viên</h1>
            <p className="text-sm text-neutral-500">
              Cấu hình dùng chung cho mọi máy — lưu trên server, không phải trên từng máy.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => adminSessionStore.clear()}
              className="rounded border border-neutral-300 px-3 py-1 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
            >
              Đăng xuất
            </button>
            <a
              href="#/"
              className="rounded border border-neutral-300 px-3 py-1 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
            >
              ← Về sơ đồ
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-6 py-6">
        <CoordinatorEditor />
      </main>
    </div>
  );
}

function CoordinatorEditor() {
  const [rows, setRows] = useState<Coordinator[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const apply = useCallback((cfg: CoordinatorConfig) => {
    setRows(cfg.coordinators);
    setUpdatedAt(cfg.updatedAt);
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    let cancelled = false;
    fetchCoordinators(ctrl.signal)
      .then((cfg) => {
        if (!cancelled) apply(cfg);
      })
      .catch((err) => {
        // StrictMode gọi effect 2 lần ở dev: lần đầu bị cleanup abort ngay.
        // Không lọc thì lỗi "signal is aborted" hiện lên như lỗi thật.
        if (cancelled || ctrl.signal.aborted) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [apply]);

  const setRow = (i: number, patch: Partial<Coordinator>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const addRow = () =>
    setRows((prev) => [...prev, { id: `DP${String(prev.length + 1).padStart(2, '0')}`, name: '', position: '' }]);

  // Chặn ngay ở UI thay vì để 2 máy cùng nhận 1 ID rồi lẫn dữ liệu về sau.
  const ids = rows.map((r) => r.id.trim());
  const duplicateId = ids.find((id, i) => id && ids.indexOf(id) !== i) ?? null;
  const missingField = rows.some((r) => !r.id.trim() || !r.name.trim());
  const canSave = !saving && !duplicateId && !missingField;

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      apply(await saveCoordinators({ coordinators: rows, updatedAt: null }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      // Token chết → xoá phiên, `LoginGate` ở App tự hiện lại.
      if (/hết hạn|không hợp lệ/i.test(msg)) adminSessionStore.clear();
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-neutral-500">Đang tải danh sách…</p>;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold text-neutral-800">Điều phối viên ({rows.length})</h2>
          <span className="text-xs text-neutral-400">
            {updatedAt ? `Lưu lần cuối: ${new Date(updatedAt).toLocaleString('vi-VN')}` : 'Chưa lưu lần nào'}
          </span>
        </div>

        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm italic text-neutral-400">
            Chưa có điều phối viên nào. Bấm “Thêm điều phối viên”.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  <th className="py-2 pr-3">ID</th>
                  <th className="py-2 pr-3">Họ và tên</th>
                  <th className="py-2 pr-3">Vị trí</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-neutral-100 last:border-0">
                    <td className="py-2 pr-3">
                      <Cell value={r.id} onChange={(v) => setRow(i, { id: v })} placeholder="DP01" width="w-24" />
                    </td>
                    <td className="py-2 pr-3">
                      <Cell value={r.name} onChange={(v) => setRow(i, { name: v })} placeholder="Nguyễn Văn A" />
                    </td>
                    <td className="py-2 pr-3">
                      <Cell value={r.position} onChange={(v) => setRow(i, { position: v })} placeholder="Cổng / Khu Tư vấn" />
                    </td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                        aria-label={`Xoá ${r.id || 'dòng'}`}
                        className="rounded px-2 py-1 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button
          type="button"
          onClick={addRow}
          className="mt-3 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          + Thêm điều phối viên
        </button>
      </section>

      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-white/95 p-3 shadow-sm backdrop-blur">
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-40"
        >
          {saving ? 'Đang lưu…' : 'Lưu cho tất cả máy'}
        </button>
        {duplicateId && <span className="text-sm text-red-600">✗ ID trùng: {duplicateId}</span>}
        {!duplicateId && missingField && <span className="text-sm text-amber-600">Cần điền đủ ID và Họ tên.</span>}
        {saved && <span className="text-sm font-medium text-emerald-600">✓ Đã lưu — các máy sẽ nhận khi tải lại</span>}
        {error && <span className="max-w-md truncate text-sm text-red-600" title={error}>✗ {error}</span>}
      </div>
    </div>
  );
}

function Cell({
  value,
  onChange,
  placeholder,
  width = 'w-full',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  width?: string;
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`${width} rounded border border-neutral-300 px-2 py-1.5 text-sm focus:border-brand focus:outline-none`}
    />
  );
}
