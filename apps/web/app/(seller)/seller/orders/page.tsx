'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../../lib/api-client';
import Card from '../../../../components/ui/Card';
import Badge from '../../../../components/ui/Badge';
import Button from '../../../../components/ui/Button';
import PriceTag from '../../../../components/ui/PriceTag';
import EmptyState from '../../../../components/ui/EmptyState';

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

  if (error) return <main className="mx-auto max-w-4xl px-4 py-8 text-neutral-500">{error}</main>;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 font-display text-2xl font-semibold text-neutral-900">Đơn hàng của gian hàng</h1>
      {orders.length === 0 ? (
        <EmptyState title="Chưa có đơn hàng nào" />
      ) : (
        <Card className="divide-y divide-neutral-100 p-0">
          {orders.map((o) => {
            const action = ACTIONS[o.status];
            return (
              <div key={o.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-neutral-800">
                    {o.orderCode} — <Badge tone="neutral">{o.status}</Badge>
                  </p>
                  <p className="mt-1 text-neutral-500">
                    {o.items.map((i) => `${i.productName} x${i.quantity}`).join(', ')}
                  </p>
                  <PriceTag value={o.totalAmount} size="sm" className="mt-0.5 block" />
                </div>
                {action && (
                  <Button variant="primary" size="sm" onClick={() => runAction(o.id, action.endpoint)}>
                    {action.label}
                  </Button>
                )}
              </div>
            );
          })}
        </Card>
      )}
    </main>
  );
}
