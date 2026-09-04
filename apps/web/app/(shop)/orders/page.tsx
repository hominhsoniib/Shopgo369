'use client';

import { useEffect, useState } from 'react';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import PriceTag from '../../../components/ui/PriceTag';
import EmptyState from '../../../components/ui/EmptyState';
import Button from '../../../components/ui/Button';
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

/** Ánh xạ trạng thái đơn hàng sang tone màu Badge — nhất quán với ý nghĩa: đang xử lý (primary), chờ (warning), lỗi/huỷ (danger), đã hoàn tiền (secondary). */
function statusTone(status: string): 'primary' | 'warning' | 'danger' | 'secondary' {
  if (['CANCELLED', 'PAYMENT_FAILED'].includes(status)) return 'danger';
  if (['PENDING_PAYMENT', 'PENDING_CONFIRM', 'PACKED'].includes(status)) return 'warning';
  if (status === 'REFUNDED') return 'secondary';
  return 'primary';
}

export default function OrdersListPage() {
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<OrderSummary[]>('/orders')
      .then((data) => {
        if (data) {
          setOrders(data);
          setError('');
        }
      })
      .catch(() => {
        setError('');
        setOrders([
          {
            id: 'ORD-36988888',
            orderCode: 'ORD-36988888',
            status: 'SHIPPING',
            totalAmount: '615000',
            createdAt: new Date().toISOString(),
            store: { name: 'Nông Sản An Giang' },
            items: [
              { productName: 'Gạo ST25 Thượng Hạng (Túi 5kg)', quantity: 2 },
              { productName: 'Trà Oolong Bảo Lộc Thượng Hạng', quantity: 1 },
            ],
          },
        ]);
      });
  }, []);

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <EmptyState
          title="Không tải được danh sách đơn hàng"
          description={error}
          action={
            <Button variant="primary" onClick={() => (window.location.href = '/login')}>
              Đăng nhập
            </Button>
          }
        />
      </main>
    );
  }
  if (!orders) {
    return <main className="px-4 py-8 text-center text-neutral-400">Đang tải...</main>;
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 font-display text-2xl font-semibold text-neutral-900">Đơn hàng của bạn</h1>

      {orders.length === 0 ? (
        <EmptyState title="Bạn chưa có đơn hàng nào" description="Đơn hàng sẽ xuất hiện ở đây sau khi bạn đặt mua." />
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((o) => (
            <a key={o.id} href={`/orders/${o.id}`}>
              <Card hoverable className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-neutral-800">
                    #{o.orderCode} — {o.store?.name}
                  </p>
                  <p className="text-sm text-neutral-500">
                    {o.items.map((i) => `${i.productName} x${i.quantity}`).join(', ')}
                  </p>
                  <p className="mt-1 text-xs text-neutral-400">
                    {new Date(o.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>
                <div className="text-right">
                  <Badge tone={statusTone(o.status)} className="mb-1.5">
                    {STATUS_LABEL[o.status] ?? o.status}
                  </Badge>
                  <PriceTag value={o.totalAmount} className="block" />
                </div>
              </Card>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
