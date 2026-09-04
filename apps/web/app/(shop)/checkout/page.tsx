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
  'rounded-xl border border-neutral-300 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none';

const FREESHIP_VOUCHERS = [
  {
    code: 'FREESHIP369',
    name: 'Miễn phí vận chuyển 100% — ShopGo 369',
    description: 'Giảm 100% phí giao hàng cho mọi đơn nông sản',
    discountAmount: 35000,
  },
  {
    code: 'FREESHIP30K',
    name: 'Mã Freeship Nông Sản 30.000đ',
    description: 'Giảm tối đa 30.000đ phí giao hàng nhanh',
    discountAmount: 30000,
  },
  {
    code: 'HTX369SHIP',
    name: 'Mã Khuyến Mãi Phí Ship Hợp Tác Xã 369',
    description: 'Hỗ trợ 20.000đ cước vận chuyển nông sản tận nhà',
    discountAmount: 20000,
  },
];

export default function CheckoutPage() {
  const router = useRouter();
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Voucher states
  const [voucherCode, setVoucherCode] = useState('FREESHIP369');
  const [appliedVoucher, setAppliedVoucher] = useState<(typeof FREESHIP_VOUCHERS)[0] | null>(FREESHIP_VOUCHERS[0]);
  const [voucherInput, setVoucherInput] = useState('');
  const [voucherMsg, setVoucherMsg] = useState('🎉 Đã áp dụng mã miễn phí vận chuyển FREESHIP369 (Giảm 100% phí ship)');

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
    apiFetch<ShippingMethod[]>('/shipping/methods')
      .then((data) => {
        if (data && data.length > 0) {
          setMethods(data);
          setForm((f) => ({ ...f, shippingMethodId: data[0].id }));
        }
      })
      .catch(() => {
        const mockMethods: ShippingMethod[] = [
          { id: 'ship-fast', name: 'Giao hàng nhanh (2-3 ngày)', baseFee: '35000', estimatedDays: 2 },
          { id: 'ship-standard', name: 'Giao hàng tiết kiệm (4-5 ngày)', baseFee: '20000', estimatedDays: 4 },
        ];
        setMethods(mockMethods);
        setForm((f) => ({ ...f, shippingMethodId: mockMethods[0].id }));
      });
  }, []);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const selectedMethod = methods.find((m) => m.id === form.shippingMethodId);
  const baseShippingFee = selectedMethod ? Number(selectedMethod.baseFee) : 0;
  
  // Tính số tiền phí ship được giảm bởi Freeship Voucher
  const shippingDiscount = appliedVoucher
    ? Math.min(baseShippingFee, appliedVoucher.discountAmount)
    : 0;
  const finalShippingFee = Math.max(0, baseShippingFee - shippingDiscount);

  function handleApplyVoucher(codeToApply?: string) {
    const code = (codeToApply || voucherInput || voucherCode).trim().toUpperCase();
    const found = FREESHIP_VOUCHERS.find((v) => v.code === code);

    if (found) {
      setAppliedVoucher(found);
      setVoucherCode(found.code);
      setVoucherMsg(`🎉 Đã áp dụng mã miễn phí ship "${found.code}" — ${found.name}`);
    } else {
      setVoucherMsg('❌ Mã freeship không hợp lệ hoặc đã hết lượt sử dụng.');
    }
  }

  function handleRemoveVoucher() {
    setAppliedVoucher(null);
    setVoucherCode('');
    setVoucherMsg('Đã bỏ áp dụng mã freeship');
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
      <h1 className="mb-6 font-display text-2xl font-bold text-neutral-900">Xác Nhận & Thanh Toán Đơn Hàng</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Địa chỉ giao hàng */}
        <Card className="p-5 border border-neutral-200 shadow-xs rounded-2xl">
          <h2 className="mb-4 text-sm font-bold text-neutral-900 flex items-center gap-2">
            <span>📍</span> Địa chỉ giao hàng
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Họ và tên người nhận *" required value={form.receiver}
              onChange={(e) => update('receiver', e.target.value)} className={inputClass} />
            <input placeholder="Số điện thoại liên hệ *" required value={form.phone}
              onChange={(e) => update('phone', e.target.value)} className={inputClass} />
            <input placeholder="Tỉnh/Thành phố *" required value={form.province}
              onChange={(e) => update('province', e.target.value)} className={inputClass} />
            <input placeholder="Quận/Huyện *" required value={form.district}
              onChange={(e) => update('district', e.target.value)} className={inputClass} />
            <input placeholder="Phường/Xã *" required value={form.ward}
              onChange={(e) => update('ward', e.target.value)} className={inputClass} />
            <input placeholder="Địa chỉ cụ thể (Số nhà, Tên đường...)" required value={form.addressLine}
              onChange={(e) => update('addressLine', e.target.value)} className={`col-span-2 ${inputClass}`} />
          </div>
        </Card>

        {/* Phương thức vận chuyển */}
        <Card className="p-5 border border-neutral-200 shadow-xs rounded-2xl">
          <h2 className="mb-4 text-sm font-bold text-neutral-900 flex items-center gap-2">
            <span>🚚</span> Phương thức vận chuyển
          </h2>
          <div className="flex flex-col gap-2.5">
            {methods.map((m) => {
              const isSelected = form.shippingMethodId === m.id;
              return (
                <label
                  key={m.id}
                  className={`flex items-center justify-between gap-3 rounded-xl border p-3 cursor-pointer transition ${
                    isSelected ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500' : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center gap-3 text-xs">
                    <input type="radio" name="shipping" checked={isSelected}
                      onChange={() => update('shippingMethodId', m.id)} className="accent-emerald-600" />
                    <div>
                      <p className="font-semibold text-neutral-900">{m.name}</p>
                      <p className="text-neutral-500 text-[11px]">Dự kiến giao trong {m.estimatedDays} ngày làm việc</p>
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    {appliedVoucher && Number(m.baseFee) <= shippingDiscount ? (
                      <div>
                        <span className="line-through text-neutral-400 mr-1.5">{Number(m.baseFee).toLocaleString('vi-VN')}đ</span>
                        <strong className="text-emerald-700 font-bold">0đ (FREESHIP)</strong>
                      </div>
                    ) : (
                      <PriceTag value={m.baseFee} size="sm" className="font-bold text-neutral-900" />
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </Card>

        {/* SECTION VOUCHER MIỄN PHÍ VẬN CHUYỂN */}
        <Card className="p-5 border border-emerald-200 bg-emerald-50/40 shadow-xs rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
              <span>🎟️</span> Voucher Miễn Phí Vận Chuyển (Freeship 369)
            </h2>
            {appliedVoucher && (
              <button
                type="button"
                onClick={handleRemoveVoucher}
                className="text-[11px] font-semibold text-rose-600 hover:underline"
              >
                Bỏ chọn voucher
              </button>
            )}
          </div>

          {/* Danh sách Mã Freeship Khả Dụng */}
          <div className="space-y-2 mb-3">
            {FREESHIP_VOUCHERS.map((v) => {
              const isApplied = appliedVoucher?.code === v.code;
              return (
                <div
                  key={v.code}
                  onClick={() => handleApplyVoucher(v.code)}
                  className={`flex items-center justify-between rounded-xl border p-3 cursor-pointer transition text-xs ${
                    isApplied
                      ? 'border-emerald-600 bg-emerald-100/80 shadow-xs'
                      : 'border-emerald-200 bg-white hover:bg-emerald-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">🚚</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="font-mono font-bold text-emerald-900">{v.code}</strong>
                        <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white uppercase">
                          Freeship
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-600 mt-0.5">{v.description}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`rounded-lg px-3 py-1 text-[11px] font-semibold transition ${
                      isApplied
                        ? 'bg-emerald-700 text-white'
                        : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                    }`}
                  >
                    {isApplied ? 'Đã áp dụng' : 'Dùng mã'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Ô Nhập Mã Khác */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Nhập mã freeship khác (ví dụ: FREESHIP369)"
              value={voucherInput}
              onChange={(e) => setVoucherInput(e.target.value)}
              className="flex-1 rounded-xl border border-emerald-300 px-3 py-2 text-xs font-mono uppercase bg-white focus:border-emerald-600 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => handleApplyVoucher()}
              className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-800 transition"
            >
              Áp dụng
            </button>
          </div>

          {voucherMsg && (
            <p className="mt-2 text-[11px] font-medium text-emerald-900">{voucherMsg}</p>
          )}
        </Card>

        {/* Phương thức thanh toán */}
        <Card className="p-5 border border-neutral-200 shadow-xs rounded-2xl">
          <h2 className="mb-4 text-sm font-bold text-neutral-900 flex items-center gap-2">
            <span>💳</span> Phương thức thanh toán
          </h2>
          <div className="flex flex-wrap gap-3">
            <label className={`flex flex-1 items-center gap-2.5 rounded-xl border p-3 cursor-pointer text-xs transition ${
              form.paymentMethod === 'ONLINE' ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500 font-semibold text-neutral-900' : 'border-neutral-200 text-neutral-700'
            }`}>
              <input type="radio" checked={form.paymentMethod === 'ONLINE'}
                onChange={() => update('paymentMethod', 'ONLINE')} className="accent-emerald-600" />
              🌐 Thanh toán online (QR Code / VNPAY)
            </label>
            <label className={`flex flex-1 items-center gap-2.5 rounded-xl border p-3 cursor-pointer text-xs transition ${
              form.paymentMethod === 'COD' ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500 font-semibold text-neutral-900' : 'border-neutral-200 text-neutral-700'
            }`}>
              <input type="radio" checked={form.paymentMethod === 'COD'}
                onChange={() => update('paymentMethod', 'COD')} className="accent-emerald-600" />
              💵 Thanh toán khi nhận hàng (COD)
            </label>
          </div>
        </Card>

        {/* BẢNG TỔNG HỢP CHI PHÍ & ĐẶT HÀNG */}
        <Card className="p-5 border border-neutral-200 bg-neutral-50/80 shadow-xs rounded-2xl space-y-2.5 text-xs">
          <div className="flex justify-between text-neutral-600">
            <span>Phí vận chuyển ({selectedMethod?.name ?? 'Chưa chọn'}):</span>
            <span className="font-mono">{baseShippingFee.toLocaleString('vi-VN')}đ</span>
          </div>

          {appliedVoucher && (
            <div className="flex justify-between font-medium text-emerald-800 bg-emerald-100/70 p-2 rounded-lg">
              <span>🎟️ Giảm giá cước vận chuyển ({appliedVoucher.code}):</span>
              <span className="font-mono font-bold">-{shippingDiscount.toLocaleString('vi-VN')}đ</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t text-sm font-bold text-neutral-900">
            <span>Phí giao hàng thực tế:</span>
            <span className="font-mono text-base text-emerald-700">
              {finalShippingFee === 0 ? '0đ (MIỄN PHÍ SHIP)' : `${finalShippingFee.toLocaleString('vi-VN')}đ`}
            </span>
          </div>
        </Card>

        {error && <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200">{error}</p>}

        <Button type="submit" variant="primary" size="lg" disabled={submitting} className="w-full py-3.5 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 shadow-md">
          {submitting ? 'Đang tạo đơn hàng...' : '🚀 XÁC NHẬN ĐẶT HÀNG NGAY'}
        </Button>
      </form>
    </main>
  );
}
