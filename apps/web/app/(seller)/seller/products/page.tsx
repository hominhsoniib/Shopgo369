'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../../lib/api-client';

interface OwnProduct {
  id: string;
  name: string;
  status: string;
  basePrice: string;
  inventory: { quantityOnHand: number; reservedQuantity: number } | null;
}

export default function SellerProductsPage() {
  const [products, setProducts] = useState<OwnProduct[]>([]);
  const [error, setError] = useState('');

  async function load() {
    try {
      const data = await apiFetch<OwnProduct[]>('/products/seller/mine');
      setProducts(data);
    } catch (err: any) {
      setError(err.message ?? 'Không tải được danh sách sản phẩm');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function publish(id: string) {
    await apiFetch(`/products/${id}/publish`, { method: 'PATCH' });
    load();
  }

  async function adjustStock(id: string, quantityOnHand: number) {
    await apiFetch(`/seller/inventory/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantityOnHand }),
    });
    load();
  }

  if (error) return <main className="mx-auto max-w-4xl px-4 py-8 text-gray-500">{error}</main>;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-xl font-bold">Sản phẩm của tôi</h1>
      <div className="divide-y rounded border">
        {products.length === 0 && <p className="p-4 text-sm text-gray-400">Chưa có sản phẩm nào.</p>}
        {products.map((p) => (
          <div key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <p className="font-medium">{p.name} — {p.status}</p>
              <p className="text-gray-500">{Number(p.basePrice).toLocaleString('vi-VN')}đ</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-gray-400">Tồn kho:</span>
                <input
                  type="number"
                  defaultValue={p.inventory?.quantityOnHand ?? 0}
                  onBlur={(e) => adjustStock(p.id, parseInt(e.target.value, 10) || 0)}
                  className="w-20 rounded border px-2 py-1 text-xs"
                />
                <span className="text-xs text-gray-400">(đang giữ chỗ {p.inventory?.reservedQuantity ?? 0})</span>
              </div>
            </div>
            {p.status === 'DRAFT' && (
              <button onClick={() => publish(p.id)} className="rounded bg-red-600 px-3 py-1.5 text-xs text-white">
                Đăng bán
              </button>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
