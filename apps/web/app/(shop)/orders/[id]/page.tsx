'use client';

import { useEffect, useState } from 'react';
import Card from '../../../../components/ui/Card';
import Badge from '../../../../components/ui/Badge';
import Button from '../../../../components/ui/Button';
import PriceTag from '../../../../components/ui/PriceTag';
import { apiFetch } from '../../../../lib/api-client';

interface OrderDetail {
  id: string;
  orderCode: string;
  status: string;
  totalAmount: string;
  items: { productName: string; quantity: number; unitPrice: string }[];
  statusHistory: { toStatus: string; note: string | null; createdAt: string }[];
  shippingOrder: { status: string; trackingCode: string | null } | null;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  PENDING_CONFIRM: 'Chờ người bán xác nhận',
  PAID: 'Đã thanh toán',
  CONFIRMED: 'Đã xác nhận',
  PACKED: 'Đã đóng gói',
  SHIPPING: 'Đang giao hàng',
  DELIVERED: 'Đã giao',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã huỷ',
  PAYMENT_FAILED: 'Thanh toán thất bại',
  REFUNDED: 'Đã hoàn tiền',
};

function statusTone(status: string): 'primary' | 'warning' | 'danger' | 'secondary' {
  if (['CANCELLED', 'PAYMENT_FAILED'].includes(status)) return 'danger';
  if (['PENDING_PAYMENT', 'PENDING_CONFIRM', 'PACKED'].includes(status)) return 'warning';
  if (status === 'REFUNDED') return 'secondary';
  return 'primary';
}

export default function OrderTrackingPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      const data = await apiFetch<OrderDetail>(`/orders/${params.id}`);
      setOrder(data);
    } catch (err: any) {
      setError(err.message ?? 'Không tải được đơn hàng');
    }
  }

  useEffect(() => {
    load();
  }, [params.id]);

  async function confirmReceived() {
    await apiFetch(`/orders/${params.id}/confirm-received`, { method: 'PATCH' });
    load();
  }

  async function cancelOrder() {
    await apiFetch(`/orders/${params.id}/cancel`, { method: 'PATCH' });
    load();
  }

  if (error) return <main className="px-4 py-8 text-center text-neutral-500">{error}</main>;
  if (!order) return <main className="px-4 py-8 text-center text-neutral-400">Đang tải...</main>;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-2 font-display text-2xl font-semibold text-neutral-900">Đơn hàng {order.orderCode}</h1>
      <div className="mb-6">
        <Badge tone={statusTone(order.status)}>{STATUS_LABEL[order.status] ?? order.status}</Badge>
      </div>

      <Card className="mb-6 p-0">
        <h2 className="border-b border-neutral-200 px-4 py-3 font-medium text-neutral-800">Sản phẩm</h2>
        <div className="divide-y divide-neutral-100">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-neutral-700">{item.productName} x{item.quantity}</span>
              <PriceTag value={Number(item.unitPrice) * item.quantity} size="sm" />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3">
          <span className="font-medium text-neutral-800">Tổng</span>
          <PriceTag value={order.totalAmount} size="md" />
        </div>
      </Card>

      <section className="mb-6">
        <h2 className="mb-3 font-medium text-neutral-800">Lịch sử trạng thái</h2>
        <ol className="flex flex-col gap-3 border-l-2 border-neutral-200 pl-4">
          {order.statusHistory.map((h, i) => (
            <li key={i} className="relative text-sm">
              <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-primary-600" />
              <span className="font-medium text-neutral-800">{STATUS_LABEL[h.toStatus] ?? h.toStatus}</span>
              {h.note && <span className="text-neutral-400"> — {h.note}</span>}
              <div className="text-xs text-neutral-400">{new Date(h.createdAt).toLocaleString('vi-VN')}</div>
            </li>
          ))}
        </ol>
      </section>

      <div className="flex gap-3">
        {['PENDING_PAYMENT', 'PENDING_CONFIRM'].includes(order.status) && (
          <Button variant="secondary" onClick={cancelOrder} className="text-danger-600">
            Huỷ đơn
          </Button>
        )}
        {['DELIVERED', 'SHIPPING'].includes(order.status) && (
          <Button variant="primary" onClick={confirmReceived}>
            Đã nhận được hàng
          </Button>
        )}
      </div>
    </main>
  );
}
