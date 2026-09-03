'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { href: '/admin/dashboard', label: '📊 Tổng quan' },
    { href: '/admin/businesses', label: '🏢 Hộ Kinh Doanh' },
    { href: '/admin/stores', label: '🏪 Gian hàng' },
    { href: '/admin/products', label: '📦 Sản phẩm' },
    { href: '/seller/dashboard', label: '🏬 Kênh Người Bán' },
    { href: '/admin/payouts', label: '💸 Chi trả Hoa hồng' },
    { href: '/admin/reconciliation', label: '⚖️ Đối soát Thanh toán' },
    { href: '/admin/audit-logs', label: '📜 Audit Logs' },
  ];

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
