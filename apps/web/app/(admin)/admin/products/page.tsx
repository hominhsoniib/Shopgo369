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
  images?: { url: string; sortOrder?: number }[];
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
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // State cho Modal Thêm Sản Phẩm
  const [showAddModal, setShowAddModal] = useState(false);
  const [newForm, setNewForm] = useState({
    name: '',
    basePrice: '150000',
    stock: '100',
    description: '',
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop',
  });
  const [submitting, setSubmitting] = useState(false);

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
        setMsg(typeof err?.message === 'string' ? err.message : 'Bạn cần đăng nhập tài khoản Admin');
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

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.name.trim()) return alert('Vui lòng nhập tên sản phẩm');
    setSubmitting(true);
    try {
      // Gọi API tạo sản phẩm cho gian hàng mẫu
      const slug = newForm.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') + '-' + Date.now().toString().slice(-4);

      await apiFetch('/products', {
        method: 'POST',
        body: JSON.stringify({
          name: newForm.name,
          slug,
          description: newForm.description || 'Sản phẩm nông sản đặc sản vùng miền chính hãng chất lượng cao',
          basePrice: parseFloat(newForm.basePrice) || 100000,
          status: 'ACTIVE',
          images: newForm.imageUrl ? [{ url: newForm.imageUrl, sortOrder: 0 }] : [],
          inventory: { quantityOnHand: parseInt(newForm.stock, 10) || 50 },
        }),
      });

      setMsg(`✨ Đã thêm mới sản phẩm thành công: ${newForm.name}`);
      setShowAddModal(false);
      setNewForm({
        name: '',
        basePrice: '150000',
        stock: '100',
        description: '',
        imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop',
      });
      fetchProducts();
    } catch (err: any) {
      alert(err?.message || 'Có lỗi khi tạo sản phẩm');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Title & Actions Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Kiểm Duyệt & Quản Lý Sản Phẩm</h1>
          <p className="text-xs text-neutral-500 mt-1">
            Giám sát danh mục sản phẩm toàn sàn, quản lý hình ảnh & xử lý các sản phẩm vi phạm
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700"
          >
            <span>➕ Thêm Sản Phẩm Mới</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200/80 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: '', label: 'Tất cả sản phẩm' },
            { id: 'ACTIVE', label: '🟢 Đang đăng bán' },
            { id: 'ARCHIVED', label: '🔴 Đã bị ẩn / Khóa' },
            { id: 'OUT_OF_STOCK', label: '🟡 Hết hàng' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
                statusFilter === st.id
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Tìm tên sản phẩm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchProducts()}
            className="w-48 rounded-xl border border-neutral-300 px-3 py-1.5 text-xs focus:border-neutral-900 focus:outline-none"
          />
          <button
            onClick={fetchProducts}
            className="rounded-xl border border-neutral-300 bg-neutral-100 px-3 py-1.5 text-xs font-medium hover:bg-neutral-200"
          >
            Tìm
          </button>
        </div>
      </div>

      {msg && (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3.5 text-xs font-medium text-blue-900">
          {msg}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-neutral-200/80 bg-white shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-neutral-200 bg-neutral-50/80 text-neutral-500 font-semibold uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3.5">Hình Ảnh</th>
              <th className="px-4 py-3.5">Tên Sản Phẩm</th>
              <th className="px-4 py-3.5">Gian Hàng</th>
              <th className="px-4 py-3.5">Giá Niêm Yết</th>
              <th className="px-4 py-3.5">Tồn Kho / Giữ Chỗ</th>
              <th className="px-4 py-3.5">Trạng Thái</th>
              <th className="px-4 py-3.5 text-right">Thao Tác Quản Trị</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 text-neutral-700">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-neutral-400">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
                  <p className="mt-2 text-xs">Đang tải danh sách sản phẩm...</p>
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-neutral-400">
                  Không tìm thấy sản phẩm nào.
                </td>
              </tr>
            ) : (
              products.map((item) => {
                const imgUrl = item.images && item.images.length > 0 ? item.images[0].url : null;
                return (
                  <tr key={item.id} className="transition hover:bg-neutral-50/80">
                    {/* Column 1: Image Thumbnail */}
                    <td className="px-4 py-3">
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={item.name}
                          onClick={() => setPreviewImage(imgUrl)}
                          className="h-12 w-12 cursor-pointer rounded-xl border border-neutral-200/80 object-cover shadow-sm transition hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-lg">
                          🌾
                        </div>
                      )}
                    </td>

                    {/* Column 2: Name */}
                    <td className="px-4 py-3 font-semibold text-neutral-900 max-w-xs">
                      <p className="line-clamp-2">{item.name}</p>
                      <p className="font-mono text-[10px] text-neutral-400 font-normal">slug: {item.slug}</p>
                    </td>

                    {/* Column 3: Store */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-neutral-800">{item.store?.name ?? 'ShopGo Official'}</p>
                      <p className="font-mono text-[10px] text-neutral-400">/s/{item.store?.slug}</p>
                    </td>

                    {/* Column 4: Price */}
                    <td className="px-4 py-3 font-bold text-neutral-900 text-sm">
                      {Number(item.basePrice).toLocaleString('vi-VN')}đ
                    </td>

                    {/* Column 5: Stock */}
                    <td className="px-4 py-3">
                      {item.inventory ? (
                        <span>
                          Sẵn có: <strong className="text-neutral-900">{item.inventory.quantityOnHand}</strong> (Giữ chỗ:{' '}
                          {item.inventory.reservedQuantity})
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* Column 6: Status */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          item.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'ARCHIVED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-neutral-100 text-neutral-800'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            item.status === 'ACTIVE' ? 'bg-emerald-600' : 'bg-rose-600'
                          }`}
                        />
                        {item.status === 'ACTIVE'
                          ? 'Đang đăng bán'
                          : item.status === 'ARCHIVED'
                          ? 'Đã gỡ vi phạm'
                          : item.status}
                      </span>
                    </td>

                    {/* Column 7: Actions */}
                    <td className="px-4 py-3 text-right">
                      {item.status === 'ACTIVE' ? (
                        <button
                          onClick={() => handleTakedown(item.id, item.name)}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700"
                        >
                          Gỡ vi phạm
                        </button>
                      ) : item.status === 'ARCHIVED' ? (
                        <button
                          onClick={() => handleRestore(item.id, item.name)}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                        >
                          Mở lại sản phẩm
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Xem Ảnh Phóng To */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <div className="relative max-w-lg overflow-hidden rounded-2xl bg-white p-2 shadow-2xl">
            <img src={previewImage} alt="Preview" className="max-h-[80vh] w-full rounded-xl object-contain" />
            <p className="py-2 text-center text-xs text-neutral-500">Bấm bất kỳ đâu để đóng</p>
          </div>
        </div>
      )}

      {/* Modal Thêm Sản Phẩm Mới */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-bold text-neutral-900">➕ Thêm Sản Phẩm Mới</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-lg font-bold text-neutral-400 hover:text-neutral-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="mt-4 flex flex-col gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Tên Sản Phẩm *</label>
                <input
                  type="text"
                  placeholder="VD: Mật Ong Hoa Cà Phê Gia Lai 500ml"
                  value={newForm.name}
                  onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs focus:border-neutral-900 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Giá Niêm Yết (VNĐ) *</label>
                  <input
                    type="number"
                    value={newForm.basePrice}
                    onChange={(e) => setNewForm({ ...newForm, basePrice: e.target.value })}
                    className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs focus:border-neutral-900 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Tồn Kho Ban Đầu *</label>
                  <input
                    type="number"
                    value={newForm.stock}
                    onChange={(e) => setNewForm({ ...newForm, stock: e.target.value })}
                    className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs focus:border-neutral-900 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">URL Hình Ảnh Sản Phẩm *</label>
                <input
                  type="url"
                  value={newForm.imageUrl}
                  onChange={(e) => setNewForm({ ...newForm, imageUrl: e.target.value })}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs focus:border-neutral-900 focus:outline-none"
                  required
                />
                {newForm.imageUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <img src={newForm.imageUrl} alt="Preview" className="h-10 w-10 rounded-lg object-cover border" />
                    <span className="text-[10px] text-neutral-400">Xem trước hình ảnh</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Mô Tả Sản Phẩm</label>
                <textarea
                  rows={2}
                  placeholder="Nhập chi tiết nguồn gốc, công dụng sản phẩm..."
                  value={newForm.description}
                  onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs focus:border-neutral-900 focus:outline-none"
                />
              </div>

              <div className="mt-4 flex items-center justify-end gap-2 border-t pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-neutral-300 px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50"
                >
                  {submitting ? 'Đang tạo...' : 'Tạo Sản Phẩm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
