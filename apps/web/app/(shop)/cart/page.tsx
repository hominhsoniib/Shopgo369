'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../../lib/api-client';

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
      <main className="mx-auto max-w-2xl px-4 py-8 text-center">
        <p className="text-gray-500">{error}</p>
        <a href="/login" className="mt-4 inline-block text-red-600">
          Đăng nhập
        </a>
      </main>
    );
  }

  if (!cart) {
    return <main className="px-4 py-8 text-center text-gray-400">Đang tải giỏ hàng...</main>;
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-xl font-bold">Giỏ hàng của bạn</h1>

      {cart.items.length === 0 ? (
        <p className="text-gray-500">Giỏ hàng đang trống.</p>
      ) : (
        <>
          <div className="flex flex-col divide-y">
            {cart.items.map((item) => {
              const available =
                (item.product.inventory?.quantityOnHand ?? 0) -
                (item.product.inventory?.reservedQuantity ?? 0);
              return (
                <div key={item.productId} className="flex items-center gap-4 py-4">
                  <div className="h-16 w-16 flex-shrink-0 rounded bg-gray-100" />
                  <div className="flex-1">
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-sm text-red-600">
                      {Number(item.product.basePrice).toLocaleString('vi-VN')}đ
                    </p>
                    {available < item.quantity && (
                      <p className="text-xs text-amber-600">
                        ⚠️ Chỉ còn {available} sản phẩm khả dụng
                      </p>
                    )}
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value, 10) || 1)}
                    className="w-16 rounded border px-2 py-1 text-center"
                  />
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="text-sm text-gray-400 hover:text-red-600"
                  >
                    Xoá
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between border-t pt-4">
            <p className="text-lg font-semibold">
              Tạm tính: <span className="text-red-600">{cart.subtotal.toLocaleString('vi-VN')}đ</span>
            </p>
            <button
              onClick={() => router.push('/checkout')}
              className="rounded bg-red-600 px-6 py-2 font-medium text-white"
            >
              Thanh toán
            </button>
          </div>
        </>
      )}
    </main>
  );
}
