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
    { href: '/admin/payouts', label: '💸 Chi trả Hoa hồng' },
    { href: '/admin/reconciliation', label: '⚖️ Đối soát Thanh toán' },
    { href: '/admin/audit-logs', label: '📜 Audit Logs' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-neutral-900 text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="rounded bg-red-600 px-2 py-1 text-xs font-bold uppercase tracking-wider text-white">
              Admin Portal
            </span>
            <span className="font-semibold text-gray-200">ShopGo 369 — Ban Quản Trị Hệ Thống</span>
          </div>
          <Link href="/" className="text-xs text-gray-400 hover:text-white">
            ← Trở về Sàn ShopGo
          </Link>
        </div>
      </header>

      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl overflow-x-auto px-4">
          <nav className="flex gap-2 py-2">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    active
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {children}
    </div>
  );
}
