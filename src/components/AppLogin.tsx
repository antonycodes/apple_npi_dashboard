/**
 * AppLogin — cổng đăng nhập của app gộp (`/app`).
 *
 * Khác `AdminLoginForm` (ô nhỏ nhét trong popup/trang cài đặt) ở chỗ đây là
 * MỘT MÀN HÌNH của điện thoại: chữ to, nút cao, nhớ sẵn MSNV nên sáng hôm sau
 * mở lên chỉ phải nhập mật khẩu.
 *
 * Tài khoản đến từ `Master_DS` (`NPI_AIO_User`/`NPI_AIO_Pass`); riêng `admin`
 * so với secret của worker. Mật khẩu chỉ được GỬI ĐI và so khớp ở worker —
 * không có mật khẩu hay hash nào trong bundle web.
 */
import { useState } from 'react';
import { login } from '@/services/adminApi';

/** MSNV lần trước — tiện cho máy dùng riêng, không phải bí mật gì. */
const LS_LAST_USER = 'npievent-aio-user-v1';

function loadLastUser(): string {
  try {
    return localStorage.getItem(LS_LAST_USER) ?? '';
  } catch {
    return '';
  }
}

export default function AppLogin({
  onGuest,
  fixedUsername,
  title = 'NPI-CPS',
  subtitle,
}: {
  onGuest?: () => void;
  fixedUsername?: string;
  title?: string;
  subtitle?: string;
}) {
  const [username, setUsername] = useState(() => fixedUsername ?? loadLastUser());
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const account = (fixedUsername ?? username).trim().toUpperCase();
      await login(account, password);
      try {
        localStorage.setItem(LS_LAST_USER, account);
      } catch {
        /* chế độ riêng tư — chỉ mất tiện lợi, không ảnh hưởng đăng nhập */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full bg-[#f5f5f7] pt-[env(safe-area-inset-top)] text-neutral-800">
      <main className="mx-auto flex min-h-[calc(100dvh-env(safe-area-inset-top))] w-full max-w-[430px] flex-col px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-10">
        <img
          src="/cellphones-logo.png"
          alt="CellphoneS"
          className="h-12 w-auto max-w-[190px]"
        />
        <h1 className="mt-7 text-[34px] font-black leading-none tracking-[-0.03em] text-neutral-950">{title}</h1>
        {subtitle && <p className="mt-2 text-sm font-semibold text-neutral-500">{subtitle}</p>}
        <form onSubmit={submit} className="mt-8 space-y-4 rounded-2xl bg-white p-5 shadow-[0_12px_36px_rgba(17,24,39,0.08)]">
          {fixedUsername ? (
            <div className="flex items-center justify-between rounded-xl bg-neutral-100 px-4 py-4">
              <span className="text-xs font-bold uppercase tracking-[0.08em] text-neutral-500">Tài khoản</span>
              <span className="text-lg font-black uppercase text-neutral-900">{fixedUsername}</span>
            </div>
          ) : (
            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.08em] text-neutral-500">Tài khoản MSNV</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoCapitalize="characters"
                autoFocus={!username}
                placeholder="VD: S08380"
                className="min-h-14 rounded-xl bg-neutral-100 px-4 text-lg font-bold uppercase text-neutral-900 outline-none ring-brand transition-shadow placeholder:text-neutral-400 focus:ring-2"
              />
            </label>
          )}

          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-neutral-500">Mật khẩu</span>
            <div className="flex items-center gap-2">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus={Boolean(username)}
                className="min-h-14 w-full min-w-0 flex-1 rounded-xl bg-neutral-100 px-4 text-lg text-neutral-900 outline-none ring-brand transition-shadow focus:ring-2"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="min-h-14 shrink-0 rounded-xl bg-neutral-100 px-4 text-sm font-bold text-neutral-600 transition-colors hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand active:bg-neutral-300"
              >
                {showPass ? 'Ẩn' : 'Hiện'}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={busy || !username.trim() || !password}
            className="min-h-14 w-full rounded-xl bg-neutral-950 text-base font-bold text-white shadow-[0_8px_20px_rgba(17,24,39,0.18)] transition-[transform,background-color] hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:shadow-none disabled:opacity-35"
          >
            {busy ? 'Đang kiểm tra…' : 'Đăng nhập'}
          </button>

          {onGuest && (
            <button
              type="button"
              onClick={onGuest}
              className="min-h-12 w-full rounded-xl border border-neutral-300 bg-white text-base font-bold text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 active:bg-neutral-100"
            >
              Đăng nhập với tư cách khách
            </button>
          )}

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}
        </form>
      </main>
    </div>
  );
}
