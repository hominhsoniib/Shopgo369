import Card from './Card';
import PriceTag from './PriceTag';

interface ProductCardProps {
  slug: string;
  name: string;
  price: number | string;
  imageUrl?: string;
  storeName?: string;
}

/** ProductCard — thẻ sản phẩm dùng chung cho trang chủ, danh mục, tìm kiếm... */
export default function ProductCard({ slug, name, price, imageUrl, storeName }: ProductCardProps) {
  return (
    <a href={`/p/${slug}`}>
      <Card hoverable className="p-3 transition hover:border-emerald-300">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="mb-3 aspect-square w-full rounded-lg border border-neutral-100 object-cover"
          />
        ) : (
          <div className="mb-3 flex aspect-square w-full items-center justify-center rounded-lg bg-primary-50 text-primary-300">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 9l9-6 9 6v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
          </div>
        )}
        {storeName && (
          <span className="mb-1 inline-block text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 truncate max-w-full">
            🏪 {storeName}
          </span>
        )}
        <p className="line-clamp-2 text-sm font-medium text-neutral-800">{name}</p>
        <PriceTag value={price} size="sm" className="mt-1" />
      </Card>
    </a>
  );
}
