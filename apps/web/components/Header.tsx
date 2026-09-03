'use client';

import { useEffect, useState } from 'react';
import { AuthUser, clearAuth, getCurrentUser } from '../lib/auth-client';

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
    <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
      <a href="/" className="text-2xl font-bold">
        369 SHOP
      </a>
      <nav className="flex items-center gap-4 text-sm text-gray-600">
        {!mounted ? null : user ? (
          <>
            <span className="text-gray-800">
              Xin chào, <span className="font-medium">{user.fullName}</span>
            </span>
            <a href="/cart">Giỏ hàng</a>
            <a href="/orders">Đơn hàng</a>
            {user.roles.includes('SELLER') && <a href="/seller/dashboard">Kênh người bán</a>}
            <a href="/account/change-password">Đổi mật khẩu</a>
            <button onClick={handleLogout} className="text-red-600 hover:underline">
              Đăng xuất
            </button>
          </>
        ) : (
          <>
            <a href="/login">Đăng nhập</a>
            <a href="/seller/dashboard">Kênh người bán</a>
          </>
        )}
      </nav>
    </header>
  );
}
