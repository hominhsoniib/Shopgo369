'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../../../lib/api-client';

interface OverviewData {
  totalUsers: number;
  totalMembers: number;
  pendingMembers: number;
  totalBusinesses: number;
  pendingBusinesses: number;
  totalStores: number;
  totalProducts: number;
}

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<OverviewData>('/admin/dashboard/overview')
      .then(setOverview)
      .catch((err) => setError(typeof err?.message === 'string' ? err.message : 'Bạn cần đăng nhập tài khoản Admin / Super Admin'));
  }, []);

  if (error) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="rounded-2xl border border-red-200/80 bg-white p-8 shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-2xl">
            🔒
          </div>
          <h1 className="mt-4 text-xl font-bold text-neutral-900">Quyền Truy Cập Ban Quản Trị</h1>
          <p className="mt-2 text-xs text-neutral-600 leading-relaxed">{error}</p>
          <div className="mt-6">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-xs font-semibold text-white shadow-lg shadow-red-600/30 transition hover:bg-red-700"
            >
              🔑 Đăng nhập tài khoản Admin
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!overview) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 animate-pulse">
          <div className="h-7 w-64 rounded-lg bg-neutral-200" />
          <div className="mt-2 h-4 w-96 rounded-lg bg-neutral-100" />
        </div>
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-neutral-200/60 animate-pulse" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-neutral-200/60 animate-pulse" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Title Bar */}
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">
            Ban Quản Trị ShopGo 369
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-neutral-500">
            Giám sát vận hành toàn sàn, kiểm duyệt Hộ Kinh Doanh, sản phẩm & đối soát tài chính
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Hệ thống ổn định
          </span>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <section className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          icon="👥"
          label="Tổng người dùng"
          value={overview.totalUsers}
          subText="Tài khoản trên toàn sàn"
        />
        <StatCard
          icon="🌟"
          label="Thành viên 369"
          value={overview.totalMembers}
          subText="Xác thực thành viên HTX"
        />
        <StatCard
          icon="🏢"
          label="Hộ KD chờ duyệt KYC"
          value={overview.pendingBusinesses}
          warn={overview.pendingBusinesses > 0}
          link="/admin/businesses?status=PENDING_VERIFICATION"
          subText="Cần phê duyệt mở gian hàng"
        />
        <StatCard
          icon="🏪"
          label="Gian hàng hoạt động"
          value={overview.totalStores}
          link="/admin/stores"
          subText="Gian hàng đang vận hành"
        />
      </section>

      {/* Quick Action Grid */}
      <section className="grid gap-6 md:grid-cols-3">
        <ActionCard
          icon="🏢"
          title="Duyệt Hộ Kinh Doanh (KYC)"
          desc="Xem thông tin đăng ký, CCCD và Mã số thuế của các hộ kinh doanh để phê duyệt mở gian hàng bán nông sản."
          badge={overview.pendingBusinesses > 0 ? `${overview.pendingBusinesses} cần duyệt` : undefined}
          href="/admin/businesses"
          btnText="Quản lý Hộ KD"
        />
        <ActionCard
          icon="🏪"
          title="Quản lý Gian hàng (Stores)"
          desc="Xem danh sách gian hàng toàn hệ thống, giám sát hoạt động và xử lý hạ/đình chỉ gian hàng vi phạm."
          href="/admin/stores"
          btnText="Danh sách Gian hàng"
        />
        <ActionCard
          icon="📦"
          title="Kiểm duyệt Sản phẩm"
          desc="Giám sát danh mục sản phẩm nông sản, đặc sản toàn sàn; khóa hoặc gỡ bỏ sản phẩm không đạt tiêu chuẩn."
          href="/admin/products"
          btnText="Kiểm duyệt Sản phẩm"
        />
        <ActionCard
          icon="💸"
          title="Duyệt Chi trả Hoa hồng"
          desc="Phê duyệt lệnh chi trả hoa hồng giới thiệu (Payouts) định kỳ cho các thành viên HTX 369."
          href="/admin/payouts"
          btnText="Quản lý Payout"
        />
        <ActionCard
          icon="⚖️"
          title="Đối soát Thanh toán"
          desc="So khớp giao dịch hàng ngày giữa Cổng thanh toán (VNPay/MoMo) ↔ Đơn hàng ↔ Kế toán Python."
          href="/admin/reconciliation"
          btnText="Xem Nhật ký Đối soát"
        />
        <ActionCard
          icon="📜"
          title="Audit Logs (Nhật ký)"
          desc="Tra cứu chi tiết lịch sử mọi thao tác quản trị, thay đổi cấu hình nhạy cảm của toàn bộ Admin."
          href="/admin/audit-logs"
          btnText="Xem Nhật ký Thao tác"
        />
      </section>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  warn,
  link,
  subText,
}: {
  icon: string;
  label: string;
  value: number;
  warn?: boolean;
  link?: string;
  subText?: string;
}) {
  const content = (
    <div className="group relative overflow-hidden rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-neutral-500">{label}</p>
        <span className="text-lg">{icon}</span>
      </div>
      <p className={`mt-3 text-3xl font-extrabold tracking-tight ${warn ? 'text-amber-600' : 'text-neutral-900'}`}>
        {value.toLocaleString('vi-VN')}
      </p>
      {subText && <p className="mt-1 text-[11px] text-neutral-400">{subText}</p>}
    </div>
  );
  return link ? <Link href={link}>{content}</Link> : content;
}

function ActionCard({
  icon,
  title,
  desc,
  badge,
  href,
  btnText,
}: {
  icon: string;
  title: string;
  desc: string;
  badge?: string;
  href: string;
  btnText: string;
}) {
  return (
    <div className="group flex flex-col justify-between rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-neutral-300">
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{icon}</span>
            <h2 className="font-bold text-sm text-neutral-900">{title}</h2>
          </div>
          {badge && (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 shadow-sm animate-pulse">
              {badge}
            </span>
          )}
        </div>
        <p className="mt-3 text-xs text-neutral-500 leading-relaxed">{desc}</p>
      </div>
      <div className="mt-6 pt-4 border-t border-neutral-100">
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:bg-neutral-800 hover:shadow-md"
        >
          <span>{btnText}</span>
          <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
        </Link>
      </div>
    </div>
  );
}
