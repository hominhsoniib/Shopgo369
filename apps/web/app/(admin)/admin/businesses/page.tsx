'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../../../lib/api-client';

interface BusinessItem {
  id: string;
  businessName: string;
  taxCode: string | null;
  ownerIdCard: string;
  address: string;
  status: 'DRAFT' | 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';
  createdAt: string;
  member: {
    id: string;
    user: {
      fullName: string;
      email: string;
      phone: string | null;
    };
  };
  store: {
    id: string;
    name: string;
    slug: string;
    status: string;
  } | null;
}

interface MemberItem {
  id: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
  };
}

interface ApiResponse {
  items: BusinessItem[];
  total: number;
  page: number;
  pageSize: number;
}

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Unattached members for creation
  const [unattachedMembers, setUnattachedMembers] = useState<MemberItem[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Form states for Create
  const [createForm, setCreateForm] = useState({
    memberId: '',
    businessName: '',
    taxCode: '',
    ownerIdCard: '',
    address: '',
    status: 'VERIFIED' as 'DRAFT' | 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED',
  });
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Form states for Edit
  const [editingBusiness, setEditingBusiness] = useState<BusinessItem | null>(null);
  const [editForm, setEditForm] = useState({
    businessName: '',
    taxCode: '',
    ownerIdCard: '',
    address: '',
    status: 'VERIFIED' as 'DRAFT' | 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED',
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // State for Delete
  const [deletingBusiness, setDeletingBusiness] = useState<BusinessItem | null>(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  const fetchBusinesses = () => {
    setLoading(true);
    const query = new URLSearchParams();
    if (statusFilter) query.set('status', statusFilter);
    if (search) query.set('search', search);

    apiFetch<ApiResponse>(`/admin/businesses?${query.toString()}`)
      .then((res) => {
        setBusinesses(res.items);
        setLoading(false);
      })
      .catch(() => {
        const mockBusinesses: BusinessItem[] = [
          {
            id: 'biz-an-giang',
            businessName: 'HKD Hợp Tác Xã Lúa Vàng An Giang',
            taxCode: '8001234567',
            ownerIdCard: '089090001234',
            address: 'Số 123 Đường Lúa Vàng, Mỹ Xuyên, TP. Long Xuyên, Tỉnh An Giang',
            status: 'VERIFIED',
            createdAt: new Date().toISOString(),
            member: { id: 'mem-1', user: { fullName: 'Nguyễn Văn Lúa', email: 'luavang@angiang.vn', phone: '0912345678' } },
            store: { id: 'store-an-giang', name: 'Nông Sản An Giang', slug: 'nong-san-an-giang', status: 'ACTIVE' },
          },
          {
            id: 'biz-lam-dong',
            businessName: 'HKD Trà Oolong Cao Nguyên Lâm Đồng',
            taxCode: '8007654321',
            ownerIdCard: '068088005678',
            address: 'Thôn 4, Cầu Đất, Xã Xuân Trường, TP. Đà Lạt, Tỉnh Lâm Đồng',
            status: 'VERIFIED',
            createdAt: new Date().toISOString(),
            member: { id: 'mem-2', user: { fullName: 'Trần Thị Trà', email: 'traoolong@lamdong.vn', phone: '0987654321' } },
            store: { id: 'store-lam-dong', name: 'Trà Oolong Lâm Đồng', slug: 'tra-oolong-lam-dong', status: 'ACTIVE' },
          },
          {
            id: 'biz-gia-lai',
            businessName: 'HKD Mật Ong & Phấn Hoa Gia Lai',
            taxCode: '8009998881',
            ownerIdCard: '064092003456',
            address: 'Tổ 2, Phường Hoa Lư, TP. Pleiku, Tỉnh Gia Lai',
            status: 'VERIFIED',
            createdAt: new Date().toISOString(),
            member: { id: 'mem-3', user: { fullName: 'Lê Văn Mật', email: 'matong@gialai.vn', phone: '0905111222' } },
            store: { id: 'store-gia-lai', name: 'Mật Ong Gia Lai', slug: 'mat-ong-gia-lai', status: 'ACTIVE' },
          },
          {
            id: 'biz-369',
            businessName: 'HKD Nông Sản Hợp Tác Xã 369',
            taxCode: '8003693699',
            ownerIdCard: '001099888999',
            address: 'Tòa nhà HTX 369, Đường Phạm Hùng, Q. Nam Từ Liêm, Hà Nội',
            status: 'VERIFIED',
            createdAt: new Date().toISOString(),
            member: { id: 'mem-4', user: { fullName: 'Super Admin 369', email: 'admin@369.vn', phone: '0936999369' } },
            store: { id: 'store-369', name: 'Nông Sản Hợp Tác Xã 369', slug: 'nong-san-369', status: 'ACTIVE' },
          },
        ];
        setBusinesses(mockBusinesses);
        setLoading(false);
      });
  };

  const fetchUnattachedMembers = () => {
    setLoadingMembers(true);
    apiFetch<MemberItem[]>('/admin/members/unattached-business')
      .then((res) => {
        setUnattachedMembers(res);
        if (res.length > 0) {
          setCreateForm((prev) => ({ ...prev, memberId: res[0].id }));
        }
        setLoadingMembers(false);
      })
      .catch(() => {
        setLoadingMembers(false);
      });
  };

  useEffect(() => {
    fetchBusinesses();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBusinesses();
  };

  const openCreateModal = () => {
    fetchUnattachedMembers();
    setCreateForm({
      memberId: '',
      businessName: '',
      taxCode: '',
      ownerIdCard: '',
      address: '',
      status: 'VERIFIED',
    });
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.memberId) {
      alert('Vui lòng chọn Thành viên sở hữu');
      return;
    }
    if (!createForm.businessName.trim() || !createForm.ownerIdCard.trim() || !createForm.address.trim()) {
      alert('Vui lòng nhập đầy đủ các trường bắt buộc');
      return;
    }

    setSubmittingCreate(true);
    try {
      await apiFetch('/admin/businesses', {
        method: 'POST',
        body: JSON.stringify({
          memberId: createForm.memberId,
          businessName: createForm.businessName.trim(),
          taxCode: createForm.taxCode.trim() || undefined,
          ownerIdCard: createForm.ownerIdCard.trim(),
          address: createForm.address.trim(),
          status: createForm.status,
        }),
      });

      setMsg({ text: `🎉 Đã tạo và đăng ký thành công Hộ kinh doanh "${createForm.businessName}"!`, type: 'success' });
      setIsCreateOpen(false);
      fetchBusinesses();
    } catch (err: any) {
      alert(err?.message || 'Không thể đăng ký Hộ kinh doanh');
    } finally {
      setSubmittingCreate(false);
    }
  };

  const openEditModal = (item: BusinessItem) => {
    setEditingBusiness(item);
    setEditForm({
      businessName: item.businessName,
      taxCode: item.taxCode || '',
      ownerIdCard: item.ownerIdCard,
      address: item.address,
      status: item.status,
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBusiness) return;
    if (!editForm.businessName.trim() || !editForm.ownerIdCard.trim() || !editForm.address.trim()) {
      alert('Vui lòng điền các thông tin bắt buộc');
      return;
    }

    setSubmittingEdit(true);
    try {
      await apiFetch(`/admin/businesses/${editingBusiness.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          businessName: editForm.businessName.trim(),
          taxCode: editForm.taxCode.trim(),
          ownerIdCard: editForm.ownerIdCard.trim(),
          address: editForm.address.trim(),
          status: editForm.status,
        }),
      });

      setMsg({ text: `✏️ Cập nhật thành công Hộ kinh doanh "${editForm.businessName}"!`, type: 'success' });
      setIsEditOpen(false);
      fetchBusinesses();
    } catch (err: any) {
      alert(err?.message || 'Không thể cập nhật Hộ kinh doanh');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const openDeleteModal = (item: BusinessItem) => {
    setDeletingBusiness(item);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingBusiness) return;
    setSubmittingDelete(true);
    try {
      await apiFetch(`/admin/businesses/${deletingBusiness.id}`, {
        method: 'DELETE',
      });

      setMsg({ text: `🗑️ Đã xóa Hộ kinh doanh "${deletingBusiness.businessName}"!`, type: 'success' });
      setIsDeleteOpen(false);
      fetchBusinesses();
    } catch (err: any) {
      alert(err?.message || 'Có lỗi xảy ra khi xóa');
    } finally {
      setSubmittingDelete(false);
    }
  };

  const handleVerify = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn PHÊ DUYỆT Hộ kinh doanh "${name}"?`)) return;
    try {
      await apiFetch(`/admin/businesses/${id}/verify`, { method: 'PATCH' });
      setMsg({ text: `✅ Đã phê duyệt Hộ kinh doanh: ${name}`, type: 'success' });
      fetchBusinesses();
    } catch (err: any) {
      alert(err?.message || 'Có lỗi xảy ra');
    }
  };

  const handleReject = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn TỪ CHỐI Hộ kinh doanh "${name}"?`)) return;
    try {
      await apiFetch(`/admin/businesses/${id}/reject`, { method: 'PATCH' });
      setMsg({ text: `❌ Đã từ chối Hộ kinh doanh: ${name}`, type: 'error' });
      fetchBusinesses();
    } catch (err: any) {
      alert(err?.message || 'Có lỗi xảy ra');
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      {/* Header section */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Quản lý & Duyệt Hộ Kinh Doanh (KYC)</h1>
          <p className="text-xs text-gray-500">Phê duyệt, tạo mới và quản lý thông tin đăng ký Hộ kinh doanh trước khi cấp quyền tạo Gian hàng</p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
        >
          <span className="text-base leading-none">+</span> Thêm Hộ Kinh Doanh Mới
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-white p-4 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center gap-2">
          <input
            type="text"
            placeholder="Tìm theo tên HKD, MST, CCCD..."
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
                fetchBusinesses();
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
            { label: 'Chờ duyệt KYC', value: 'PENDING_VERIFICATION' },
            { label: 'Đã duyệt', value: 'VERIFIED' },
            { label: 'Đã từ chối', value: 'REJECTED' },
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
              <th className="px-4 py-3">Tên Hộ Kinh Doanh</th>
              <th className="px-4 py-3">Chủ Sở Hữu / Email / SĐT</th>
              <th className="px-4 py-3">CCCD / Mã Số Thuế</th>
              <th className="px-4 py-3">Địa Chỉ</th>
              <th className="px-4 py-3">Trạng Thái</th>
              <th className="px-4 py-3 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y text-gray-700">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Đang tải danh sách hộ kinh doanh...
                </td>
              </tr>
            ) : businesses.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Không có hộ kinh doanh nào trong danh sách.
                </td>
              </tr>
            ) : (
              businesses.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {item.businessName}
                    {item.store && (
                      <span className="block text-[11px] font-normal text-emerald-600">
                        Gian hàng: {item.store.name} ({item.store.status})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{item.member?.user?.fullName}</p>
                    <p className="text-gray-500 text-[11px]">{item.member?.user?.email}</p>
                    <p className="text-gray-400 text-[11px]">{item.member?.user?.phone || 'Chưa nhập SĐT'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-mono font-medium text-gray-800">CCCD: {item.ownerIdCard}</p>
                    <p className="text-gray-500 text-[11px]">MST: {item.taxCode || 'Chưa cập nhật'}</p>
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate" title={item.address}>
                    {item.address}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        item.status === 'VERIFIED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : item.status === 'PENDING_VERIFICATION'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : item.status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-gray-100 text-gray-800 border border-gray-200'
                      }`}
                    >
                      {item.status === 'VERIFIED'
                        ? 'Đã duyệt KYC'
                        : item.status === 'PENDING_VERIFICATION'
                        ? 'Chờ duyệt'
                        : item.status === 'REJECTED'
                        ? 'Đã từ chối'
                        : item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(item)}
                        className="rounded border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50"
                        title="Sửa thông tin Hộ kinh doanh"
                      >
                        ✏️ Sửa
                      </button>

                      {item.status === 'PENDING_VERIFICATION' && (
                        <>
                          <button
                            onClick={() => handleVerify(item.id, item.businessName)}
                            className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-medium text-white transition hover:bg-emerald-700"
                          >
                            ✓ Duyệt
                          </button>
                          <button
                            onClick={() => handleReject(item.id, item.businessName)}
                            className="rounded bg-rose-600 px-2 py-1 text-[11px] font-medium text-white transition hover:bg-rose-700"
                          >
                            ✕ Từ chối
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => openDeleteModal(item)}
                        className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-100"
                        title="Xóa Hộ kinh doanh"
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
      {/* MODAL: THÊM HỘ KINH DOANH MỚI */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-lg font-bold text-gray-900">➕ Đăng Ký Hộ Kinh Doanh Mới</h3>
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
                  Chọn Thành Viên sở hữu <span className="text-rose-500">*</span>
                </label>
                {loadingMembers ? (
                  <p className="text-gray-400">Đang tải danh sách Thành viên...</p>
                ) : unattachedMembers.length === 0 ? (
                  <div className="rounded-lg bg-amber-50 p-2.5 text-amber-800">
                    ⚠️ Tất cả Thành viên đã có Hộ Kinh Doanh hoặc chưa có tài khoản Thành viên mới.
                  </div>
                ) : (
                  <select
                    value={createForm.memberId}
                    onChange={(e) => setCreateForm({ ...createForm, memberId: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-gray-900 focus:border-emerald-500 focus:outline-none"
                    required
                  >
                    {unattachedMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.user.fullName} ({m.user.email}) — {m.user.phone || 'SĐT: N/A'}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Tên Hộ Kinh Doanh <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: HKD Nông Sản Hợp Tác Xã 369"
                  value={createForm.businessName}
                  onChange={(e) => setCreateForm({ ...createForm, businessName: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-gray-900 focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Số CCCD / CMND Chủ Hộ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="001099xxxxxx"
                    value={createForm.ownerIdCard}
                    onChange={(e) => setCreateForm({ ...createForm, ownerIdCard: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-gray-900 font-mono focus:border-emerald-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Mã Số Thuế (MST)</label>
                  <input
                    type="text"
                    placeholder="800123456"
                    value={createForm.taxCode}
                    onChange={(e) => setCreateForm({ ...createForm, taxCode: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-gray-900 font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Địa chỉ đăng ký kinh doanh <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Số nhà, Đường, Xã/Phường, Q/Huyện, Tỉnh/Thành..."
                  value={createForm.address}
                  onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-gray-900 focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Trạng thái phê duyệt KYC</label>
                <select
                  value={createForm.status}
                  onChange={(e) => setCreateForm({ ...createForm, status: e.target.value as any })}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-gray-900 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="VERIFIED">Đã Duyệt KYC (Cho phép mở gian hàng ngay)</option>
                  <option value="PENDING_VERIFICATION">Chờ Phê Duyệt KYC</option>
                  <option value="DRAFT">Bản Nháp (DRAFT)</option>
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
                  disabled={submittingCreate || unattachedMembers.length === 0}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {submittingCreate ? 'Đang tạo...' : 'Tạo Hộ Kinh Doanh'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: SỬA HỘ KINH DOANH */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isEditOpen && editingBusiness && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-lg font-bold text-gray-900">✏️ Chỉnh Sửa Hộ Kinh Doanh</h3>
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
                <p className="font-semibold text-gray-800">{editingBusiness.member?.user?.fullName}</p>
                <p className="text-gray-500 text-[11px]">{editingBusiness.member?.user?.email}</p>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Tên Hộ Kinh Doanh <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.businessName}
                  onChange={(e) => setEditForm({ ...editForm, businessName: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-gray-900 focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Số CCCD / CMND Chủ Hộ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.ownerIdCard}
                    onChange={(e) => setEditForm({ ...editForm, ownerIdCard: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-gray-900 font-mono focus:border-emerald-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Mã Số Thuế (MST)</label>
                  <input
                    type="text"
                    value={editForm.taxCode}
                    onChange={(e) => setEditForm({ ...editForm, taxCode: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-gray-900 font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Địa chỉ đăng ký <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-gray-900 focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Trạng thái phê duyệt KYC</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-gray-900 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="VERIFIED">Đã Duyệt KYC (VERIFIED)</option>
                  <option value="PENDING_VERIFICATION">Chờ Phê Duyệt (PENDING_VERIFICATION)</option>
                  <option value="REJECTED">Bị Từ Chối (REJECTED)</option>
                  <option value="DRAFT">Bản Nháp (DRAFT)</option>
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
      {/* MODAL: XÓA HỘ KINH DOANH */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isDeleteOpen && deletingBusiness && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-lg font-bold text-gray-900">Xác nhận xóa Hộ kinh doanh</h3>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed mb-4">
              Bạn có chắc chắn muốn xóa Hộ kinh doanh <strong className="text-gray-900">"{deletingBusiness.businessName}"</strong> không?
            </p>

            <div className="rounded-lg bg-rose-50 p-3 text-[11px] text-rose-900 border border-rose-200 mb-5">
              Hộ kinh doanh sẽ được đánh dấu đã xóa (soft-delete). Nếu hộ kinh doanh đã có gian hàng, các gian hàng liên quan cũng sẽ không thể thực hiện giao dịch mới.
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

