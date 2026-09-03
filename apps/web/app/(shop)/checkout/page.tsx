'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../../lib/api-client';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import PriceTag from '../../../components/ui/PriceTag';

interface ShippingMethod {
  id: string;
  name: string;
  baseFee: string;
  estimatedDays: number;
}

const inputClass =
  'rounded-xl border border-neutral-300 px-3 py-2 focus:border-primary-400 focus:outline-none';

export default function CheckoutPage() {
  const router = useRouter();
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    receiver: '',
    phone: '',
    province: '',
    district: '',
    ward: '',
    addressLine: '',
    shippingMethodId: '',
    paymentMethod: 'ONLINE' as 'ONLINE' | 'COD',
    note: '',
  });

  useEffect(() => {
    apiFetch<ShippingMethod[]>('/shipping/methods').then((data) => {
      setMethods(data);
      if (data.length > 0) setForm((f) => ({ ...f, shippingMethodId: data[0].id }));
    });
  }, []);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const orders = await apiFetch<Array<{ id: string; orderCode: string; paymentMethod: string }>>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          address: {
            receiver: form.receiver,
            phone: form.phone,
            province: form.province,
            district: form.district,
            ward: form.ward,
            addressLine: form.addressLine,
          },
          shippingMethodId: form.shippingMethodId,
          paymentMethod: form.paymentMethod,
          note: form.note || undefined,
        }),
      });

      // Nếu thanh toán ONLINE — khởi tạo payment cho đơn đầu tiên rồi redirect
      // (Phase 2: giỏ hàng nhiều gian hàng sẽ tạo nhiều order — mock demo chỉ
      // xử lý luồng thanh toán cho order đầu tiên, sản phẩm thật nên có màn
      // hình tổng hợp thanh toán từng đơn).
      const firstOrder = orders[0];
      if (firstOrder.paymentMethod === 'ONLINE') {
        const payment = await apiFetch<{ redirectUrl: string }>(`/payments/${firstOrder.id}/init`, {
          method: 'POST',
        });
        window.location.href = payment.redirectUrl;
      } else {
        router.push(`/orders/${firstOrder.id}`);
      }
    } catch (err: any) {
      setError(err.message ?? 'Đặt hàng thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 font-display text-2xl font-semibold text-neutral-900">Thanh toán</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Card>
          <h2 className="mb-3 font-medium text-neutral-800">Địa chỉ giao hàng</h2>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Người nhận" required value={form.receiver}
              onChange={(e) => update('receiver', e.target.value)} className={inputClass} />
            <input placeholder="Số điện thoại" required value={form.phone}
              onChange={(e) => update('phone', e.target.value)} className={inputClass} />
            <input placeholder="Tỉnh/Thành phố" required value={form.province}
              onChange={(e) => update('province', e.target.value)} className={inputClass} />
            <input placeholder="Quận/Huyện" required value={form.district}
              onChange={(e) => update('district', e.target.value)} className={inputClass} />
            <input placeholder="Phường/Xã" required value={form.ward}
              onChange={(e) => update('ward', e.target.value)} className={inputClass} />
            <input placeholder="Địa chỉ cụ thể" required value={form.addressLine}
              onChange={(e) => update('addressLine', e.target.value)} className={`col-span-2 ${inputClass}`} />
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 font-medium text-neutral-800">Phương thức vận chuyển</h2>
          <div className="flex flex-col gap-2">
            {methods.map((m) => (
              <label
                key={m.id}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
                  form.shippingMethodId === m.id ? 'border-primary-400 bg-primary-50' : 'border-neutral-200'
                }`}
              >
                <input type="radio" name="shipping" checked={form.shippingMethodId === m.id}
                  onChange={() => update('shippingMethodId', m.id)} />
                <span className="text-neutral-700">
                  {m.name} — <PriceTag value={m.baseFee} size="sm" /> ({m.estimatedDays} ngày)
                </span>
              </label>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 font-medium text-neutral-800">Phương thức thanh toán</h2>
          <div className="flex gap-3">
            <label className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
              form.paymentMethod === 'ONLINE' ? 'border-primary-400 bg-primary-50' : 'border-neutral-200'
            }`}>
              <input type="radio" checked={form.paymentMethod === 'ONLINE'}
                onChange={() => update('paymentMethod', 'ONLINE')} />
              Thanh toán online
            </label>
            <label className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
              form.paymentMethod === 'COD' ? 'border-primary-400 bg-primary-50' : 'border-neutral-200'
            }`}>
              <input type="radio" checked={form.paymentMethod === 'COD'}
                onChange={() => update('paymentMethod', 'COD')} />
              Thanh toán khi nhận hàng (COD)
            </label>
          </div>
        </Card>

        {error && <p className="text-sm text-danger-600">{error}</p>}

        <Button type="submit" variant="primary" size="lg" disabled={submitting} className="w-full">
          {submitting ? 'Đang xử lý...' : 'Đặt hàng'}
        </Button>
      </form>
    </main>
  );
}
