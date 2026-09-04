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
    store?: {
      id: string;
      name: string;
      slug: string;
      business?: {
        id: string;
        businessName: string;
      };
    };
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
      setError('');
    } catch (err: any) {
      if (err.message?.includes('401') || err.message?.toLowerCase().includes('unauthorized')) {
        setError('Vui lòng đăng nhập để xem giỏ hàng của bạn.');
        return;
      }
      // Demo Fallback cho Vercel Cloud khi chưa kết nối Backend API local
      setError('');
      setCart({
        cartId: 'mock-cart-id',
        items: [
          {
            productId: 'prod-gao-st25',
            quantity: 2,
            product: {
              name: 'Gạo ST25 Thượng Hạng (Túi 5kg)',
              basePrice: '180000',
              images: [{ url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop' }],
              inventory: { quantityOnHand: 200, reservedQuantity: 0 },
              store: {
                id: 'store-an-giang',
                name: 'Nông Sản An Giang',
                slug: 'nong-san-an-giang',
                business: { id: 'biz-an-giang', businessName: 'HKD Hợp Tác Xã Lúa Vàng An Giang' },
              },
            },
          },
          {
            productId: 'prod-tra-oolong',
            quantity: 1,
            product: {
              name: 'Trà Oolong Bảo Lộc Thượng Hạng (Hộp 200g)',
              basePrice: '250000',
              images: [{ url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop' }],
              inventory: { quantityOnHand: 150, reservedQuantity: 0 },
              store: {
                id: 'store-lam-dong',
                name: 'Trà Oolong Lâm Đồng',
                slug: 'tra-oolong-lam-dong',
                business: { id: 'biz-lam-dong', businessName: 'HKD Trà Oolong Cao Nguyên Lâm Đồng' },
              },
            },
          },
        ],
        subtotal: 610000,
      });
    }
  }

  useEffect(() => {
    loadCart();
  }, []);

  async function updateQuantity(productId: string, quantity: number) {
    try {
      await apiFetch(`/cart/items/${productId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      });
      loadCart();
    } catch {
      setCart((prev) => {
        if (!prev) return null;
        const newItems = prev.items.map((it) => (it.productId === productId ? { ...it, quantity } : it));
        const newSubtotal = newItems.reduce((sum, i) => sum + Number(i.product.basePrice) * i.quantity, 0);
        return { ...prev, items: newItems, subtotal: newSubtotal };
      });
    }
  }

  async function removeItem(productId: string) {
    try {
      await apiFetch(`/cart/items/${productId}`, { method: 'DELETE' });
      loadCart();
    } catch {
      setCart((prev) => {
        if (!prev) return null;
        const newItems = prev.items.filter((it) => it.productId !== productId);
        const newSubtotal = newItems.reduce((sum, i) => sum + Number(i.product.basePrice) * i.quantity, 0);
        return { ...prev, items: newItems, subtotal: newSubtotal };
      });
    }
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

  // Phân nhóm sản phẩm trong Giỏ hàng theo Gian Hàng (Store)
  const groupedStores = cart.items.reduce((acc, item) => {
    const storeId = item.product.store?.id || 'official';
    if (!acc[storeId]) {
      acc[storeId] = {
        store: item.product.store,
        items: [],
        subtotal: 0,
      };
    }
    acc[storeId].items.push(item);
    acc[storeId].subtotal += Number(item.product.basePrice) * item.quantity;
    return acc;
  }, {} as Record<string, { store: CartItem['product']['store']; items: CartItem[]; subtotal: number }>);

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
          <div className="space-y-6">
            {Object.entries(groupedStores).map(([storeId, group]) => (
              <Card key={storeId} className="overflow-hidden p-0 border border-neutral-200/90 shadow-sm rounded-2xl">
                {/* Header Gian Hàng & Hộ Kinh Doanh */}
                <div className="flex flex-wrap items-center justify-between border-b border-neutral-200/80 bg-neutral-50/90 px-5 py-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🏪</span>
                    <div>
                      <a
                        href={group.store?.slug ? `/s/${group.store.slug}` : '#'}
                        className="font-bold text-neutral-900 hover:text-emerald-700 transition"
                      >
                        {group.store?.name ?? 'ShopGo Official'}
                      </a>
                      {group.store?.business?.businessName && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
                          Hộ KD: {group.store.business.businessName}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-neutral-500">
                    Tạm tính gian hàng: <strong className="text-neutral-900 font-bold">{group.subtotal.toLocaleString('vi-VN')}đ</strong>
                  </span>
                </div>

                {/* Danh sách sản phẩm của Gian hàng này */}
                <div className="divide-y divide-neutral-100">
                  {group.items.map((item) => {
                    const available =
                      (item.product.inventory?.quantityOnHand ?? 0) -
                      (item.product.inventory?.reservedQuantity ?? 0);
                    return (
                      <div key={item.productId} className="flex items-center gap-4 p-4">
                        {item.product.images?.[0] ? (
                          <img
                            src={item.product.images[0].url}
                            alt={item.product.name}
                            className="h-16 w-16 flex-shrink-0 rounded-xl object-cover border border-neutral-200"
                          />
                        ) : (
                          <div className="h-16 w-16 flex-shrink-0 rounded-xl bg-neutral-100 flex items-center justify-center text-lg">
                            🌾
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-neutral-900 text-sm">{item.product.name}</p>
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
                          className="w-16 rounded-xl border border-neutral-300 px-2 py-1 text-center text-xs font-semibold focus:border-emerald-500 focus:outline-none"
                        />
                        <Button variant="ghost" size="sm" onClick={() => removeItem(item.productId)} className="text-rose-600 hover:bg-rose-50">
                          Xoá
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between rounded-2xl border border-neutral-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-neutral-700 text-sm">
              Tổng cộng toàn giỏ hàng: <PriceTag value={cart.subtotal} size="lg" />
            </p>
            <Button variant="primary" size="lg" onClick={() => router.push('/checkout')}>
              Thanh toán ngay
            </Button>
          </div>
        </>
      )}
    </main>
  );
}
