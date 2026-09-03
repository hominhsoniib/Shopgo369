'use client';

import { useEffect, useState } from 'react';
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

interface ApiResponse {
  items: BusinessItem[];
  total: number;
  page: number;
  pageSize: number;
}

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING_VERIFICATION');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

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
      .catch((err) => {
        setMsg(typeof err?.message === 'string' ? err.message : 'Không thể tải danh sách Hộ KD');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchBusinesses();
  }, [statusFilter]);

  const handleVerify = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn PHÊ DUYỆT Hộ kinh doanh "${name}"?`)) return;
    try {
      await apiFetch(`/admin/businesses/${id}/verify`, { method: 'PATCH' });
      setMsg(`✅ Đã phê duyệt Hộ kinh doanh: ${name}`);
      fetchBusinesses();
    } catch (err: any) {
      alert(err?.message || 'Có lỗi xảy ra');
    }
  };

  const handleReject = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn TỪ CHỐI Hộ kinh doanh "${name}"?`)) return;
    try {
      await apiFetch(`/admin/businesses/${id}/reject`, { method: 'PATCH' });
      setMsg(`❌ Đã từ chối Hộ kinh doanh: ${name}`);
      fetchBusinesses();
    } catch (err: any) {
      alert(err?.message || 'Có lỗi xảy ra');
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Quản lý & Duyệt Hộ Kinh Doanh (KYC)</h1>
          <p className="text-xs text-gray-500">Phê duyệt thông tin đăng ký Hộ kinh doanh trước khi cấp quyền tạo Gian hàng</p>
        </div>

        {/* Filter controls */}
        <div className="flex gap-2">
          {['PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', ''].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                statusFilter === st ? 'bg-neutral-900 text-white' : 'border bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {st === 'PENDING_VERIFICATION'
                ? 'Chờ duyệt KYC'
                : st === 'VERIFIED'
                ? 'Đã duyệt'
                : st === 'REJECTED'
                ? 'Đã từ chối'
                : 'Tất cả'}
            </button>
          ))}
        </div>
      </div>

      {msg && (
        <div className="mb-4 rounded-lg bg-blue-50 p-3 text-xs font-medium text-blue-800">
          {msg}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="border-b bg-gray-50 text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Tên Hộ Kinh Doanh</th>
              <th className="px-4 py-3">Chủ sở hữu / Email / SĐT</th>
              <th className="px-4 py-3">CCCD / Tax Code</th>
              <th className="px-4 py-3">Địa chỉ</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y text-gray-700">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Đang tải danh sách...
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
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {item.businessName}
                    {item.store && (
                      <span className="block text-[11px] font-normal text-blue-600">
                        Gian hàng: {item.store.name} ({item.store.status})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{item.member?.user?.fullName}</p>
                    <p className="text-gray-500">{item.member?.user?.email}</p>
                    <p className="text-gray-400">{item.member?.user?.phone || 'N/A'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-mono font-medium text-gray-800">CCCD: {item.ownerIdCard}</p>
                    <p className="text-gray-500">MST: {item.taxCode || 'Chưa cập nhật'}</p>
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate" title={item.address}>
                    {item.address}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        item.status === 'VERIFIED'
                          ? 'bg-green-100 text-green-800'
                          : item.status === 'PENDING_VERIFICATION'
                          ? 'bg-amber-100 text-amber-800'
                          : item.status === 'REJECTED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {item.status === 'PENDING_VERIFICATION' && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleVerify(item.id, item.businessName)}
                          className="rounded bg-green-600 px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-green-700"
                        >
                          Duyệt KYC
                        </button>
                        <button
                          onClick={() => handleReject(item.id, item.businessName)}
                          className="rounded bg-red-600 px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-red-700"
                        >
                          Từ chối
                        </button>
                      </div>
                    )}
                    {item.status === 'VERIFIED' && (
                      <span className="text-xs text-green-600">✓ Đã cấp quyền mở gian hàng</span>
                    )}
                    {item.status === 'REJECTED' && (
                      <span className="text-xs text-red-500">✕ Đã bị từ chối</span>
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
