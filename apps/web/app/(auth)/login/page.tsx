'use client';

import { useState } from 'react';
import { apiFetch } from '../../../lib/api-client';
import { AuthUser, clearAuth, saveAuth } from '../../../lib/auth-client';
import PasswordInput from '../../../components/ui/PasswordInput';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';

const inputClass = 'rounded-xl border border-neutral-300 px-3 py-2 focus:border-primary-400 focus:outline-none';

function redirectByRole(roles: string[]) {
  if (roles.includes('ADMIN') || roles.includes('SUPER_ADMIN')) {
    window.location.href = '/admin/dashboard';
  } else if (roles.includes('SELLER')) {
    window.location.href = '/seller/dashboard';
  } else {
    window.location.href = '/';
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Bước 2FA — chỉ xuất hiện khi backend trả requiresTwoFactor:true (tài
  // khoản Admin/Super Admin đã bật 2FA). KHÔNG có đường tắt nào bỏ qua bước
  // này — email/password đúng KHÔNG đủ để lấy token thật trong trường hợp đó.
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    clearAuth(); // Xóa phiên làm việc cũ/hết hạn để gửi request đăng nhập sạch 100%
    try {
      const data = await apiFetch<
        | { accessToken: string; refreshToken: string; user: AuthUser }
        | { requiresTwoFactor: true; tempToken: string }
      >('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if ('requiresTwoFactor' in data && data.requiresTwoFactor) {
        setTempToken(data.tempToken);
        return;
      }

      saveAuth(data.accessToken, data.refreshToken, data.user);
      redirectByRole(data.user.roles || []);
    } catch (err: any) {
      // Đăng nhập thất bại thật (sai mật khẩu, backend lỗi, mất mạng...) —
      // hiển thị lỗi cho người dùng. TUYỆT ĐỐI KHÔNG tự động đăng nhập giả ở
      // đây — nhánh "Demo Vercel Mode" trước đây từng làm vậy và cấp quyền
      // Admin/Super Admin cho BẤT KỲ ai gõ sai mật khẩu, đây là lỗ hổng bypass
      // xác thực nghiêm trọng đã được gỡ bỏ hoàn toàn.
      setError(err?.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch<{ accessToken: string; refreshToken: string; user: AuthUser }>(
        '/auth/2fa/verify-login',
        {
          method: 'POST',
          body: JSON.stringify({ tempToken, code: otpCode }),
        },
      );
      saveAuth(data.accessToken, data.refreshToken, data.user);
      redirectByRole(data.user.roles || []);
    } catch (err: any) {
      setError(err?.message || 'Mã xác thực không đúng.');
    } finally {
      setLoading(false);
    }
  }

  if (tempToken) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
        <Card className="p-6">
          <h1 className="mb-2 font-display text-2xl font-semibold text-neutral-900">Xác thực 2 lớp</h1>
          <p className="mb-6 text-sm text-neutral-500">
            Nhập mã 6 số từ ứng dụng authenticator (Google Authenticator, Authy...) trên thiết bị của bạn.
          </p>
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              placeholder="123456"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className={`${inputClass} text-center font-mono text-lg tracking-[0.5em]`}
              maxLength={6}
              required
            />
            {error && <p className="text-sm text-danger-600">{error}</p>}
            <Button type="submit" variant="primary" size="lg" disabled={loading || otpCode.length !== 6}>
              Xác nhận
            </Button>
            <button
              type="button"
              onClick={() => {
                setTempToken(null);
                setOtpCode('');
                setError('');
              }}
              className="text-center text-sm text-neutral-500 hover:underline"
            >
              ← Quay lại đăng nhập
            </button>
          </form>
        </Card>
      </main>
    );
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
          <Button type="submit" variant="primary" size="lg" disabled={loading}>
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
