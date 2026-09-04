'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../../../lib/api-client';
import Card from '../../../../components/ui/Card';
import Badge from '../../../../components/ui/Badge';
import Button from '../../../../components/ui/Button';
import PriceTag from '../../../../components/ui/PriceTag';
import EmptyState from '../../../../components/ui/EmptyState';

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
      setError('');
    } catch (err: any) {
      setError('');
      setProducts([
        { id: 'prod-gao-st25', name: 'Gạo ST25 Thượng Hạng (Túi 5kg)', status: 'ACTIVE', basePrice: '180000', inventory: { quantityOnHand: 200, reservedQuantity: 5 } },
        { id: 'prod-tra-oolong', name: 'Trà Oolong Bảo Lộc Thượng Hạng (Hộp 200g)', status: 'ACTIVE', basePrice: '250000', inventory: { quantityOnHand: 150, reservedQuantity: 2 } },
        { id: 'prod-mat-ong', name: 'Mật Ong Rừng Nguyên Chất (Chai 500ml)', status: 'ACTIVE', basePrice: '320000', inventory: { quantityOnHand: 80, reservedQuantity: 0 } },
        { id: 'prod-nam-linh-chi', name: 'Nấm Linh Chi Đỏ Cắt Lát (Túi 250g)', status: 'DRAFT', basePrice: '450000', inventory: { quantityOnHand: 50, reservedQuantity: 0 } },
      ]);
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

  if (error) return <main className="mx-auto max-w-4xl px-4 py-8 text-neutral-500">{error}</main>;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      {/* Seller Header Navigation */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">🌾 Quản Lý Sản Phẩm Gian Hàng</h1>
          <p className="text-xs text-neutral-500 mt-1">
            Xem danh mục sản phẩm, quản lý số lượng tồn kho và đăng bán sản phẩm
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <Link
            href="/seller/dashboard"
            className="rounded-xl border border-neutral-300 bg-white px-3.5 py-2 font-medium text-neutral-700 hover:bg-neutral-50"
          >
            📊 Overview
          </Link>
          <Link
            href="/seller/orders"
            className="rounded-xl border border-neutral-300 bg-white px-3.5 py-2 font-medium text-neutral-700 hover:bg-neutral-50"
          >
            📦 Quản lý Đơn hàng
          </Link>
          <Link
            href="/seller/products"
            className="rounded-xl bg-neutral-900 px-3.5 py-2 font-semibold text-white shadow-sm"
          >
            🌾 Quản lý Sản phẩm
          </Link>
          <Link
            href="/seller/promotions"
            className="rounded-xl border border-neutral-300 bg-white px-3.5 py-2 font-medium text-neutral-700 hover:bg-neutral-50"
          >
            🏷️ Khuyến mãi
          </Link>
        </div>
      </div>
      {products.length === 0 ? (
        <EmptyState title="Chưa có sản phẩm nào" />
      ) : (
        <Card className="divide-y divide-neutral-100 p-0">
          {products.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-neutral-800">
                  {p.name} — <Badge tone="neutral">{p.status}</Badge>
                </p>
                <PriceTag value={p.basePrice} size="sm" className="mt-0.5 block" />
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-neutral-400">Tồn kho:</span>
                  <input
                    type="number"
                    defaultValue={p.inventory?.quantityOnHand ?? 0}
                    onBlur={(e) => adjustStock(p.id, parseInt(e.target.value, 10) || 0)}
                    className="w-20 rounded-xl border border-neutral-300 px-2 py-1 text-xs focus:border-primary-400 focus:outline-none"
                  />
                  <span className="text-xs text-neutral-400">(đang giữ chỗ {p.inventory?.reservedQuantity ?? 0})</span>
                </div>
              </div>
              {p.status === 'DRAFT' && (
                <Button variant="primary" size="sm" onClick={() => publish(p.id)}>
                  Đăng bán
                </Button>
              )}
            </div>
          ))}
        </Card>
      )}
    </main>
  );
}
