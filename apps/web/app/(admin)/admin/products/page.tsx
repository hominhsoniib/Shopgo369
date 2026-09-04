'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../../../lib/api-client';
import { SAMPLE_PRODUCTS } from '../../../../lib/mock-data';

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
    business?: {
      id: string;
      businessName: string;
    };
  };
  inventory: {
    quantityOnHand: number;
    reservedQuantity: number;
  } | null;
}

interface StoreOption {
  id: string;
  name: string;
  slug: string;
  business?: {
    businessName: string;
  };
}

interface ApiResponse {
  items: ProductItem[];
  total: number;
  page: number;
  pageSize: number;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [storeFilter, setStoreFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // State cho File Upload & Modal Thêm Sản Phẩm
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadMode, setUploadMode] = useState<'FILE' | 'URL'>('FILE');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newForm, setNewForm] = useState({
    storeId: '',
    name: '',
    basePrice: '150000',
    stock: '100',
    description: '',
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchStores = () => {
    apiFetch<{ items: StoreOption[] }>('/admin/stores')
      .then((res) => {
        setStores(res.items || []);
        if (res.items && res.items.length > 0) {
          setNewForm((prev) => ({ ...prev, storeId: prev.storeId || res.items[0].id }));
        }
      })
      .catch(() => {
        const mockStores: StoreOption[] = [
          { id: 'store-an-giang', name: 'Nông Sản An Giang', slug: 'nong-san-an-giang', business: { businessName: 'HKD Hợp Tác Xã Lúa Vàng An Giang' } },
          { id: 'store-lam-dong', name: 'Trà Oolong Lâm Đồng', slug: 'tra-oolong-lam-dong', business: { businessName: 'HKD Trà Oolong Cao Nguyên Lâm Đồng' } },
          { id: 'store-gia-lai', name: 'Mật Ong Gia Lai', slug: 'mat-ong-gia-lai', business: { businessName: 'HKD Mật Ong & Phấn Hoa Gia Lai' } },
          { id: 'store-369', name: 'Nông Sản Hợp Tác Xã 369', slug: 'nong-san-369', business: { businessName: 'HKD Nông Sản Hợp Tác Xã 369' } },
        ];
        setStores(mockStores);
        setNewForm((prev) => ({ ...prev, storeId: mockStores[0].id }));
      });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn tập tin hình ảnh dạng PNG, JPG, JPEG hoặc WEBP');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setNewForm((prev) => ({ ...prev, imageUrl: event.target!.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const fetchProducts = () => {
    setLoading(true);
    const query = new URLSearchParams();
    if (statusFilter) query.set('status', statusFilter);
    if (storeFilter) query.set('storeId', storeFilter);
    if (search) query.set('search', search);

    apiFetch<ApiResponse>(`/admin/products?${query.toString()}`)
      .then((res) => {
        setProducts(res.items);
        setLoading(false);
        setMsg('');
      })
      .catch(() => {
        // Fallback to sample products for Vercel Cloud demo mode
        const mockProducts: ProductItem[] = SAMPLE_PRODUCTS.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          basePrice: Number(p.basePrice),
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          images: p.images,
          store: p.store,
          inventory: p.inventory,
        }));
        setProducts(mockProducts);
        setLoading(false);
        setMsg('');
      });
  };

  useEffect(() => {
    fetchStores();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [statusFilter, storeFilter]);

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
    if (!newForm.storeId) return alert('Vui lòng chọn Gian Hàng / Hộ Kinh Doanh sở hữu');
    if (!newForm.name.trim()) return alert('Vui lòng nhập tên sản phẩm');
    
    setSubmitting(true);
    try {
      await apiFetch('/admin/products', {
        method: 'POST',
        body: JSON.stringify({
          storeId: newForm.storeId,
          name: newForm.name.trim(),
          description: newForm.description.trim() || 'Sản phẩm nông sản đặc sản vùng miền chính hãng chất lượng cao',
          basePrice: parseFloat(newForm.basePrice) || 100000,
          initialQuantity: parseInt(newForm.stock, 10) || 50,
          imageUrls: newForm.imageUrl ? [newForm.imageUrl] : [],
        }),
      });

      setMsg(`✨ Đã thêm mới sản phẩm thành công: ${newForm.name}`);
      setShowAddModal(false);
      setNewForm({
        storeId: stores.length > 0 ? stores[0].id : '',
        name: '',
        basePrice: '150000',
        stock: '100',
        description: '',
        imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop',
      });
      fetchProducts();
    } catch (err: any) {
      alert(err?.message ? `Lỗi: ${err.message}` : 'Có lỗi khi tạo sản phẩm');
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
            Giám sát danh mục sản phẩm toàn sàn, quản lý hình ảnh & gán gian hàng sở hữu cho sản phẩm
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchStores();
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-95"
          >
            <span>➕ Thêm Sản Phẩm Mới</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Store Selector */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200/80 bg-white p-3.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex flex-wrap gap-1">
            {[
              { id: '', label: 'Tất cả sản phẩm' },
              { id: 'ACTIVE', label: '🟢 Đang bán' },
              { id: 'ARCHIVED', label: '🔴 Đã gỡ vi phạm' },
              { id: 'OUT_OF_STOCK', label: '🟡 Hết hàng' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                  statusFilter === st.id
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Store Filter */}
          {stores.length > 0 && (
            <select
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              className="rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-800 focus:border-emerald-500 focus:outline-none"
            >
              <option value="">🏪 Tất cả gian hàng ({stores.length})</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.business?.businessName || 'HKD'})
                </option>
              ))}
            </select>
          )}
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
        <div
          className={`mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl p-3.5 text-xs font-medium ${
            msg.includes('401') || msg.includes('hết hạn') || msg.includes('Unauthorized') || msg.includes('Lỗi')
              ? 'bg-rose-50 text-rose-900 border border-rose-200'
              : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
          }`}
        >
          <div className="flex flex-wrap items-center gap-3">
            <span>{msg}</span>
            {(msg.includes('401') || msg.includes('hết hạn') || msg.includes('Unauthorized')) && (
              <Link
                href="/login"
                className="inline-flex items-center gap-1 rounded-lg bg-rose-700 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-800"
              >
                🔑 Đăng Nhập Lại Tài Khoản Admin
              </Link>
            )}
          </div>
          <button onClick={() => setMsg('')} className="font-bold text-neutral-500 hover:text-neutral-800">
            ✕
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-neutral-200/80 bg-white shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-neutral-200 bg-neutral-50/80 text-neutral-500 font-semibold uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3.5">Hình Ảnh</th>
              <th className="px-4 py-3.5">Tên Sản Phẩm</th>
              <th className="px-4 py-3.5">Gian Hàng & Hộ Kinh Doanh</th>
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

                    {/* Column 3: Store & Business */}
                    <td className="px-4 py-3">
                      <p className="font-bold text-neutral-900">{item.store?.name ?? 'ShopGo Official'}</p>
                      {item.store?.business?.businessName && (
                        <p className="text-[11px] font-medium text-emerald-700">
                          HKD: {item.store.business.businessName}
                        </p>
                      )}
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
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : item.status === 'ARCHIVED'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-neutral-100 text-neutral-800 border border-neutral-200'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-bold text-neutral-900">➕ Thêm Sản Phẩm Mới</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-lg font-bold text-neutral-400 hover:text-neutral-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="mt-4 flex flex-col gap-4 text-xs">
              {/* Select Gian Hàng / Hộ Kinh Doanh */}
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Chọn Gian Hàng / Hộ Kinh Doanh Sở Hữu <span className="text-rose-500">*</span>
                </label>
                {stores.length === 0 ? (
                  <div className="rounded-xl bg-amber-50 p-2.5 text-amber-800 border border-amber-200">
                    ⚠️ Chưa có Gian Hàng nào hoạt động. Vui lòng tạo Gian Hàng tại mục "Gian hàng" trước!
                  </div>
                ) : (
                  <select
                    value={newForm.storeId}
                    onChange={(e) => setNewForm({ ...newForm, storeId: e.target.value })}
                    className="w-full rounded-xl border border-neutral-300 p-2.5 text-xs text-neutral-900 font-medium focus:border-emerald-500 focus:outline-none"
                    required
                  >
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        🏢 {s.name} — {s.business?.businessName || 'Hộ Kinh Doanh'} (/s/{s.slug})
                      </option>
                    ))}
                  </select>
                )}
              </div>

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

              {/* Hình ảnh sản phẩm (File Upload hoặc Link URL) */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-700">Hình Ảnh Sản Phẩm *</label>
                  <div className="flex gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setUploadMode('FILE')}
                      className={`rounded-lg px-2 py-0.5 font-medium ${
                        uploadMode === 'FILE'
                          ? 'bg-neutral-900 text-white'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                      }`}
                    >
                      📁 Tải ảnh từ máy tính
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMode('URL')}
                      className={`rounded-lg px-2 py-0.5 font-medium ${
                        uploadMode === 'URL'
                          ? 'bg-neutral-900 text-white'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                      }`}
                    >
                      🌐 Dán URL
                    </button>
                  </div>
                </div>

                {uploadMode === 'FILE' ? (
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50/80 p-4 text-center transition hover:border-emerald-500 hover:bg-emerald-50/30"
                    >
                      {newForm.imageUrl ? (
                        <div className="flex items-center gap-3">
                          <img
                            src={newForm.imageUrl}
                            alt="Preview"
                            className="h-16 w-16 rounded-xl border border-neutral-200 object-cover shadow-sm"
                          />
                          <div className="text-left">
                            <p className="text-xs font-semibold text-emerald-700">✓ Đã chọn ảnh thành công!</p>
                            <p className="text-[10px] text-neutral-400 mt-0.5">Bấm vào đây để chọn ảnh khác</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-lg mb-1">
                            📷
                          </div>
                          <p className="text-xs font-semibold text-neutral-800">
                            Bấm để chọn file ảnh từ máy tính / điện thoại
                          </p>
                          <p className="text-[10px] text-neutral-400 mt-0.5">Hỗ trợ PNG, JPG, JPEG, WEBP (tối đa 10MB)</p>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <input
                      type="url"
                      placeholder="https://example.com/hinh-anh.jpg"
                      value={newForm.imageUrl}
                      onChange={(e) => setNewForm({ ...newForm, imageUrl: e.target.value })}
                      className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs focus:border-neutral-900 focus:outline-none"
                    />
                    {newForm.imageUrl && (
                      <div className="mt-2 flex items-center gap-2">
                        <img src={newForm.imageUrl} alt="Preview" className="h-10 w-10 rounded-lg object-cover border" />
                        <span className="text-[10px] text-neutral-400">Xem trước hình ảnh từ URL</span>
                      </div>
                    )}
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
                  disabled={submitting || stores.length === 0}
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

