'use client';

import { useState } from 'react';
import { apiFetch } from '../../../../lib/api-client';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';

/**
 * QA Test Console — kiểm tra nhanh 3 hạng mục bảo mật vừa triển khai, KHÔNG
 * cần Swagger: (1) luồng đăng nhập + 2FA, (2) trạng thái bật/tắt 2FA của tài
 * khoản đang đăng nhập, (3) xác minh tự động CCCD trả về từ API đã GIẢI MÃ
 * đúng (không còn ciphertext "enc:v1:...").
 *
 * Trang nội bộ dành cho đội dev/QA — không phải tính năng cho end-user.
 */

const inputClass =
  'rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none';

type TestStatus = 'idle' | 'running' | 'pass' | 'fail';

function StatusBadge({ status }: { status: TestStatus }) {
  const map: Record<TestStatus, { label: string; className: string }> = {
    idle: { label: 'Chưa chạy', className: 'bg-neutral-100 text-neutral-500' },
    running: { label: 'Đang chạy…', className: 'bg-amber-50 text-amber-700 animate-pulse' },
    pass: { label: '✅ PASS', className: 'bg-emerald-50 text-emerald-700' },
    fail: { label: '❌ FAIL', className: 'bg-red-50 text-red-700' },
  };
  const s = map[status];
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${s.className}`}>{s.label}</span>;
}

export default function QaTestConsolePage() {
  // ── Test 1: Login flow (thường / 2FA) ─────────────────────────────
  const [loginEmail, setLoginEmail] = useState('admin@369.vn');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginStatus, setLoginStatus] = useState<TestStatus>('idle');
  const [loginLog, setLoginLog] = useState<string[]>([]);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [accessToken, setAccessToken] = useState<string | null>(null);

  function log(setter: (fn: (prev: string[]) => string[]) => void, line: string) {
    setter((prev) => [...prev, `${new Date().toLocaleTimeString('vi-VN')}  ${line}`]);
  }

  async function runLoginTest(e: React.FormEvent) {
    e.preventDefault();
    setLoginStatus('running');
    setLoginLog([]);
    setTempToken(null);
    log(setLoginLog, `→ POST /auth/login (${loginEmail})`);
    try {
      const data = await apiFetch<any>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      if (data.requiresTwoFactor) {
        log(setLoginLog, '← requiresTwoFactor: true — tài khoản đã bật 2FA, cần bước 2 (nhập mã OTP)');
        setTempToken(data.tempToken);
        setLoginStatus('idle');
        return;
      }
      log(setLoginLog, `← accessToken nhận được (${data.accessToken.slice(0, 20)}...) — 2FA CHƯA bật cho tài khoản này`);
      setAccessToken(data.accessToken);
      setLoginStatus('pass');
    } catch (err: any) {
      log(setLoginLog, `✗ Lỗi: ${err?.message || 'không xác định'}`);
      setLoginStatus('fail');
    }
  }

  async function runOtpVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoginStatus('running');
    log(setLoginLog, `→ POST /auth/2fa/verify-login (mã: ${otpCode})`);
    try {
      const data = await apiFetch<any>('/auth/2fa/verify-login', {
        method: 'POST',
        body: JSON.stringify({ tempToken, code: otpCode }),
      });
      log(setLoginLog, `← accessToken nhận được sau khi xác thực OTP đúng — luồng 2FA hoạt động end-to-end`);
      setAccessToken(data.accessToken);
      setTempToken(null);
      setLoginStatus('pass');
    } catch (err: any) {
      log(setLoginLog, `✗ Mã OTP sai hoặc hết hạn: ${err?.message}`);
      setLoginStatus('fail');
    }
  }

  // ── Test 2: CCCD decryption ────────────────────────────────────────
  const [cccdStatus, setCccdStatus] = useState<TestStatus>('idle');
  const [cccdRows, setCccdRows] = useState<{ id: string; businessName: string; ownerIdCard: string }[]>([]);
  const [cccdSummary, setCccdSummary] = useState('');

  async function runCccdTest() {
    if (!accessToken) {
      setCccdSummary('⚠️ Cần đăng nhập thành công ở Test 1 trước (accessToken chưa có).');
      setCccdStatus('fail');
      return;
    }
    setCccdStatus('running');
    setCccdSummary('');
    try {
      // apiFetch tự đọc accessToken từ localStorage — accessToken vừa lưu ở
      // Test 1 (saveAuth chưa gọi ở trang này, nên set thủ công vào localStorage
      // để apiFetch dùng được ngay, không cần rời trang đăng nhập lại).
      localStorage.setItem('accessToken', accessToken);
      const data = await apiFetch<{ items: { id: string; businessName: string; ownerIdCard: string }[] }>(
        '/admin/businesses?pageSize=50',
      );
      setCccdRows(data.items);
      const stillEncrypted = data.items.filter((b) => b.ownerIdCard.startsWith('enc:v1:'));
      if (data.items.length === 0) {
        setCccdSummary('⚠️ Không có business nào trong DB để kiểm tra (không phải lỗi, chỉ là chưa có dữ liệu).');
        setCccdStatus('idle');
      } else if (stillEncrypted.length > 0) {
        setCccdSummary(
          `❌ Phát hiện ${stillEncrypted.length}/${data.items.length} bản ghi CÒN LÀ CIPHERTEXT — decrypt() chưa hoạt động đúng ở endpoint này.`,
        );
        setCccdStatus('fail');
      } else {
        setCccdSummary(`✅ Toàn bộ ${data.items.length} bản ghi CCCD đã được giải mã đúng thành số thường.`);
        setCccdStatus('pass');
      }
    } catch (err: any) {
      setCccdSummary(`✗ Lỗi gọi API: ${err?.message}`);
      setCccdStatus('fail');
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-xl font-bold text-neutral-900">🧪 QA Test Console — Bảo mật</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Kiểm tra nhanh luồng đăng nhập/2FA và xác minh tự động CCCD đã mã hoá đúng chiều (giải mã khi trả API).
        Trang nội bộ — không hiển thị cho người dùng cuối.
      </p>

      {/* ── Test 1 ─────────────────────────────────────────────── */}
      <Card className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-neutral-900">Test 1 — Đăng nhập &amp; 2FA</h2>
          <StatusBadge status={loginStatus} />
        </div>

        {!tempToken ? (
          <form onSubmit={runLoginTest} className="flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="Email"
              className={`${inputClass} flex-1`}
            />
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Mật khẩu"
              className={`${inputClass} flex-1`}
              required
            />
            <Button type="submit" size="sm" disabled={loginStatus === 'running'}>
              Chạy test
            </Button>
          </form>
        ) : (
          <form onSubmit={runOtpVerify} className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              inputMode="numeric"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Mã OTP 6 số"
              className={`${inputClass} flex-1 text-center font-mono tracking-[0.3em]`}
              maxLength={6}
              required
            />
            <Button type="submit" size="sm" disabled={otpCode.length !== 6}>
              Xác thực OTP
            </Button>
          </form>
        )}

        {loginLog.length > 0 && (
          <pre className="mt-3 max-h-40 overflow-y-auto rounded-lg bg-neutral-950 p-3 text-xs text-emerald-400">
            {loginLog.join('\n')}
          </pre>
        )}
      </Card>

      {/* ── Test 2 ─────────────────────────────────────────────── */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-neutral-900">Test 2 — CCCD giải mã đúng khi trả API</h2>
          <StatusBadge status={cccdStatus} />
        </div>
        <p className="mb-3 text-sm text-neutral-500">Gọi GET /admin/businesses và tự động soát từng dòng.</p>
        <Button size="sm" variant="secondary" onClick={runCccdTest} disabled={cccdStatus === 'running'}>
          Chạy test
        </Button>

        {cccdSummary && (
          <p
            className={`mt-3 rounded-lg px-3 py-2 text-sm ${
              cccdStatus === 'pass' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {cccdSummary}
          </p>
        )}

        {cccdRows.length > 0 && (
          <div className="mt-3 overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-500">
                <tr>
                  <th className="px-3 py-2">Hộ kinh doanh</th>
                  <th className="px-3 py-2">ownerIdCard (raw từ API)</th>
                  <th className="px-3 py-2">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {cccdRows.map((b) => {
                  const encrypted = b.ownerIdCard.startsWith('enc:v1:');
                  return (
                    <tr key={b.id} className="border-t border-neutral-100">
                      <td className="px-3 py-2">{b.businessName}</td>
                      <td className="px-3 py-2 font-mono">{b.ownerIdCard.slice(0, 24)}{b.ownerIdCard.length > 24 ? '…' : ''}</td>
                      <td className="px-3 py-2">
                        {encrypted ? (
                          <span className="text-red-600">❌ ciphertext</span>
                        ) : (
                          <span className="text-emerald-600">✅ plaintext</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
