'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../../lib/api-client';
import { clearAuth, isLoggedIn } from '../../../../lib/auth-client';
import PasswordInput from '../../../../components/ui/PasswordInput';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';

const inputClass = 'rounded-xl border border-neutral-300 px-3 py-2 focus:border-primary-400 focus:outline-none';

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
    return <main className="px-4 py-8 text-center text-neutral-400">Đang tải...</main>;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <Card className="p-6">
        <h1 className="mb-6 font-display text-2xl font-semibold text-neutral-900">Đổi mật khẩu</h1>

        {success ? (
          <p className="rounded-xl bg-primary-50 p-3 text-sm text-primary-700">
            Đổi mật khẩu thành công. Đang chuyển tới trang đăng nhập...
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <PasswordInput
              placeholder="Mật khẩu hiện tại"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
              autoComplete="current-password"
              required
            />
            <PasswordInput
              placeholder="Mật khẩu mới (tối thiểu 8 ký tự)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              className={inputClass}
              autoComplete="new-password"
              required
            />
            <PasswordInput
              placeholder="Xác nhận mật khẩu mới"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              className={inputClass}
              autoComplete="new-password"
              required
            />
            {error && <p className="text-sm text-danger-600">{error}</p>}
            <Button type="submit" variant="primary" size="lg" disabled={submitting}>
              {submitting ? 'Đang xử lý...' : 'Đổi mật khẩu'}
            </Button>
          </form>
        )}
      </Card>
    </main>
  );
}
