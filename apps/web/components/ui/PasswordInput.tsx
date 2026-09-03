import { InputHTMLAttributes, useState } from 'react';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {}

const EyeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3l18 18" />
    <path d="M10.6 5.1A10.9 10.9 0 0112 5c7 0 10.5 7 10.5 7a13.5 13.5 0 01-3.1 4M6.5 6.6C3.4 8.5 1.5 12 1.5 12s3.5 7 10.5 7c1.4 0 2.6-.3 3.7-.7" />
    <path d="M9.9 9.9a3 3 0 004.2 4.2" />
  </svg>
);

/**
 * PasswordInput — ô nhập mật khẩu dùng chung, có icon con mắt để bật/tắt
 * hiển thị. Giữ nguyên className border/rounded sẵn có ở các form hiện tại
 * để không phải đổi style toàn trang login/register (chưa tới phase migrate).
 */
export default function PasswordInput({ className = '', ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        className={`w-full pr-10 ${className}`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}
