import { apiFetch } from '../../lib/api-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Product {
  id: string;
  slug: string;
  name: string;
  basePrice: string;
  images?: Array<{ url: string }>;
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
    <main className="mx-auto max-w-6xl px-4 py-8">
      <section>
        <h2 className="mb-4 text-lg font-semibold">🔥 Sản phẩm nổi bật</h2>
        {products.length === 0 ? (
          <p className="text-gray-500">Chưa có sản phẩm nào — hãy chạy backend + seed dữ liệu mẫu.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {products.map((p) => (
              <a
                key={p.id}
                href={`/p/${p.slug}`}
                className="rounded-lg border p-3 transition hover:shadow-md"
              >
                {p.images && p.images[0] ? (
                  <img
                    src={p.images[0].url}
                    alt={p.name}
                    className="mb-2 aspect-square w-full rounded object-cover"
                  />
                ) : (
                  <div className="mb-2 aspect-square rounded bg-gray-100" />
                )}
                <p className="line-clamp-2 text-sm font-medium">{p.name}</p>
                <p className="text-sm font-semibold text-red-600">
                  {Number(p.basePrice).toLocaleString('vi-VN')}đ
                </p>
              </a>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
