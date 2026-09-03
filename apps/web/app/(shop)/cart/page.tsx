'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../../lib/api-client';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import PriceTag from '../../../components/ui/PriceTag';
import EmptyState from '../../../components/ui/EmptyState';

interface CartItem {
  productId: string;
  quantity: number;
  product: {
    name: string;
    basePrice: string;
    images: { url: string }[];
    inventory: { quantityOnHand: number; reservedQuantity: number } | null;
  };
}

interface CartData {
  cartId: string;
  items: CartItem[];
  subtotal: number;
}

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartData | null>(null);
  const [error, setError] = useState('');

  async function loadCart() {
    try {
      const data = await apiFetch<CartData>('/cart');
      setCart(data);
    } catch (err: any) {
      setError(err.message ?? 'Không tải được giỏ hàng — hãy đăng nhập trước');
    }
  }

  useEffect(() => {
    loadCart();
  }, []);

  async function updateQuantity(productId: string, quantity: number) {
    await apiFetch(`/cart/items/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    });
    loadCart();
  }

  async function removeItem(productId: string) {
    await apiFetch(`/cart/items/${productId}`, { method: 'DELETE' });
    loadCart();
  }

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <EmptyState
          title="Không tải được giỏ hàng"
          description={error}
          action={
            <Button variant="primary" onClick={() => router.push('/login')}>
              Đăng nhập
            </Button>
          }
        />
      </main>
    );
  }

  if (!cart) {
    return <main className="px-4 py-8 text-center text-neutral-400">Đang tải giỏ hàng...</main>;
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 font-display text-2xl font-semibold text-neutral-900">Giỏ hàng của bạn</h1>

      {cart.items.length === 0 ? (
        <EmptyState
          title="Giỏ hàng đang trống"
          description="Chọn vài sản phẩm nông sản sạch để bắt đầu."
          action={
            <Button variant="primary" onClick={() => router.push('/')}>
              Tiếp tục mua sắm
            </Button>
          }
        />
      ) : (
        <>
          <Card className="divide-y divide-neutral-200 p-0">
            {cart.items.map((item) => {
              const available =
                (item.product.inventory?.quantityOnHand ?? 0) -
                (item.product.inventory?.reservedQuantity ?? 0);
              return (
                <div key={item.productId} className="flex items-center gap-4 p-4">
                  {item.product.images?.[0] ? (
                    <img
                      src={item.product.images[0].url}
                      alt={item.product.name}
                      className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-16 w-16 flex-shrink-0 rounded-lg bg-neutral-100" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-neutral-800">{item.product.name}</p>
                    <PriceTag value={item.product.basePrice} size="sm" className="mt-0.5 block" />
                    {available < item.quantity && (
                      <Badge tone="warning" className="mt-1.5">
                        Chỉ còn {available} sản phẩm khả dụng
                      </Badge>
                    )}
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value, 10) || 1)}
                    className="w-16 rounded-xl border border-neutral-300 px-2 py-1 text-center focus:border-primary-400"
                  />
                  <Button variant="ghost" size="sm" onClick={() => removeItem(item.productId)} className="text-danger-600 hover:bg-danger-50">
                    Xoá
                  </Button>
                </div>
              );
            })}
          </Card>

          <div className="mt-6 flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-5 py-4">
            <p className="text-neutral-700">
              Tạm tính: <PriceTag value={cart.subtotal} size="lg" />
            </p>
            <Button variant="primary" size="lg" onClick={() => router.push('/checkout')}>
              Thanh toán
            </Button>
          </div>
        </>
      )}
    </main>
  );
}
