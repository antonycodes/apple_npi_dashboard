/**
 * LoginGate — màn đăng nhập full-page cho các trang quản trị còn lại.
 */
import AdminLoginForm from '@/components/AdminLoginForm';
import { SITE_BRAND } from '@/config/siteBrand';

export default function LoginGate({ note }: { note?: string }) {
  return (
    <div className="flex min-h-full items-center justify-center bg-neutral-100 p-4 text-neutral-800">
      <div className="w-full max-w-sm space-y-3 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div>
          <h1 className="text-lg font-bold">{SITE_BRAND} · Đăng nhập</h1>
          <p className="text-sm text-neutral-500">{note ?? 'Đăng nhập tài khoản admin để tiếp tục.'}</p>
        </div>
        <AdminLoginForm fixedUsername="admin" />
      </div>
    </div>
  );
}
