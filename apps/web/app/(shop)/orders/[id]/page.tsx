'use client';

import { useEffect, useState } from 'react';
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

  if (error) return <main className="px-4 py-8 text-center text-gray-500">{error}</main>;
  if (!order) return <main className="px-4 py-8 text-center text-gray-400">Đang tải...</main>;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-xl font-bold">Đơn hàng {order.orderCode}</h1>
      <p className="mb-6 text-sm text-gray-500">
        Trạng thái hiện tại: <span className="font-semibold text-red-600">{STATUS_LABEL[order.status] ?? order.status}</span>
      </p>

      <section className="mb-6">
        <h2 className="mb-2 font-semibold">Sản phẩm</h2>
        <div className="divide-y rounded border">
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between px-3 py-2 text-sm">
              <span>{item.productName} x{item.quantity}</span>
              <span>{(Number(item.unitPrice) * item.quantity).toLocaleString('vi-VN')}đ</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-right font-semibold">
          Tổng: {Number(order.totalAmount).toLocaleString('vi-VN')}đ
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 font-semibold">Lịch sử trạng thái</h2>
        <ol className="flex flex-col gap-2 border-l-2 border-gray-200 pl-4">
          {order.statusHistory.map((h, i) => (
            <li key={i} className="relative text-sm">
              <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-red-600" />
              <span className="font-medium">{STATUS_LABEL[h.toStatus] ?? h.toStatus}</span>
              {h.note && <span className="text-gray-400"> — {h.note}</span>}
              <div className="text-xs text-gray-400">{new Date(h.createdAt).toLocaleString('vi-VN')}</div>
            </li>
          ))}
        </ol>
      </section>

      <div className="flex gap-3">
        {['PENDING_PAYMENT', 'PENDING_CONFIRM'].includes(order.status) && (
          <button onClick={cancelOrder} className="rounded border px-4 py-2 text-sm text-red-600">
            Huỷ đơn
          </button>
        )}
        {['DELIVERED', 'SHIPPING'].includes(order.status) && (
          <button onClick={confirmReceived} className="rounded bg-red-600 px-4 py-2 text-sm text-white">
            Đã nhận được hàng
          </button>
        )}
      </div>
    </main>
  );
}
