import { apiFetch } from '../../lib/api-client';
import ProductCard from '../../components/ui/ProductCard';
import EmptyState from '../../components/ui/EmptyState';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Product {
  id: string;
  slug: string;
  name: string;
  basePrice: string;
  images?: Array<{ url: string }>;
  store?: {
    name: string;
    slug: string;
  };
}

async function getProducts() {
  try {
    const data = await apiFetch<{ items: Product[] }>('/products', { cache: 'no-store' });
    return data.items ?? [];
  } catch {
    return [] as Product[];
  }
}

export default async function ShopHomePage() {
  const products = await getProducts();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <section>
        <h1 className="mb-1 font-display text-2xl font-semibold text-neutral-900">🌾 Danh Mục Nông Sản & Đặc Sản 369</h1>
        <p className="mb-6 text-xs text-neutral-500">
          Khám phá nông sản sạch, đặc sản vùng miền chính hãng từ các Hộ Kinh Doanh trên sàn ShopGo 369
        </p>

        {products.length === 0 ? (
          <EmptyState
            title="Chưa có sản phẩm nào"
            description="Hãy chạy backend và seed dữ liệu mẫu để xem sản phẩm ở đây."
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                slug={p.slug}
                name={p.name}
                price={p.basePrice}
                imageUrl={p.images?.[0]?.url}
                storeName={p.store?.name}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
