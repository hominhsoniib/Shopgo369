'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../../lib/api-client';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';

interface Promotion {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  value: string;
  usedCount: number;
  usageLimit: number | null;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
}

const inputClass = 'rounded-xl border border-neutral-300 px-3 py-2 focus:border-primary-400 focus:outline-none';

export default function SellerPromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    code: '',
    type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED_AMOUNT',
    value: '',
    usageLimit: '',
    startsAt: '',
    endsAt: '',
  });

  async function load() {
    try {
      const data = await apiFetch<Promotion[]>('/seller/promotions');
      setPromotions(data);
    } catch (err: any) {
      setError(err.message ?? 'Không tải được danh sách khuyến mãi');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/seller/promotions', {
        method: 'POST',
        body: JSON.stringify({
          code: form.code,
          type: form.type,
          value: Number(form.value),
          usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: new Date(form.endsAt).toISOString(),
        }),
      });
      setForm({ code: '', type: 'PERCENTAGE', value: '', usageLimit: '', startsAt: '', endsAt: '' });
      load();
    } catch (err: any) {
      setError(err.message ?? 'Tạo mã khuyến mãi thất bại');
    }
  }

  async function deactivate(id: string) {
    await apiFetch(`/seller/promotions/${id}/deactivate`, { method: 'PATCH' });
    load();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 font-display text-2xl font-semibold text-neutral-900">Khuyến mãi gian hàng</h1>

      <form onSubmit={handleCreate} className="mb-8 grid grid-cols-2 gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <input placeholder="Mã (vd: SALE50)" required value={form.code}
          onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} className={inputClass} />
        <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as any }))}
          className={inputClass}>
          <option value="PERCENTAGE">Giảm theo % </option>
          <option value="FIXED_AMOUNT">Giảm số tiền cố định</option>
        </select>
        <input placeholder="Giá trị" type="number" required value={form.value}
          onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} className={inputClass} />
        <input placeholder="Giới hạn lượt dùng (bỏ trống = không giới hạn)" type="number" value={form.usageLimit}
          onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))} className={inputClass} />
        <input type="datetime-local" required value={form.startsAt}
          onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))} className={inputClass} />
        <input type="datetime-local" required value={form.endsAt}
          onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))} className={inputClass} />
        <Button type="submit" variant="primary" size="lg" className="col-span-2">
          Tạo mã khuyến mãi
        </Button>
      </form>

      {error && <p className="mb-4 text-sm text-danger-600">{error}</p>}

      <Card className="divide-y divide-neutral-100 p-0">
        {promotions.map((p) => (
          <div key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <p className="font-medium text-neutral-800">{p.code}</p>
              <p className="text-neutral-500">
                {p.type === 'PERCENTAGE' ? `Giảm ${p.value}%` : `Giảm ${Number(p.value).toLocaleString('vi-VN')}đ`}
                {' — Đã dùng '}{p.usedCount}{p.usageLimit ? `/${p.usageLimit}` : ' (không giới hạn)'}
              </p>
            </div>
            {p.isActive ? (
              <button onClick={() => deactivate(p.id)} className="text-neutral-400 hover:text-danger-600">
                Vô hiệu hoá
              </button>
            ) : (
              <span className="text-neutral-300">Đã tắt</span>
            )}
          </div>
        ))}
      </Card>
    </main>
  );
}
