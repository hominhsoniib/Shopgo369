'use client';

import { useState } from 'react';
import { apiFetch } from '../../../../lib/api-client';

export default function AdminSecurityPage() {
  const [step, setStep] = useState<'idle' | 'setup' | 'done'>('idle');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [enableCode, setEnableCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSetup() {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const data = await apiFetch<{ secret: string; otpauthUrl: string; qrCodeDataUrl: string }>('/auth/2fa/setup', {
        method: 'POST',
      });
      setQrCodeDataUrl(data.qrCodeDataUrl);
      setSecret(data.secret);
      setStep('setup');
    } catch (err: any) {
      setError(err?.message || 'Không tạo được mã QR — thử lại sau.');
    } finally {
      setLoading(false);
    }
  }

  async function handleEnable(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await apiFetch('/auth/2fa/enable', {
        method: 'POST',
        body: JSON.stringify({ code: enableCode }),
      });
      setMessage('Đã bật xác thực 2 lớp (2FA) thành công. Từ lần đăng nhập tiếp theo bạn sẽ cần nhập mã OTP.');
      setStep('done');
    } catch (err: any) {
      setError(err?.message || 'Mã xác thực không đúng.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await apiFetch('/auth/2fa/disable', {
        method: 'POST',
        body: JSON.stringify({ password: disablePassword, code: disableCode }),
      });
      setMessage('Đã tắt xác thực 2 lớp (2FA).');
      setStep('idle');
      setDisablePassword('');
      setDisableCode('');
    } catch (err: any) {
      setError(err?.message || 'Không tắt được 2FA — kiểm tra lại mật khẩu và mã OTP.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-xl font-bold text-neutral-900">🔐 Bảo mật tài khoản — Xác thực 2 lớp (2FA)</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Bắt buộc khuyến nghị cho tài khoản Admin/Super Admin — mỗi lần đăng nhập cần thêm mã OTP 6 số từ ứng dụng
        authenticator (Google Authenticator, Authy, Microsoft Authenticator...), ngay cả khi mật khẩu bị lộ.
      </p>

      {message && <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {step === 'idle' && (
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <button
            onClick={handleSetup}
            disabled={loading}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {loading ? 'Đang tạo...' : 'Bắt đầu bật 2FA'}
          </button>
        </div>
      )}

      {step === 'setup' && (
        <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-6">
          <p className="text-sm text-neutral-700">
            1. Mở app authenticator trên điện thoại → quét mã QR bên dưới (hoặc nhập tay mã bí mật).
          </p>
          {qrCodeDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrCodeDataUrl} alt="QR code 2FA" className="mx-auto h-48 w-48" />
          )}
          <p className="break-all rounded-lg bg-neutral-50 px-3 py-2 text-center font-mono text-xs text-neutral-600">
            {secret}
          </p>
          <p className="text-sm text-neutral-700">2. Nhập mã 6 số app vừa hiển thị để xác nhận:</p>
          <form onSubmit={handleEnable} className="flex flex-col gap-3">
            <input
              type="text"
              inputMode="numeric"
              placeholder="123456"
              value={enableCode}
              onChange={(e) => setEnableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="rounded-xl border border-neutral-300 px-3 py-2 text-center font-mono text-lg tracking-[0.5em] focus:border-neutral-500 focus:outline-none"
              maxLength={6}
              required
            />
            <button
              type="submit"
              disabled={loading || enableCode.length !== 6}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              Xác nhận và bật 2FA
            </button>
          </form>
        </div>
      )}

      {step === 'done' && (
        <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-6">
          <p className="text-sm font-semibold text-emerald-700">✅ 2FA đang BẬT cho tài khoản này.</p>
          <p className="text-sm text-neutral-500">
            Muốn tắt? Cần xác nhận cả mật khẩu hiện tại lẫn 1 mã OTP còn hiệu lực:
          </p>
          <form onSubmit={handleDisable} className="flex flex-col gap-3">
            <input
              type="password"
              placeholder="Mật khẩu hiện tại"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              className="rounded-xl border border-neutral-300 px-3 py-2 focus:border-neutral-500 focus:outline-none"
              required
            />
            <input
              type="text"
              inputMode="numeric"
              placeholder="Mã OTP 6 số"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="rounded-xl border border-neutral-300 px-3 py-2 text-center font-mono tracking-[0.4em] focus:border-neutral-500 focus:outline-none"
              maxLength={6}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              Tắt 2FA
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
