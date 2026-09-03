'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../../lib/api-client';
import { clearAuth, isLoggedIn } from '../../../../lib/auth-client';
import PasswordInput from '../../../../components/ui/PasswordInput';

export default function ChangePasswordPage() {
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // isLoggedIn() đọc localStorage — chỉ chạy được sau khi mount trên client,
    // giống pattern trong Header.tsx (tránh hydration mismatch).
    if (!isLoggedIn()) {
      window.location.href = '/login';
      return;
    }
    setCheckedAuth(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Xác nhận mật khẩu mới không khớp');
      return;
    }
    if (currentPassword === newPassword) {
      setError('Mật khẩu mới phải khác mật khẩu hiện tại');
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setSuccess(true);
      // Đổi mật khẩu xong, buộc đăng nhập lại bằng mật khẩu mới — an toàn hơn
      // là giữ nguyên phiên cũ (access token cũ vẫn còn hiệu lực tới khi hết hạn
      // tự nhiên vì hệ thống dùng JWT stateless, không revoke được ngay lập tức).
      clearAuth();
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    } catch (err: any) {
      setError(err.message ?? 'Đổi mật khẩu thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  if (!checkedAuth) {
    return <main className="px-4 py-8 text-center text-gray-400">Đang tải...</main>;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-6 text-xl font-bold">Đổi mật khẩu</h1>

      {success ? (
        <p className="rounded bg-green-50 p-3 text-sm text-green-700">
          Đổi mật khẩu thành công. Đang chuyển tới trang đăng nhập...
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <PasswordInput
            placeholder="Mật khẩu hiện tại"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="rounded border px-3 py-2"
            autoComplete="current-password"
            required
          />
          <PasswordInput
            placeholder="Mật khẩu mới (tối thiểu 8 ký tự)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            className="rounded border px-3 py-2"
            autoComplete="new-password"
            required
          />
          <PasswordInput
            placeholder="Xác nhận mật khẩu mới"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={8}
            className="rounded border px-3 py-2"
            autoComplete="new-password"
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-red-600 py-2 font-medium text-white disabled:opacity-60"
          >
            {submitting ? 'Đang xử lý...' : 'Đổi mật khẩu'}
          </button>
        </form>
      )}
    </main>
  );
}
