'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../../lib/api-client';

interface SellerOrder {
  id: string;
  orderCode: string;
  status: string;
  totalAmount: string;
  items: { productName: string; quantity: number }[];
}

const ACTIONS: Record<string, { label: string; endpoint: string }> = {
  PENDING_CONFIRM: { label: 'Xác nhận đơn', endpoint: 'confirm' },
  PAID: { label: 'Xác nhận đơn', endpoint: 'confirm' },
  CONFIRMED: { label: 'Đóng gói xong', endpoint: 'pack' },
  PACKED: { label: 'Bàn giao vận chuyển', endpoint: 'ship' },
};

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [error, setError] = useState('');

  async function load() {
    try {
      const data = await apiFetch<SellerOrder[]>('/orders/seller/mine');
      setOrders(data);
    } catch (err: any) {
      setError(err.message ?? 'Không tải được danh sách đơn hàng');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function runAction(orderId: string, endpoint: string) {
    await apiFetch(`/orders/${orderId}/${endpoint}`, { method: 'PATCH' });
    load();
  }

  if (error) return <main className="mx-auto max-w-4xl px-4 py-8 text-gray-500">{error}</main>;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-xl font-bold">Đơn hàng của gian hàng</h1>
      <div className="divide-y rounded border">
        {orders.length === 0 && <p className="p-4 text-sm text-gray-400">Chưa có đơn hàng nào.</p>}
        {orders.map((o) => {
          const action = ACTIONS[o.status];
          return (
            <div key={o.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{o.orderCode} — {o.status}</p>
                <p className="text-gray-500">
                  {o.items.map((i) => `${i.productName} x${i.quantity}`).join(', ')}
                </p>
                <p className="text-red-600">{Number(o.totalAmount).toLocaleString('vi-VN')}đ</p>
              </div>
              {action && (
                <button onClick={() => runAction(o.id, action.endpoint)}
                  className="rounded bg-red-600 px-3 py-1.5 text-xs text-white">
                  {action.label}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
