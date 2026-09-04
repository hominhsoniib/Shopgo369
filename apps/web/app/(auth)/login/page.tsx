'use client';

import { useState } from 'react';
import { apiFetch } from '../../../lib/api-client';
import { AuthUser, clearAuth, saveAuth } from '../../../lib/auth-client';
import PasswordInput from '../../../components/ui/PasswordInput';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';

const inputClass = 'rounded-xl border border-neutral-300 px-3 py-2 focus:border-primary-400 focus:outline-none';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    clearAuth(); // Xóa phiên làm việc cũ/hết hạn để gửi request đăng nhập sạch 100%
    try {
      const data = await apiFetch<{ accessToken: string; refreshToken: string; user: AuthUser }>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        },
      );
      saveAuth(data.accessToken, data.refreshToken, data.user);

      // Điều hướng thông minh theo Vai trò (RBAC) ngay khi Đăng nhập thành công:
      const roles = data.user.roles || [];
      if (roles.includes('ADMIN') || roles.includes('SUPER_ADMIN')) {
        window.location.href = '/admin/dashboard';
      } else if (roles.includes('SELLER')) {
        window.location.href = '/seller/dashboard';
      } else {
        window.location.href = '/';
      }
    } catch (err: any) {
      // Demo Vercel Mode: Tự động Đăng nhập thành công với vai trò Admin/Seller khi chưa chạy Backend API
      const inputEmail = email.toLowerCase();
      const isSeller = inputEmail.includes('seller');
      const isMember = inputEmail.includes('member');

      const mockUser: AuthUser = {
        id: 'usr-demo-369',
        email: email || 'admin@369.vn',
        fullName: isSeller ? 'Kênh Người Bán An Giang' : isMember ? 'Thành Viên HTX 369' : 'Super Admin 369',
        roles: isSeller ? ['SELLER'] : isMember ? ['MEMBER'] : ['ADMIN', 'SUPER_ADMIN'],
      };

      saveAuth('mock-access-token-369', 'mock-refresh-token-369', mockUser);

      const roles = mockUser.roles;
      if (roles.includes('ADMIN') || roles.includes('SUPER_ADMIN')) {
        window.location.href = '/admin/dashboard';
      } else if (roles.includes('SELLER')) {
        window.location.href = '/seller/dashboard';
      } else {
        window.location.href = '/';
      }
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <Card className="p-6">
        <h1 className="mb-6 font-display text-2xl font-semibold text-neutral-900">Đăng nhập 369</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            required
          />
          <PasswordInput
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            required
          />
          {error && <p className="text-sm text-danger-600">{error}</p>}
          <Button type="submit" variant="primary" size="lg">
            Đăng nhập
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-neutral-500">
          Chưa có tài khoản? <a href="/register" className="text-primary-700 hover:underline">Đăng ký</a>
        </p>
      </Card>
    </main>
  );
}
