/**
 * AppLogin — cổng đăng nhập của app gộp (`#/app`).
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

export default function AppLogin() {
  const [username, setUsername] = useState(loadLastUser);
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
      const account = username.trim().toUpperCase();
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
    <div className="min-h-full bg-neutral-100 pt-[env(safe-area-inset-top)] text-neutral-800">
      <div className="mx-auto w-full max-w-[430px] px-4 py-8">
        <h1 className="text-3xl font-black leading-none text-neutral-900">NPI-APPLE</h1>
        <p className="mt-1 text-sm text-neutral-500">All in One · Tư vấn · Thu cũ · Backup · Kho</p>

        <form onSubmit={submit} className="mt-6 space-y-3 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-neutral-500">Tài khoản (MSNV)</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="characters"
              autoFocus={!username}
              placeholder="VD: S08380"
              className="min-h-14 rounded-xl border border-neutral-300 px-3 text-lg font-bold uppercase focus:border-brand focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-neutral-500">Mật khẩu</span>
            <div className="flex items-center gap-2">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus={Boolean(username)}
                className="min-h-14 w-full min-w-0 flex-1 rounded-xl border border-neutral-300 px-3 text-lg focus:border-brand focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="min-h-14 shrink-0 rounded-xl border border-neutral-300 px-3 text-sm font-semibold text-neutral-600 active:bg-neutral-100"
              >
                {showPass ? 'Ẩn' : 'Hiện'}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={busy || !username.trim() || !password}
            className="min-h-14 w-full rounded-2xl bg-brand text-base font-bold text-white shadow-sm active:opacity-80 disabled:opacity-40"
          >
            {busy ? 'Đang kiểm tra…' : 'Đăng nhập'}
          </button>

          {error && <p className="text-sm font-semibold text-red-600">✗ {error}</p>}
          <p className="text-[11px] text-neutral-400">
            Tài khoản và mật khẩu lấy từ Master_DS. Mật khẩu kiểm tra ở máy chủ, phiên giữ 12 giờ.
          </p>
        </form>
      </div>
    </div>
  );
}
