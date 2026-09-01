'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../../lib/api-client';

interface Overview {
  revenue: number;
  revenueOrderCount: number;
  totalOrders: number;
  pendingOrders: number;
  ordersByStatus: { status: string; count: number }[];
}

interface TopProduct {
  productId: string;
  productName: string;
  quantitySold: number;
  revenue: number;
}

interface LowStockItem {
  productId: string;
  name: string;
  quantityOnHand: number;
  reservedQuantity: number;
}

export default function SellerDashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      apiFetch<Overview>('/seller/dashboard/overview'),
      apiFetch<TopProduct[]>('/seller/dashboard/top-products?limit=5'),
      apiFetch<LowStockItem[]>('/seller/dashboard/low-stock?threshold=10'),
    ])
      .then(([o, tp, ls]) => {
        setOverview(o);
        setTopProducts(tp);
        setLowStock(ls);
      })
      .catch((err) => setError(typeof err?.message === 'string' ? err.message : 'Chưa đăng nhập vai trò seller'));
  }, []);

  if (error) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="rounded-xl border bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold text-gray-800">🔒 Kênh Người Bán ShopGo</h1>
          <p className="mt-2 text-sm text-gray-600">
            Bạn cần đăng nhập bằng tài khoản Người Bán (Seller) để truy cập Dashboard.
          </p>
          <div className="my-4 rounded-lg bg-amber-50 p-3 text-left text-xs text-amber-800 border border-amber-200">
            <p className="font-semibold">🔑 Tài khoản Seller thử nghiệm:</p>
            <p className="mt-1">Email: <code className="font-mono font-bold text-amber-900">seller@369.vn</code></p>
            <p>Mật khẩu: <code className="font-mono font-bold text-amber-900">SellerMe@369</code></p>
          </div>
          <a
            href="/login"
            className="inline-block rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white shadow transition hover:bg-blue-700"
          >
            Đăng nhập ngay
          </a>
        </div>
      </main>
    );
  }
  if (!overview) return <main className="mx-auto max-w-6xl px-4 py-8 text-gray-400">Đang tải...</main>;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">Seller Center — Tổng quan</h1>
        <nav className="flex gap-4 text-sm text-gray-500">
          <a href="/seller/orders">Đơn hàng</a>
          <a href="/seller/products">Sản phẩm</a>
          <a href="/seller/promotions">Khuyến mãi</a>
        </nav>
      </div>

      <section className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Doanh thu" value={`${overview.revenue.toLocaleString('vi-VN')}đ`} highlight />
        <StatCard label="Đơn tính doanh thu" value={overview.revenueOrderCount} />
        <StatCard label="Tổng đơn" value={overview.totalOrders} />
        <StatCard label="Đơn cần xử lý" value={overview.pendingOrders} warn={overview.pendingOrders > 0} />
      </section>

      <section className="mb-8 grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="mb-3 font-semibold">🔥 Sản phẩm bán chạy</h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-400">Chưa có dữ liệu bán hàng.</p>
          ) : (
            <div className="divide-y rounded border">
              {topProducts.map((p) => (
                <div key={p.productId} className="flex justify-between px-3 py-2 text-sm">
                  <span>{p.productName}</span>
                  <span className="text-gray-500">
                    {p.quantitySold} đã bán — {p.revenue.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-3 font-semibold">⚠️ Sắp hết hàng</h2>
          {lowStock.length === 0 ? (
            <p className="text-sm text-gray-400">Không có sản phẩm nào sắp hết hàng.</p>
          ) : (
            <div className="divide-y rounded border">
              {lowStock.map((p) => (
                <div key={p.productId} className="flex justify-between px-3 py-2 text-sm">
                  <span>{p.name}</span>
                  <span className="text-amber-600">
                    Còn {p.quantityOnHand - p.reservedQuantity} (đang giữ chỗ {p.reservedQuantity})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Đơn hàng theo trạng thái</h2>
        <div className="flex flex-wrap gap-2">
          {overview.ordersByStatus.map((s) => (
            <span key={s.status} className="rounded-full border px-3 py-1 text-xs text-gray-600">
              {s.status}: {s.count}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
  highlight,
  warn,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p
        className={`mt-1 text-xl font-bold ${
          highlight ? 'text-red-600' : warn ? 'text-amber-600' : 'text-gray-900'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
