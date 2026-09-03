'use client';

import { useEffect, useRef, useState } from 'react';
import { AuthUser, clearAuth, getCurrentUser } from '../lib/auth-client';

export default function Header() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUser(getCurrentUser());
    setMounted(true);

    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleLogout() {
    clearAuth();
    window.location.href = '/';
  }

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/90 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Logo Brand */}
        <a href="/" className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight text-emerald-800 hover:opacity-90 transition">
          <span className="text-xl">🌾</span> 369 SHOP
        </a>

        <nav className="flex items-center gap-4 text-xs text-neutral-600 sm:gap-5">
          {!mounted ? null : user ? (
            <>
              <a href="/cart" className="font-semibold text-neutral-700 hover:text-emerald-700 transition">
                🛒 Giỏ hàng
              </a>
              <a href="/orders" className="font-semibold text-neutral-700 hover:text-emerald-700 transition">
                📦 Đơn hàng
              </a>

              <a
                href="/member/register-business"
                className="hidden sm:inline-flex items-center gap-1 rounded-xl border border-emerald-600/40 bg-emerald-50 px-3 py-1.5 font-bold text-emerald-800 transition hover:bg-emerald-100"
              >
                🏬 Đăng ký Gian hàng
              </a>

              <a
                href="/admin/dashboard"
                className="rounded-xl bg-red-600 px-3 py-1.5 font-bold text-white shadow-sm transition hover:bg-red-700 active:scale-95"
              >
                👑 Ban Quản Trị
              </a>

              {(user.roles.includes('SELLER') || user.roles.includes('ADMIN') || user.roles.includes('SUPER_ADMIN')) && (
                <a href="/seller/dashboard" className="font-bold text-blue-700 hover:underline">
                  🏬 Kênh người bán
                </a>
              )}

              {/* USER PROFILE DROPDOWN MENU */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 font-semibold text-neutral-800 transition hover:border-neutral-300 hover:bg-neutral-100 active:scale-95 shadow-2xs"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-700 text-[11px] font-bold text-white shadow-xs">
                    {user.fullName ? user.fullName.charAt(0).toUpperCase() : '👤'}
                  </span>
                  <span className="max-w-[100px] truncate sm:max-w-[140px] text-xs font-semibold">{user.fullName}</span>
                  <svg
                    className={`h-3.5 w-3.5 text-neutral-500 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2.5 w-56 rounded-2xl border border-neutral-200/90 bg-white p-2 shadow-xl ring-1 ring-black/5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-3 py-2.5 border-b border-neutral-100 mb-1 rounded-xl bg-neutral-50/70">
                      <p className="font-bold text-xs text-neutral-900 truncate">{user.fullName}</p>
                      <p className="text-[11px] text-neutral-500 truncate font-mono mt-0.5">{user.email}</p>
                    </div>

                    <a
                      href="/member/profile"
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <span>👤 Hồ sơ tài khoản</span>
                    </a>

                    <a
                      href="/account/change-password"
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <span>🔑 Đổi mật khẩu</span>
                    </a>

                    <div className="my-1 border-t border-neutral-100" />

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                    >
                      <span>🚪 Đăng xuất tài khoản</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <a href="/login" className="font-semibold text-neutral-700 hover:text-emerald-700 transition">
                Đăng nhập
              </a>
              <a href="/member/register-business" className="font-bold text-emerald-700 hover:underline">
                🏬 Đăng ký Gian hàng
              </a>
              <a href="/seller/dashboard" className="font-semibold text-neutral-700 hover:text-emerald-700 transition">
                Kênh người bán
              </a>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
