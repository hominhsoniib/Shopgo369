'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api-client';

interface OrderSummary {
  id: string;
  orderCode: string;
  status: string;
  totalAmount: string;
  createdAt: string;
  store: { name: string };
  items: { productName: string; quantity: number }[];
}

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  PENDING_CONFIRM: 'Chờ xác nhận',
  PAID: 'Đã thanh toán',
  CONFIRMED: 'Đã xác nhận',
  PACKED: 'Đã đóng gói',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã huỷ',
  PAYMENT_FAILED: 'Thanh toán thất bại',
  REFUNDED: 'Đã hoàn tiền',
};

export default function OrdersListPage() {
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<OrderSummary[]>('/orders')
      .then(setOrders)
      .catch((err) => setError(err.message ?? 'Không tải được danh sách đơn hàng'));
  }, []);

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8 text-center">
        <p className="text-gray-500">{error}</p>
        <a href="/login" className="mt-4 inline-block text-red-600">
          Đăng nhập
        </a>
      </main>
    );
  }
  if (!orders) {
    return <main className="px-4 py-8 text-center text-gray-400">Đang tải...</main>;
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-xl font-bold">Đơn hàng của bạn</h1>

      {orders.length === 0 ? (
        <p className="text-gray-500">Bạn chưa có đơn hàng nào.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((o) => (
            <a
              key={o.id}
              href={`/orders/${o.id}`}
              className="flex items-center justify-between rounded-lg border p-4 transition hover:shadow-md"
            >
              <div>
                <p className="font-medium">
                  #{o.orderCode} — {o.store?.name}
                </p>
                <p className="text-sm text-gray-500">
                  {o.items.map((i) => `${i.productName} x${i.quantity}`).join(', ')}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {new Date(o.createdAt).toLocaleString('vi-VN')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-blue-600">{STATUS_LABEL[o.status] ?? o.status}</p>
                <p className="font-semibold text-red-600">{Number(o.totalAmount).toLocaleString('vi-VN')}đ</p>
              </div>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
