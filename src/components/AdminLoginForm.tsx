/**
 * AdminLoginForm — phần nhập tài khoản/mật khẩu, dùng lại ở 2 chỗ: popup "đổi
 * điều phối viên" (`CoordinatorAssignModal`) và trang `#/admin` (`LoginGate`).
 *
 * Mật khẩu chỉ được GỬI ĐI, so khớp hoàn toàn ở worker — không có mật khẩu
 * hay hash nào trong bundle web (xem `services/adminApi.ts`).
 */
import { useState } from 'react';
import { login } from '@/services/adminApi';

export default function AdminLoginForm({
  onSuccess,
  submitLabel = 'Đăng nhập',
}: {
  onSuccess?: () => void;
  submitLabel?: string;
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
      await login(username.trim(), password);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-neutral-500">Tài khoản</span>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoFocus
          className="rounded border border-neutral-300 px-2 py-2 text-sm focus:border-brand focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-neutral-500">Mật khẩu</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="rounded border border-neutral-300 px-2 py-2 text-sm focus:border-brand focus:outline-none"
        />
      </label>
      <button
        type="submit"
        disabled={busy || !username.trim() || !password}
        className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-40"
      >
        {busy ? 'Đang kiểm tra…' : submitLabel}
      </button>
      {error && <p className="text-sm text-red-600">✗ {error}</p>}
      <p className="text-[11px] text-neutral-400">
        Mật khẩu được kiểm tra ở máy chủ. Phiên giữ 12 giờ.
      </p>
    </form>
  );
}
