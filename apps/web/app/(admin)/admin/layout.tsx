'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCurrentUser, isLoggedIn } from '../../../lib/auth-client';

// Chỉ ADMIN/SUPER_ADMIN được xem giao diện quản trị — khớp với RolesGuard
// phía API (apps/api/src/modules/admin/admin.controller.ts).
const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [checkedAuth, setCheckedAuth] = useState(false);

  useEffect(() => {
    // Trước đây layout này KHÔNG có bất kỳ guard nào — bất kỳ ai biết URL
    // /admin/* đều xem được toàn bộ giao diện quản trị (dashboard, KYC, đối
    // soát...) dù các API bên dưới vẫn có RolesGuard chặn ở tầng dữ liệu.
    // Đây vẫn là lỗ hổng lộ UI + trải nghiệm sai cho người không có quyền.
    // Đọc localStorage sau khi mount (không phải lúc render) để tránh
    // hydration mismatch — cùng pattern với account/change-password/page.tsx.
    const user = getCurrentUser();
    const hasAdminRole = !!user && user.roles.some((role) => ADMIN_ROLES.includes(role));
    if (!isLoggedIn() || !hasAdminRole) {
      window.location.href = '/login';
      return;
    }
    setCheckedAuth(true);
  }, []);

  const navItems = [
    { href: '/admin/dashboard', label: '📊 Tổng quan' },
    { href: '/admin/businesses', label: '🏢 Hộ Kinh Doanh' },
    { href: '/admin/stores', label: '🏪 Gian hàng' },
    { href: '/admin/products', label: '📦 Sản phẩm' },
    { href: '/seller/dashboard', label: '🏬 Kênh Người Bán' },
    { href: '/admin/payouts', label: '💸 Chi trả Hoa hồng' },
    { href: '/admin/reconciliation', label: '⚖️ Đối soát Thanh toán' },
    { href: '/admin/audit-logs', label: '📜 Audit Logs' },
    { href: '/admin/security', label: '🔐 Bảo mật 2FA' },
    { href: '/admin/qa-test', label: '🧪 QA Test' },
  ];

  if (!checkedAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-neutral-400">
        Đang kiểm tra quyền truy cập...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900/5 text-neutral-800">
      {/* Top Banner Header */}
      <header className="border-b border-neutral-800 bg-neutral-950 text-white shadow-lg sticky top-0 z-30">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-red-600 to-rose-700 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-sm ring-1 ring-white/20">
              <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
              Admin System
            </span>
            <div className="h-4 w-px bg-neutral-800 hidden sm:block" />
            <span className="font-semibold text-neutral-100 text-sm sm:text-base tracking-tight">
              ShopGo 369 — Ban Quản Trị Hệ Thống
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/member/register-business"
              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/70 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-900/80 hover:text-white"
            >
              <span>🏬 Form Đăng Ký Gian Hàng</span>
            </Link>
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-lg border border-neutral-700/60 bg-neutral-900/80 px-3 py-1.5 text-xs font-medium text-neutral-300 transition hover:border-neutral-500 hover:bg-neutral-800 hover:text-white"
            >
              <span>← Trở về Sàn ShopGo</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Glassmorphism Tab Navigation */}
      <div className="sticky top-[57px] z-20 border-b border-neutral-200/80 bg-white/90 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex max-w-7xl overflow-x-auto px-4 sm:px-6 scrollbar-none">
          <nav className="flex gap-1.5 py-2.5">
            {navItems.map((item) => {
              const active = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                    active
                      ? 'bg-neutral-900 text-white shadow-md shadow-neutral-900/20 ring-1 ring-neutral-900'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="pb-12">{children}</div>
    </div>
  );
}
