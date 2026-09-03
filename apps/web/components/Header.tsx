'use client';

import { useEffect, useState } from 'react';
import { AuthUser, clearAuth, getCurrentUser } from '../lib/auth-client';
import Button from './ui/Button';

/**
 * Header dùng chung cho toàn bộ web app — đưa vào app/layout.tsx (root layout)
 * để xuất hiện ở mọi trang, thay vì mỗi trang tự lặp lại header tĩnh riêng.
 *
 * PHẢI là Client Component ('use client') vì cần đọc localStorage để biết
 * người dùng đã đăng nhập hay chưa — điều mà Server Component không làm được
 * (localStorage chỉ tồn tại trên trình duyệt, không có trên server).
 */
export default function Header() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Đọc localStorage SAU khi component đã mount trên client — tránh lỗi
    // hydration mismatch (server render ra "chưa đăng nhập", client ban đầu
    // cũng phải render y hệt trước khi useEffect chạy).
    setUser(getCurrentUser());
    setMounted(true);
  }, []);

  function handleLogout() {
    clearAuth();
    window.location.href = '/'; // full reload — Header remount lại, đọc localStorage đúng trạng thái mới (đã xoá)
  }

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <a href="/" className="font-display text-2xl font-semibold text-primary-800">
          369 SHOP
        </a>
        <nav className="flex items-center gap-5 text-sm text-neutral-600">
          {!mounted ? null : user ? (
            <>
              <span className="hidden text-neutral-700 sm:inline">
                Xin chào, <span className="font-medium text-neutral-900">{user.fullName}</span>
              </span>
              <a href="/cart" className="hover:text-primary-700">
                Giỏ hàng
              </a>
              <a href="/orders" className="hover:text-primary-700">
                Đơn hàng
              </a>
              <a
                href="/member/register-business"
                className="rounded-lg border border-emerald-600 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
              >
                🏬 Đăng ký Gian hàng
              </a>
              {(user.roles.includes('ADMIN') || user.roles.includes('SUPER_ADMIN')) && (
                <a
                  href="/admin/dashboard"
                  className="rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white shadow-sm transition hover:bg-red-700"
                >
                  👑 Ban Quản Trị
                </a>
              )}
              {(user.roles.includes('SELLER') || user.roles.includes('ADMIN') || user.roles.includes('SUPER_ADMIN')) && (
                <a href="/seller/dashboard" className="font-medium text-blue-700 hover:underline">
                  🏬 Kênh người bán
                </a>
              )}
              {user.roles.includes('MEMBER') && (
                <a href="/member/profile" className="hover:text-primary-700">
                  👤 Thành viên
                </a>
              )}
              <a href="/account/change-password" className="hover:text-primary-700">
                Đổi mật khẩu
              </a>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-danger-600 hover:bg-danger-50">
                Đăng xuất
              </Button>
            </>
          ) : (
            <>
              <a href="/login" className="hover:text-primary-700">
                Đăng nhập
              </a>
              <a href="/member/register-business" className="font-medium text-emerald-700 hover:underline">
                🏬 Đăng ký Gian hàng
              </a>
              <a href="/seller/dashboard" className="hover:text-primary-700">
                Kênh người bán
              </a>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
