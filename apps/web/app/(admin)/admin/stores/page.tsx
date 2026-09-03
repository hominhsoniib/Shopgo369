'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../../lib/api-client';

interface StoreItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
  business: {
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
  const [msg, setMsg] = useState('');

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
      .catch((err) => {
        setMsg(typeof err?.message === 'string' ? err.message : 'Không thể tải danh sách Gian hàng');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchStores();
  }, [statusFilter]);

  const handleSuspend = async (id: string, name: string) => {
    if (!confirm(`⚠️ BẠN CÓ CHẮC MUỐN ĐÌNH CHỈ / HẠ GIAN HÀNG "${name}"?\n\nToàn bộ sản phẩm của gian hàng sẽ bị ẩn khỏi trang chủ và không thể thêm giỏ hàng!`)) return;
    try {
      await apiFetch(`/admin/stores/${id}/suspend`, { method: 'PATCH' });
      setMsg(`🛑 Đã tạm đình chỉ gian hàng: ${name}`);
      fetchStores();
    } catch (err: any) {
      alert(err?.message || 'Có lỗi xảy ra');
    }
  };

  const handleReactivate = async (id: string, name: string) => {
    if (!confirm(`Bạn có muốn mở lại hoạt động cho gian hàng "${name}"?`)) return;
    try {
      await apiFetch(`/admin/stores/${id}/reactivate`, { method: 'PATCH' });
      setMsg(`✅ Đã mở lại hoạt động cho gian hàng: ${name}`);
      fetchStores();
    } catch (err: any) {
      alert(err?.message || 'Có lỗi xảy ra');
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Quản lý & Đình Chỉ Gian Hàng (Stores)</h1>
          <p className="text-xs text-gray-500">Giám sát hoạt động gian hàng, khóa/hạ gian hàng khi phát hiện vi phạm quy định sàn</p>
        </div>

        {/* Filter controls */}
        <div className="flex gap-2">
          {['', 'ACTIVE', 'SUSPENDED', 'INACTIVE'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                statusFilter === st ? 'bg-neutral-900 text-white' : 'border bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {st === 'ACTIVE'
                ? 'Đang hoạt động'
                : st === 'SUSPENDED'
                ? 'Đã bị đình chỉ'
                : st === 'INACTIVE'
                ? 'Đã đóng cửa'
                : 'Tất cả'}
            </button>
          ))}
        </div>
      </div>

      {msg && (
        <div className="mb-4 rounded-lg bg-amber-50 p-3 text-xs font-medium text-amber-900">
          {msg}
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
              <th className="px-4 py-3">Hành Động Quản Trị</th>
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
                  Không có gian hàng nào.
                </td>
              </tr>
            ) : (
              stores.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-bold text-gray-900">{item.name}</p>
                    <p className="font-mono text-gray-400">/s/{item.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{item.business?.businessName}</p>
                    <p className="text-gray-500">{item.business?.member?.user?.fullName} ({item.business?.member?.user?.email})</p>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-gray-900">{item._count.products}</td>
                  <td className="px-4 py-3 text-center font-semibold text-gray-900">{item._count.orders}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        item.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : item.status === 'SUSPENDED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {item.status === 'ACTIVE' ? 'Đang hoạt động' : item.status === 'SUSPENDED' ? 'Bị đình chỉ' : item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {item.status === 'ACTIVE' ? (
                      <button
                        onClick={() => handleSuspend(item.id, item.name)}
                        className="rounded bg-red-600 px-3 py-1 text-[11px] font-medium text-white transition hover:bg-red-700"
                      >
                        🛑 Hạ / Đình chỉ Gian hàng
                      </button>
                    ) : item.status === 'SUSPENDED' ? (
                      <button
                        onClick={() => handleReactivate(item.id, item.name)}
                        className="rounded bg-green-600 px-3 py-1 text-[11px] font-medium text-white transition hover:bg-green-700"
                      >
                        ✓ Khôi phục Hoạt động
                      </button>
                    ) : (
                      <span className="text-gray-400">—</span>
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
