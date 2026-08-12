/**
 * AdminLoginForm — phần nhập tài khoản/mật khẩu, dùng lại ở 3 chỗ: popup "đổi
 * điều phối viên" (`CoordinatorAssignModal`), trang `#/admin` (`LoginGate`) và
 * màn hình nhân viên `#/nv` (`StaffPage`).
 *
 * `fixedUsername` (2026-08-12, yêu cầu user cho màn hình nhân viên): khoá cứng
 * tài khoản và ẩn ô tài khoản.
 *
 * MỌI tài khoản đều phải nhập mật khẩu (2026-08-12, tiếp — trước đây admin
 * đăng nhập không cần gì, tức ai biết URL worker cũng đẩy được cấu hình cho
 * toàn bộ máy). Admin so với secret `ADMIN_PASSWORD`, nhân viên so với
 * `STAFF_PASSWORD`.
 *
 * Mật khẩu chỉ được GỬI ĐI và so khớp ở worker — không có mật khẩu hay hash
 * nào trong bundle web.
 */
import { useState } from 'react';
import { login } from '@/services/adminApi';

export default function AdminLoginForm({
  onSuccess,
  submitLabel = 'Đăng nhập',
  fixedUsername,
  size = 'sm',
}: {
  onSuccess?: () => void;
  submitLabel?: string;
  /** Khoá tài khoản (ẩn ô nhập) — vd "admin" ở màn hình nhân viên. */
  fixedUsername?: string;
  /** 'lg' = cỡ chữ/nút to cho điện thoại. */
  size?: 'sm' | 'lg';
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(fixedUsername ?? username.trim().toUpperCase(), password);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const big = size === 'lg';
  const inputCls = big
    ? 'rounded-xl border border-neutral-300 px-3 py-3 text-base focus:border-brand focus:outline-none'
    : 'rounded border border-neutral-300 px-2 py-2 text-sm focus:border-brand focus:outline-none';
  const buttonCls = big
    ? 'w-full rounded-xl bg-brand px-4 py-4 text-base font-bold text-white shadow-sm active:opacity-80 disabled:opacity-40'
    : 'w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-40';

  return (
    <form onSubmit={submit} className="space-y-3">
      {fixedUsername ? (
        <p className="text-xs text-neutral-500">
          Tài khoản: <span className="font-semibold text-neutral-700">{fixedUsername}</span>
        </p>
      ) : (
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-neutral-500">Tài khoản</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
            className={inputCls}
          />
        </label>
      )}
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-neutral-500">Mật khẩu</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          autoFocus={Boolean(fixedUsername)}
          className={inputCls}
        />
      </label>
      <button
        type="submit"
        disabled={busy || (!fixedUsername && !username.trim()) || !password}
        className={buttonCls}
      >
        {busy ? 'Đang kiểm tra…' : submitLabel}
      </button>
      {error && <p className="text-sm text-red-600">✗ {error}</p>}
      <p className="text-[11px] text-neutral-400">Mật khẩu được kiểm tra ở máy chủ. Phiên giữ 12 giờ.</p>
    </form>
  );
}
