'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '../../../../lib/api-client';

interface ProductDetail {
  id: string;
  name: string;
  description: string | null;
  basePrice: string;
  images: { url: string }[];
  inventory: { quantityOnHand: number; reservedQuantity: number } | null;
  store: { name: string; slug: string };
}

export default function ProductDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [addedMessage, setAddedMessage] = useState('');

  useEffect(() => {
    apiFetch<ProductDetail>(`/products/${params.slug}`)
      .then(setProduct)
      .catch((err) => setError(err.message ?? 'Không tìm thấy sản phẩm'));
  }, [params.slug]);

  async function handleAddToCart() {
    if (!product) return;
    setAdding(true);
    setAddedMessage('');
    try {
      await apiFetch('/cart/items', {
        method: 'POST',
        body: JSON.stringify({ productId: product.id, quantity }),
      });
      setAddedMessage('✅ Đã thêm vào giỏ hàng');
    } catch (err: any) {
      // Chưa đăng nhập → apiFetch ném lỗi 401 (không có Authorization header)
      if (err.message?.includes('401') || err.message?.toLowerCase().includes('unauthorized')) {
        router.push('/login');
        return;
      }
      setError(err.message ?? 'Thêm vào giỏ hàng thất bại');
    } finally {
      setAdding(false);
    }
  }

  if (error) {
    return <main className="mx-auto max-w-3xl px-4 py-8 text-center text-gray-500">{error}</main>;
  }
  if (!product) {
    return <main className="px-4 py-8 text-center text-gray-400">Đang tải...</main>;
  }

  const available = (product.inventory?.quantityOnHand ?? 0) - (product.inventory?.reservedQuantity ?? 0);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
          {product.images?.[0] ? (
            <img src={product.images[0].url} alt={product.name} className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <p className="mt-1 text-sm text-gray-500">Gian hàng: {product.store?.name}</p>
          <p className="mt-4 text-2xl font-semibold text-red-600">
            {Number(product.basePrice).toLocaleString('vi-VN')}đ
          </p>
          <p className="mt-2 text-sm text-gray-500">
            {available > 0 ? `Còn ${available} sản phẩm` : 'Tạm hết hàng'}
          </p>
          {product.description && <p className="mt-4 whitespace-pre-line text-gray-700">{product.description}</p>}

          <div className="mt-6 flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={Math.max(available, 1)}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-20 rounded border px-3 py-2 text-center"
            />
            <button
              onClick={handleAddToCart}
              disabled={adding || available <= 0}
              className="rounded bg-red-600 px-6 py-2 font-medium text-white disabled:opacity-50"
            >
              {adding ? 'Đang thêm...' : 'Thêm vào giỏ'}
            </button>
          </div>
          {addedMessage && (
            <p className="mt-3 text-sm text-green-600">
              {addedMessage} —{' '}
              <a href="/cart" className="underline">
                Xem giỏ hàng
              </a>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
