'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../../lib/api-client';

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
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-xl font-bold">Khuyến mãi gian hàng</h1>

      <form onSubmit={handleCreate} className="mb-8 grid grid-cols-2 gap-3 rounded border p-4">
        <input placeholder="Mã (vd: SALE50)" required value={form.code}
          onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} className="rounded border px-3 py-2" />
        <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as any }))}
          className="rounded border px-3 py-2">
          <option value="PERCENTAGE">Giảm theo % </option>
          <option value="FIXED_AMOUNT">Giảm số tiền cố định</option>
        </select>
        <input placeholder="Giá trị" type="number" required value={form.value}
          onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} className="rounded border px-3 py-2" />
        <input placeholder="Giới hạn lượt dùng (bỏ trống = không giới hạn)" type="number" value={form.usageLimit}
          onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))} className="rounded border px-3 py-2" />
        <input type="datetime-local" required value={form.startsAt}
          onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))} className="rounded border px-3 py-2" />
        <input type="datetime-local" required value={form.endsAt}
          onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))} className="rounded border px-3 py-2" />
        <button type="submit" className="col-span-2 rounded bg-red-600 py-2 font-medium text-white">
          Tạo mã khuyến mãi
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="divide-y rounded border">
        {promotions.map((p) => (
          <div key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <p className="font-medium">{p.code}</p>
              <p className="text-gray-500">
                {p.type === 'PERCENTAGE' ? `Giảm ${p.value}%` : `Giảm ${Number(p.value).toLocaleString('vi-VN')}đ`}
                {' — Đã dùng '}{p.usedCount}{p.usageLimit ? `/${p.usageLimit}` : ' (không giới hạn)'}
              </p>
            </div>
            {p.isActive ? (
              <button onClick={() => deactivate(p.id)} className="text-gray-400 hover:text-red-600">
                Vô hiệu hoá
              </button>
            ) : (
              <span className="text-gray-300">Đã tắt</span>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
