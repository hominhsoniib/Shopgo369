'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../../lib/api-client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const data = await apiFetch<{ accessToken: string; refreshToken: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      router.push('/');
    } catch (err: any) {
      setError(err.message ?? 'Đăng nhập thất bại');
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-6 text-xl font-bold">Đăng nhập 369</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border px-3 py-2"
          required
        />
        <input
          type="password"
          placeholder="Mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded border px-3 py-2"
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="rounded bg-red-600 py-2 font-medium text-white">
          Đăng nhập
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-500">
        Chưa có tài khoản? <a href="/register" className="text-red-600">Đăng ký</a>
      </p>
    </main>
  );
}
