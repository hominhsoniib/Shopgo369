'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../../lib/api-client';

interface ProductItem {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  status: 'DRAFT' | 'ACTIVE' | 'OUT_OF_STOCK' | 'ARCHIVED';
  createdAt: string;
  store: {
    id: string;
    name: string;
    slug: string;
  };
  inventory: {
    quantityOnHand: number;
    reservedQuantity: number;
  } | null;
}

interface ApiResponse {
  items: ProductItem[];
  total: number;
  page: number;
  pageSize: number;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const fetchProducts = () => {
    setLoading(true);
    const query = new URLSearchParams();
    if (statusFilter) query.set('status', statusFilter);
    if (search) query.set('search', search);

    apiFetch<ApiResponse>(`/admin/products?${query.toString()}`)
      .then((res) => {
        setProducts(res.items);
        setLoading(false);
      })
      .catch((err) => {
        setMsg(typeof err?.message === 'string' ? err.message : 'Không thể tải sản phẩm');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProducts();
  }, [statusFilter]);

  const handleTakedown = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn GỠ BỎ / ẨN sản phẩm "${name}" khỏi sàn?`)) return;
    try {
      await apiFetch(`/admin/products/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'ARCHIVED' }),
      });
      setMsg(`🛑 Đã gỡ sản phẩm vi phạm: ${name}`);
      fetchProducts();
    } catch (err: any) {
      alert(err?.message || 'Có lỗi xảy ra');
    }
  };

  const handleRestore = async (id: string, name: string) => {
    try {
      await apiFetch(`/admin/products/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'ACTIVE' }),
      });
      setMsg(`✅ Đã mở lại sản phẩm: ${name}`);
      fetchProducts();
    } catch (err: any) {
      alert(err?.message || 'Có lỗi xảy ra');
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Kiểm Duyệt Sản Phẩm Toàn Sàn</h1>
          <p className="text-xs text-gray-500">Giám sát sản phẩm đăng bán, gỡ sản phẩm vi phạm bản quyền hoặc tiêu chuẩn cộng đồng</p>
        </div>

        {/* Filter controls */}
        <div className="flex gap-2">
          {['', 'ACTIVE', 'ARCHIVED', 'OUT_OF_STOCK'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                statusFilter === st ? 'bg-neutral-900 text-white' : 'border bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {st === 'ACTIVE'
                ? 'Đang đăng bán'
                : st === 'ARCHIVED'
                ? 'Đã bị gỡ / Khóa'
                : st === 'OUT_OF_STOCK'
                ? 'Hết hàng'
                : 'Tất cả'}
            </button>
          ))}
        </div>
      </div>

      {msg && (
        <div className="mb-4 rounded-lg bg-blue-50 p-3 text-xs font-medium text-blue-900">
          {msg}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="border-b bg-gray-50 text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Tên Sản Phẩm</th>
              <th className="px-4 py-3">Gian Hàng</th>
              <th className="px-4 py-3">Giá Niêm Yết</th>
              <th className="px-4 py-3">Tồn Kho / Giữ Chỗ</th>
              <th className="px-4 py-3">Trạng Thái</th>
              <th className="px-4 py-3">Thao Tác Quản Trị</th>
            </tr>
          </thead>
          <tbody className="divide-y text-gray-700">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Đang tải danh sách sản phẩm...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Không tìm thấy sản phẩm nào.
                </td>
              </tr>
            ) : (
              products.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-gray-900">{item.name}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{item.store?.name}</p>
                    <p className="font-mono text-gray-400">/s/{item.store?.slug}</p>
                  </td>
                  <td className="px-4 py-3 font-bold text-gray-900">
                    {Number(item.basePrice).toLocaleString('vi-VN')}đ
                  </td>
                  <td className="px-4 py-3">
                    {item.inventory ? (
                      <span>
                        Sẵn có: <strong className="text-gray-900">{item.inventory.quantityOnHand}</strong> (Giữ chỗ:{' '}
                        {item.inventory.reservedQuantity})
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        item.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : item.status === 'ARCHIVED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {item.status === 'ACTIVE' ? (
                      <button
                        onClick={() => handleTakedown(item.id, item.name)}
                        className="rounded bg-red-600 px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-red-700"
                      >
                        Gỡ vi phạm
                      </button>
                    ) : item.status === 'ARCHIVED' ? (
                      <button
                        onClick={() => handleRestore(item.id, item.name)}
                        className="rounded bg-green-600 px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-green-700"
                      >
                        Mở lại sản phẩm
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
