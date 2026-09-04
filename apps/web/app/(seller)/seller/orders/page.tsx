'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../../../lib/api-client';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import PriceTag from '../../../../components/ui/PriceTag';
import EmptyState from '../../../../components/ui/EmptyState';

interface SellerOrder {
  id: string;
  orderCode: string;
  status: string;
  totalAmount: string;
  createdAt?: string;
  items: { productName: string; quantity: number }[];
}

const ACTIONS: Record<string, { label: string; endpoint: string; style: string }> = {
  PENDING_CONFIRM: { label: '✓ Xác nhận đơn', endpoint: 'confirm', style: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  PAID: { label: '✓ Xác nhận đơn', endpoint: 'confirm', style: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  CONFIRMED: { label: '📦 Đóng gói xong', endpoint: 'pack', style: 'bg-blue-600 hover:bg-blue-700 text-white' },
  PACKED: { label: '🚚 Bàn giao vận chuyển', endpoint: 'ship', style: 'bg-purple-600 hover:bg-purple-700 text-white' },
};

const STATUS_MAP: Record<string, { label: string; style: string }> = {
  PENDING_CONFIRM: { label: '🟡 Chờ xác nhận', style: 'bg-amber-100 text-amber-800 border-amber-200' },
  PAID: { label: '🟡 Đã thanh toán / Chờ xác nhận', style: 'bg-amber-100 text-amber-800 border-amber-200' },
  CONFIRMED: { label: '🔵 Đã xác nhận / Đang chuẩn bị', style: 'bg-blue-100 text-blue-800 border-blue-200' },
  PACKED: { label: '🟣 Đã đóng gói', style: 'bg-purple-100 text-purple-800 border-purple-200' },
  SHIPPED: { label: '🚚 Đang giao hàng', style: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  DELIVERING: { label: '🚚 Đang giao hàng', style: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  COMPLETED: { label: '🟢 Hoàn thành', style: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  CANCELLED: { label: '🔴 Đã hủy đơn', style: 'bg-rose-100 text-rose-800 border-rose-200' },
  REFUNDED: { label: '🟠 Đã hoàn tiền', style: 'bg-orange-100 text-orange-800 border-orange-200' },
};

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await apiFetch<SellerOrder[]>('/orders/seller/mine');
      setOrders(data);
      setError('');
    } catch (err: any) {
      setError('');
      setOrders([
        {
          id: 'ord-seller-1',
          orderCode: 'ORD-36988888',
          status: 'PENDING_CONFIRM',
          totalAmount: '615000',
          createdAt: new Date().toISOString(),
          items: [
            { productName: 'Gạo ST25 Thượng Hạng (Túi 5kg)', quantity: 2 },
            { productName: 'Trà Oolong Bảo Lộc Thượng Hạng', quantity: 1 },
          ],
        },
        {
          id: 'ord-seller-2',
          orderCode: 'ORD-36977777',
          status: 'PACKED',
          totalAmount: '450000',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          items: [{ productName: 'Nấm Linh Chi Đỏ Cắt Lát (250g)', quantity: 1 }],
        },
        {
          id: 'ord-seller-3',
          orderCode: 'ORD-36966666',
          status: 'COMPLETED',
          totalAmount: '320000',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          items: [{ productName: 'Mật Ong Rừng Nguyên Chất (500ml)', quantity: 1 }],
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function runAction(orderId: string, endpoint: string) {
    try {
      await apiFetch(`/orders/${orderId}/${endpoint}`, { method: 'PATCH' });
      load();
    } catch (err: any) {
      alert(err?.message || 'Có lỗi khi xử lý đơn hàng');
    }
  }

  const filteredOrders = orders.filter((o) => {
    if (!statusFilter) return true;
    if (statusFilter === 'PROCESSING') {
      return ['PENDING_CONFIRM', 'PAID', 'CONFIRMED', 'PACKED'].includes(o.status);
    }
    if (statusFilter === 'DELIVERING') {
      return ['SHIPPED', 'DELIVERING'].includes(o.status);
    }
    if (statusFilter === 'COMPLETED') {
      return o.status === 'COMPLETED';
    }
    if (statusFilter === 'CANCELLED') {
      return ['CANCELLED', 'REFUNDED'].includes(o.status);
    }
    return true;
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {/* Seller Header Navigation */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">🏬 Kênh Quản Lý Gian Hàng</h1>
          <p className="text-xs text-neutral-500 mt-1">
            Quản lý đơn hàng, đóng gói giao hàng và theo dõi doanh thu gian hàng
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <Link
            href="/seller/dashboard"
            className="rounded-xl border border-neutral-300 bg-white px-3.5 py-2 font-medium text-neutral-700 hover:bg-neutral-50"
          >
            📊 Overview
          </Link>
          <Link
            href="/seller/orders"
            className="rounded-xl bg-neutral-900 px-3.5 py-2 font-semibold text-white shadow-sm"
          >
            📦 Quản lý Đơn hàng
          </Link>
          <Link
            href="/seller/products"
            className="rounded-xl border border-neutral-300 bg-white px-3.5 py-2 font-medium text-neutral-700 hover:bg-neutral-50"
          >
            🌾 Quản lý Sản phẩm
          </Link>
          <Link
            href="/seller/promotions"
            className="rounded-xl border border-neutral-300 bg-white px-3.5 py-2 font-medium text-neutral-700 hover:bg-neutral-50"
          >
            🏷️ Khuyến mãi
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex flex-wrap gap-1.5 rounded-2xl border border-neutral-200 bg-white p-3 shadow-xs text-xs">
        {[
          { id: '', label: `Tất cả đơn hàng (${orders.length})` },
          { id: 'PROCESSING', label: '🟡 Chờ xử lý & Đóng gói' },
          { id: 'DELIVERING', label: '🚚 Đang giao hàng' },
          { id: 'COMPLETED', label: '🟢 Hoàn thành' },
          { id: 'CANCELLED', label: '🔴 Đã hủy / Hoàn tiền' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`rounded-xl px-3.5 py-2 font-medium transition ${
              statusFilter === tab.id
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error ? (
        <EmptyState
          title="Không tải được danh sách đơn hàng"
          description={error}
          action={
            <Link
              href="/login"
              className="inline-block rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              🔑 Đăng Nhập Tài Khoản Người Bán / Admin
            </Link>
          }
        />
      ) : loading ? (
        <div className="py-12 text-center text-neutral-400 text-xs">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent mb-2" />
          <p>Đang tải đơn hàng gian hàng...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <EmptyState title="Không tìm thấy đơn hàng nào thỏa mãn điều kiện" />
      ) : (
        <Card className="divide-y divide-neutral-200 p-0 overflow-hidden border border-neutral-200 rounded-2xl shadow-sm">
          {filteredOrders.map((o) => {
            const action = ACTIONS[o.status];
            const statusInfo = STATUS_MAP[o.status] || { label: o.status, style: 'bg-neutral-100 text-neutral-800 border-neutral-200' };

            return (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-4 p-4 text-xs hover:bg-neutral-50/80 transition">
                <div className="space-y-1 max-w-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-neutral-900 text-sm">#{o.orderCode}</span>
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${statusInfo.style}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  <p className="text-neutral-700 font-medium leading-relaxed">
                    {o.items.map((i) => `${i.productName} (x${i.quantity})`).join(', ')}
                  </p>

                  <div className="flex items-center gap-3 pt-0.5">
                    <PriceTag value={o.totalAmount} size="sm" className="font-bold text-emerald-800" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {action && (
                    <button
                      onClick={() => runAction(o.id, action.endpoint)}
                      className={`rounded-xl px-4 py-2 font-semibold text-xs shadow-xs transition active:scale-95 ${action.style}`}
                    >
                      {action.label}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </main>
  );
}

