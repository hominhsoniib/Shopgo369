'use client';

import { useState } from 'react';
import { apiFetch } from '../../../lib/api-client';
import { AuthUser, saveAuth } from '../../../lib/auth-client';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await apiFetch<{ accessToken: string; refreshToken: string; user: AuthUser }>(
        '/auth/register',
        {
          method: 'POST',
          // phone là tuỳ chọn theo RegisterDto — chỉ gửi khi có nhập, tránh
          // validate lỗi "Số điện thoại không hợp lệ" với chuỗi rỗng.
          body: JSON.stringify(phone ? { email, phone, password, fullName } : { email, password, fullName }),
        },
      );
      saveAuth(data.accessToken, data.refreshToken, data.user);
      window.location.href = '/'; // full reload — Header (đã mount sẵn trong layout) đọc lại localStorage đúng trạng thái mới
    } catch (err: any) {
      setError(err.message ?? 'Đăng ký thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-6 text-xl font-bold">Đăng ký tài khoản 369</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Họ và tên"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="rounded border px-3 py-2"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border px-3 py-2"
          required
        />
        <input
          type="tel"
          placeholder="Số điện thoại (không bắt buộc)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="rounded border px-3 py-2"
        />
        <input
          type="password"
          placeholder="Mật khẩu (tối thiểu 8 ký tự)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          className="rounded border px-3 py-2"
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-red-600 py-2 font-medium text-white disabled:opacity-60"
        >
          {submitting ? 'Đang xử lý...' : 'Đăng ký'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-500">
        Đã có tài khoản? <a href="/login" className="text-red-600">Đăng nhập</a>
      </p>
    </main>
  );
}
