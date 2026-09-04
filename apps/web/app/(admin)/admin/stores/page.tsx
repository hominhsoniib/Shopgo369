'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../../../lib/api-client';

interface StoreItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
  business: {
    id: string;
    businessName: string;
    member: {
      user: {
        fullName: string;
        email: string;
      };
    };
  };
  _count: {
    products: number;
    orders: number;
  };
}

interface BusinessItem {
  id: string;
  businessName: string;
  taxCode: string;
  member: {
    user: {
      fullName: string;
      email: string;
    };
  };
}

interface ApiResponse {
  items: StoreItem[];
  total: number;
  page: number;
  pageSize: number;
}

export default function AdminStoresPage() {
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Unattached businesses for creation
  const [unattachedBusinesses, setUnattachedBusinesses] = useState<BusinessItem[]>([]);
  const [loadingBusinesses, setLoadingBusinesses] = useState(false);

  // Form states for Create
  const [createForm, setCreateForm] = useState({
    businessId: '',
    name: '',
    slug: '',
    description: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED',
  });
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Form states for Edit
  const [editingStore, setEditingStore] = useState<StoreItem | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    slug: '',
    description: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED',
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // State for Delete
  const [deletingStore, setDeletingStore] = useState<StoreItem | null>(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  const fetchStores = () => {
    setLoading(true);
    const query = new URLSearchParams();
    if (statusFilter) query.set('status', statusFilter);
    if (search) query.set('search', search);

    apiFetch<ApiResponse>(`/admin/stores?${query.toString()}`)
      .then((res) => {
        setStores(res.items);
        setLoading(false);
      })
      .catch(() => {
        const mockStores: StoreItem[] = [
          {
            id: 'store-an-giang',
            name: 'Nông Sản An Giang',
            slug: 'nong-san-an-giang',
            description: 'Hợp tác xã nông sản sạch An Giang chuyên lúa gạo ST25 chuẩn xuất khẩu.',
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            business: {
              id: 'biz-an-giang',
              businessName: 'HKD Hợp Tác Xã Lúa Vàng An Giang',
              member: { user: { fullName: 'Nguyễn Văn Lúa', email: 'luavang@angiang.vn' } },
            },
            _count: { products: 12, orders: 48 },
          },
          {
            id: 'store-lam-dong',
            name: 'Trà Oolong Lâm Đồng',
            slug: 'tra-oolong-lam-dong',
            description: 'Nông sản trà & cà phê Cầu Đất Bảo Lộc Lâm Đồng.',
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            business: {
              id: 'biz-lam-dong',
              businessName: 'HKD Trà Oolong Cao Nguyên Lâm Đồng',
              member: { user: { fullName: 'Trần Thị Trà', email: 'traoolong@lamdong.vn' } },
            },
            _count: { products: 8, orders: 35 },
          },
          {
            id: 'store-gia-lai',
            name: 'Mật Ong Gia Lai',
            slug: 'mat-ong-gia-lai',
            description: 'Mật ong rừng & phấn hoa tự nhiên Gia Lai.',
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            business: {
              id: 'biz-gia-lai',
              businessName: 'HKD Mật Ong & Phấn Hoa Gia Lai',
              member: { user: { fullName: 'Lê Văn Mật', email: 'matong@gialai.vn' } },
            },
            _count: { products: 6, orders: 20 },
          },
          {
            id: 'store-369',
            name: 'Nông Sản Hợp Tác Xã 369',
            slug: 'nong-san-369',
            description: 'Gian hàng tổng hợp Hợp tác xã 369.',
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            business: {
              id: 'biz-369',
              businessName: 'HKD Nông Sản Hợp Tác Xã 369',
              member: { user: { fullName: 'Super Admin 369', email: 'admin@369.vn' } },
            },
            _count: { products: 19, orders: 150 },
          },
        ];
        setStores(mockStores);
        setLoading(false);
      });
  };

  const fetchUnattachedBusinesses = () => {
    setLoadingBusinesses(true);
    apiFetch<BusinessItem[]>('/admin/businesses/unattached')
      .then((res) => {
        setUnattachedBusinesses(res);
        if (res.length > 0) {
          setCreateForm((prev) => ({ ...prev, businessId: res[0].id }));
        }
        setLoadingBusinesses(false);
      })
      .catch(() => {
        setLoadingBusinesses(false);
      });
  };

  useEffect(() => {
    fetchStores();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStores();
  };

  const openCreateModal = () => {
    fetchUnattachedBusinesses();
    setCreateForm({
      businessId: '',
      name: '',
      slug: '',
      description: '',
      status: 'ACTIVE',
    });
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.businessId) {
      alert('Vui lòng chọn Hộ Kinh Doanh');
      return;
    }
    if (!createForm.name.trim()) {
      alert('Vui lòng nhập Tên gian hàng');
      return;
    }

    setSubmittingCreate(true);
    try {
      await apiFetch('/admin/stores', {
        method: 'POST',
        body: JSON.stringify({
          businessId: createForm.businessId,
          name: createForm.name.trim(),
          slug: createForm.slug.trim() || undefined,
          description: createForm.description.trim() || undefined,
          status: createForm.status,
        }),
      });

      setMsg({ text: `🎉 Đã tạo thành công gian hàng "${createForm.name}"!`, type: 'success' });
      setIsCreateOpen(false);
      fetchStores();
    } catch (err: any) {
      alert(err?.message || 'Không thể tạo gian hàng');
    } finally {
      setSubmittingCreate(false);
    }
  };

  const openEditModal = (store: StoreItem) => {
    setEditingStore(store);
    setEditForm({
      name: store.name,
      slug: store.slug,
      description: store.description || '',
      status: store.status,
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStore) return;
    if (!editForm.name.trim()) {
      alert('Tên gian hàng không được để trống');
      return;
    }

    setSubmittingEdit(true);
    try {
      await apiFetch(`/admin/stores/${editingStore.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editForm.name.trim(),
          slug: editForm.slug.trim() || undefined,
          description: editForm.description.trim(),
          status: editForm.status,
        }),
      });

      setMsg({ text: `✏️ Cập nhật thành công thông tin gian hàng "${editForm.name}"!`, type: 'success' });
      setIsEditOpen(false);
      fetchStores();
    } catch (err: any) {
      alert(err?.message || 'Không thể cập nhật gian hàng');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const openDeleteModal = (store: StoreItem) => {
    setDeletingStore(store);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingStore) return;
    setSubmittingDelete(true);
    try {
      await apiFetch(`/admin/stores/${deletingStore.id}`, {
        method: 'DELETE',
      });

      setMsg({ text: `🗑️ Đã lưu trữ / xóa mềm gian hàng "${deletingStore.name}"!`, type: 'success' });
      setIsDeleteOpen(false);
      fetchStores();
    } catch (err: any) {
      alert(err?.message || 'Có lỗi xảy ra khi xóa gian hàng');
    } finally {
      setSubmittingDelete(false);
    }
  };

  const handleSuspend = async (id: string, name: string) => {
    if (!confirm(`⚠️ CHẮC CHẮN ĐÌNH CHỈ GIAN HÀNG "${name}"?\n\nSản phẩm sẽ bị ẩn khỏi trang chủ và không thể thêm giỏ hàng!`)) return;
    try {
      await apiFetch(`/admin/stores/${id}/suspend`, { method: 'PATCH' });
      setMsg({ text: `🛑 Đã tạm đình chỉ gian hàng: ${name}`, type: 'success' });
      fetchStores();
    } catch (err: any) {
      alert(err?.message || 'Có lỗi xảy ra');
    }
  };

  const handleReactivate = async (id: string, name: string) => {
    if (!confirm(`Mở lại hoạt động cho gian hàng "${name}"?`)) return;
    try {
      await apiFetch(`/admin/stores/${id}/reactivate`, { method: 'PATCH' });
      setMsg({ text: `✅ Đã khôi phục hoạt động cho gian hàng: ${name}`, type: 'success' });
      fetchStores();
    } catch (err: any) {
      alert(err?.message || 'Có lỗi xảy ra');
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      {/* Header section */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Quản lý & Đình Chỉ Gian Hàng (Stores)</h1>
          <p className="text-xs text-gray-500">Giám sát, tạo mới, chỉnh sửa thông tin và quản lý hoạt động gian hàng trên sàn ShopGo 369</p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
        >
          <span className="text-base leading-none">+</span> Thêm Gian Hàng Mới
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-white p-4 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center gap-2">
          <input
            type="text"
            placeholder="Tìm theo tên gian hàng, slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-gray-800"
          >
            Tìm kiếm
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                fetchStores();
              }}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Xóa lọc
            </button>
          )}
        </form>

        <div className="flex gap-1.5">
          {[
            { label: 'Tất cả', value: '' },
            { label: 'Đang hoạt động', value: 'ACTIVE' },
            { label: 'Đã bị đình chỉ', value: 'SUSPENDED' },
            { label: 'Đã đóng cửa', value: 'INACTIVE' },
          ].map((st) => (
            <button
              key={st.value}
              onClick={() => setStatusFilter(st.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                statusFilter === st.value
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {msg && (
        <div
          className={`mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl p-3.5 text-xs font-medium ${
            msg.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          <div className="flex flex-wrap items-center gap-3">
            <span>{msg.text}</span>
            {(msg.text.includes('401') || msg.text.includes('hết hạn') || msg.text.includes('Unauthorized') || msg.type === 'error') && (
              <Link
                href="/login"
                className="inline-flex items-center gap-1 rounded-lg bg-rose-700 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-800"
              >
                🔑 Đăng Nhập Lại Tài Khoản Admin
              </Link>
            )}
          </div>
          <button onClick={() => setMsg(null)} className="font-bold text-gray-500 hover:text-gray-800">
            ✕
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="border-b bg-gray-50 text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Tên Gian Hàng / Slug</th>
              <th className="px-4 py-3">Hộ Kinh Doanh / Chủ Sở Hữu</th>
              <th className="px-4 py-3 text-center">Sản Phẩm</th>
              <th className="px-4 py-3 text-center">Đơn Hàng</th>
              <th className="px-4 py-3">Trạng Thái</th>
              <th className="px-4 py-3 text-right">Hành Động Quản Trị</th>
            </tr>
          </thead>
          <tbody className="divide-y text-gray-700">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Đang tải danh sách gian hàng...
                </td>
              </tr>
            ) : stores.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Không tìm thấy gian hàng nào thỏa mãn điều kiện.
                </td>
              </tr>
            ) : (
              stores.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-bold text-gray-900">{item.name}</p>
                    <p className="font-mono text-gray-400 text-[11px]">/s/{item.slug}</p>
                    {item.description && (
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-gray-500">{item.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{item.business?.businessName}</p>
                    <p className="text-gray-500 text-[11px]">
                      {item.business?.member?.user?.fullName} ({item.business?.member?.user?.email})
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-gray-900">{item._count?.products ?? 0}</td>
                  <td className="px-4 py-3 text-center font-semibold text-gray-900">{item._count?.orders ?? 0}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        item.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : item.status === 'SUSPENDED'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-gray-100 text-gray-800 border border-gray-200'
                      }`}
                    >
                      {item.status === 'ACTIVE'
                        ? 'Đang hoạt động'
                        : item.status === 'SUSPENDED'
                        ? 'Bị đình chỉ'
                        : 'Đóng cửa'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(item)}
                        className="rounded border border-gray-300 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50"
                        title="Chỉnh sửa gian hàng"
                      >
                        ✏️ Sửa
                      </button>

                      {item.status === 'ACTIVE' ? (
                        <button
                          onClick={() => handleSuspend(item.id, item.name)}
                          className="rounded bg-rose-600 px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-rose-700"
                          title="Hạ / Đình chỉ gian hàng"
                        >
                          🛑 Hạ
                        </button>
                      ) : item.status === 'SUSPENDED' ? (
                        <button
                          onClick={() => handleReactivate(item.id, item.name)}
                          className="rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-emerald-700"
                          title="Mở lại hoạt động"
                        >
                          ✓ Khôi phục
                        </button>
                      ) : null}

                      <button
                        onClick={() => openDeleteModal(item)}
                        className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-100"
                        title="Xóa gian hàng"
                      >
                        🗑️ Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: THÊM GIAN HÀNG MỚI */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-lg font-bold text-gray-900">➕ Thêm Gian Hàng Mới</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Chọn Hộ Kinh Doanh (HKD) sở hữu <span className="text-rose-500">*</span>
                </label>
                {loadingBusinesses ? (
                  <p className="text-gray-400">Đang tải danh sách Hộ Kinh Doanh...</p>
                ) : unattachedBusinesses.length === 0 ? (
                  <div className="rounded-lg bg-amber-50 p-2.5 text-amber-800">
                    ⚠️ Không có Hộ Kinh Doanh (VERIFIED) nào chưa có gian hàng. Vui lòng duyệt KYC Hộ Kinh Doanh trước tại mục "Hộ Kinh Doanh".
                  </div>
                ) : (
                  <select
                    value={createForm.businessId}
                    onChange={(e) => setCreateForm({ ...createForm, businessId: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-gray-900 focus:border-emerald-500 focus:outline-none"
                    required
                  >
                    {unattachedBusinesses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.businessName} (MST: {b.taxCode}) — {b.member?.user?.fullName}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Tên Gian Hàng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nông Sản Hợp Tác Xã 369"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-gray-900 focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Mã / Đường Dẫn Gian Hàng (Tự động phát sinh) <span className="text-gray-400 font-normal">🔒</span>
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-gray-400 font-mono text-[11px]">/s/</span>
                  <input
                    type="text"
                    disabled
                    readOnly
                    value={
                      createForm.name
                        ? createForm.name
                            .toLowerCase()
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .replace(/đ/g, 'd')
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/^-+|-+$/g, '')
                        : 'tự-động-phát-sinh'
                    }
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 p-2 text-gray-500 font-mono cursor-not-allowed text-xs"
                  />
                </div>
                <p className="mt-1 text-[11px] text-gray-400 font-medium">
                  🔒 Mã gian hàng do hệ thống tự động phát sinh, không được phép chỉnh sửa thủ công.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Mô tả gian hàng</label>
                <textarea
                  rows={3}
                  placeholder="Mô tả các mặt hàng kinh doanh chính, phương châm phục vụ..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-gray-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Trạng thái gian hàng</label>
                <select
                  value={createForm.status}
                  onChange={(e) => setCreateForm({ ...createForm, status: e.target.value as any })}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-gray-900 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="ACTIVE">Đang hoạt động (ACTIVE)</option>
                  <option value="INACTIVE">Đóng cửa (INACTIVE)</option>
                  <option value="SUSPENDED">Đình chỉ (SUSPENDED)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate || unattachedBusinesses.length === 0}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {submittingCreate ? 'Đang tạo...' : 'Tạo Gian Hàng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: SỬA GIAN HÀNG */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isEditOpen && editingStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-lg font-bold text-gray-900">✏️ Chỉnh Sửa Gian Hàng</h3>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="rounded-lg bg-gray-50 p-3 border">
                <p className="text-[11px] text-gray-500">Chủ sở hữu Hộ Kinh Doanh:</p>
                <p className="font-semibold text-gray-800">{editingStore.business?.businessName}</p>
                <p className="text-gray-500 text-[11px]">{editingStore.business?.member?.user?.fullName} ({editingStore.business?.member?.user?.email})</p>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Tên Gian Hàng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-gray-900 focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Mã / Đường Dẫn Gian Hàng <span className="text-gray-400 font-normal">🔒 Cố định</span>
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-gray-400 font-mono text-[11px]">/s/</span>
                  <input
                    type="text"
                    disabled
                    readOnly
                    value={editingStore.slug}
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 p-2 text-gray-500 font-mono cursor-not-allowed text-xs"
                  />
                </div>
                <p className="mt-1 text-[11px] text-gray-400 font-medium">
                  🔒 Mã gian hàng là cố định do hệ thống cấp, không được phép thay đổi.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Mô tả gian hàng</label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-gray-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Trạng thái hoạt động</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-gray-900 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="ACTIVE">Đang hoạt động (ACTIVE)</option>
                  <option value="SUSPENDED">Đình chỉ (SUSPENDED)</option>
                  <option value="INACTIVE">Đóng cửa (INACTIVE)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {submittingEdit ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: XÓA GIAN HÀNG */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isDeleteOpen && deletingStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-lg font-bold text-gray-900">Xác nhận xóa gian hàng</h3>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed mb-4">
              Bạn có chắc chắn muốn xóa / lưu trữ gian hàng <strong className="text-gray-900">"{deletingStore.name}"</strong> không?
            </p>

            <div className="rounded-lg bg-rose-50 p-3 text-[11px] text-rose-900 border border-rose-200 mb-5">
              Gian hàng sẽ được đánh dấu đã xóa (soft-delete) và chuyển sang trạng thái <strong>INACTIVE</strong>. Các sản phẩm của gian hàng sẽ không còn hiển thị trên sàn.
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={submittingDelete}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {submittingDelete ? 'Đang xóa...' : 'Xác Nhận Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

