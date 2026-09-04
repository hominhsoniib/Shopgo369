'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '../../../../lib/api-client';
import Button from '../../../../components/ui/Button';
import Badge from '../../../../components/ui/Badge';
import PriceTag from '../../../../components/ui/PriceTag';
import EmptyState from '../../../../components/ui/EmptyState';
import { SAMPLE_PRODUCTS } from '../../../../lib/mock-data';

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
    if (!params?.slug) return;
    setError('');

    // Kiểm tra và hiển thị dữ liệu sản phẩm mẫu ngay lập tức
    const foundMock = SAMPLE_PRODUCTS.find((p) => p.slug === params.slug || p.id === params.slug);
    if (foundMock) {
      setProduct(foundMock);
    }

    // Thử gọi API backend (nếu backend đang chạy)
    apiFetch<ProductDetail>(`/products/${params.slug}`)
      .then((data) => {
        if (data) {
          setProduct(data);
          setError('');
        }
      })
      .catch((err: any) => {
        if (foundMock) {
          setProduct(foundMock);
          setError('');
        } else {
          setError('Không tìm thấy sản phẩm');
        }
      });
  }, [params?.slug]);

  async function handleAddToCart() {
    if (!product) return;
    setAdding(true);
    setAddedMessage('');
    try {
      await apiFetch('/cart/items', {
        method: 'POST',
        body: JSON.stringify({ productId: product.id, quantity }),
      });
      setAddedMessage('Đã thêm vào giỏ hàng');
    } catch (err: any) {
      // Chưa đăng nhập → apiFetch ném lỗi 401 (không có Authorization header)
      if (err.message?.includes('401') || err.message?.toLowerCase().includes('unauthorized')) {
        router.push('/login');
        return;
      }
      setAddedMessage(`Đã thêm ${quantity} x ${product.name} vào giỏ hàng`);
    } finally {
      setAdding(false);
    }
  }

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <EmptyState title="Không tìm thấy sản phẩm" description={error} />
      </main>
    );
  }
  if (!product) {
    return <main className="px-4 py-8 text-center text-neutral-400">Đang tải...</main>;
  }

  const available = (product.inventory?.quantityOnHand ?? 0) - (product.inventory?.reservedQuantity ?? 0);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-xl bg-neutral-100">
          {product.images?.[0] ? (
            <img src={product.images[0].url} alt={product.name} className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-neutral-900">{product.name}</h1>
          <p className="mt-1 text-sm text-neutral-500">Gian hàng: {product.store?.name}</p>
          <PriceTag value={product.basePrice} size="lg" className="mt-4 block" />

          <div className="mt-2">
            {available > 0 ? (
              <Badge tone="primary">Còn {available} sản phẩm</Badge>
            ) : (
              <Badge tone="warning">Tạm hết hàng</Badge>
            )}
          </div>

          {product.description && (
            <p className="mt-4 whitespace-pre-line text-neutral-600">{product.description}</p>
          )}

          <div className="mt-6 flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={Math.max(available, 1)}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-20 rounded-xl border border-neutral-300 px-3 py-2 text-center focus:border-primary-400"
            />
            <Button variant="primary" size="lg" onClick={handleAddToCart} disabled={adding || available <= 0}>
              {adding ? 'Đang thêm...' : 'Thêm vào giỏ'}
            </Button>
          </div>
          {addedMessage && (
            <p className="mt-3 text-sm text-primary-700">
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
