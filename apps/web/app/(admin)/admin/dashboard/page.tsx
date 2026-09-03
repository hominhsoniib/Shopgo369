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
      .catch((err) => setError(typeof err?.message === 'string' ? err.message : 'Bạn cần đăng nhập vai trò Admin / Super Admin'));
  }, []);

  if (error) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="rounded-xl border bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold text-gray-800">🔒 Quyền Truy Cập Ban Quản Trị</h1>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
          <Link
            href="/login"
            className="mt-4 inline-block rounded-lg bg-red-600 px-6 py-2 text-sm font-medium text-white shadow transition hover:bg-red-700"
          >
            Đăng nhập tài khoản Admin
          </Link>
        </div>
      </main>
    );
  }

  if (!overview) return <main className="mx-auto max-w-6xl px-4 py-8 text-gray-400">Đang tải số liệu tổng quan...</main>;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ban Quản Trị ShopGo 369</h1>
          <p className="text-sm text-gray-500">Tổng quan hệ thống, kiểm duyệt gian hàng và đối soát vận hành</p>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <section className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Tổng người dùng" value={overview.totalUsers} />
        <StatCard label="Thành viên 369" value={overview.totalMembers} />
        <StatCard
          label="Hộ KD chờ duyệt KYC"
          value={overview.pendingBusinesses}
          warn={overview.pendingBusinesses > 0}
          link="/admin/businesses?status=PENDING_VERIFICATION"
        />
        <StatCard label="Gian hàng hoạt động" value={overview.totalStores} link="/admin/stores" />
      </section>

      {/* Quick Action Grid */}
      <section className="grid gap-6 md:grid-cols-3">
        <ActionCard
          title="🏢 Duyệt Hộ Kinh Doanh (KYC)"
          desc="Xem thông tin đăng ký, CCCD và Mã số thuế của các hộ kinh doanh để phê duyệt mở gian hàng."
          badge={overview.pendingBusinesses > 0 ? `${overview.pendingBusinesses} chờ duyệt` : undefined}
          href="/admin/businesses"
          btnText="Quản lý Hộ KD"
        />
        <ActionCard
          title="🏪 Quản lý Gian hàng (Stores)"
          desc="Xem danh sách gian hàng, giám sát hoạt động và hạ/đình chỉ gian hàng khi có vi phạm."
          href="/admin/stores"
          btnText="Danh sách Gian hàng"
        />
        <ActionCard
          title="📦 Kiểm duyệt Sản phẩm"
          desc="Giám sát danh mục sản phẩm toàn sàn, gỡ bỏ hoặc khóa các sản phẩm vi phạm tiêu chuẩn."
          href="/admin/products"
          btnText="Kiểm duyệt Sản phẩm"
        />
        <ActionCard
          title="💸 Duyệt Chi trả Hoa hồng"
          desc="Phê duyệt các đợt chi trả hoa hồng giới thiệu (Payouts) cho thành viên 369 theo kỳ."
          href="/admin/payouts"
          btnText="Quản lý Payout"
        />
        <ActionCard
          title="⚖️ Đối soát Thanh toán"
          desc="So khớp giao dịch hàng ngày giữa Cổng thanh toán (VNPay/MoMo) ↔ Đơn hàng ↔ Kế toán."
          href="/admin/reconciliation"
          btnText="Xem Nhật ký Đối soát"
        />
        <ActionCard
          title="📜 Nhật ký Thao tác (Audit Logs)"
          desc="Xem chi tiết lịch sử mọi thao tác quản trị, thay đổi dữ liệu nhạy cảm của các Admin."
          href="/admin/audit-logs"
          btnText="Xem Audit Logs"
        />
      </section>
    </main>
  );
}

function StatCard({ label, value, warn, link }: { label: string; value: number; warn?: boolean; link?: string }) {
  const content = (
    <div className="rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${warn ? 'text-amber-600' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
  return link ? <Link href={link}>{content}</Link> : content;
}

function ActionCard({
  title,
  desc,
  badge,
  href,
  btnText,
}: {
  title: string;
  desc: string;
  badge?: string;
  href: string;
  btnText: string;
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl border bg-white p-6 shadow-sm">
      <div>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">{title}</h2>
          {badge && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">{badge}</span>}
        </div>
        <p className="mt-2 text-xs text-gray-500 leading-relaxed">{desc}</p>
      </div>
      <div className="mt-5">
        <Link
          href={href}
          className="inline-block rounded-lg bg-neutral-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-neutral-800"
        >
          {btnText} →
        </Link>
      </div>
    </div>
  );
}
