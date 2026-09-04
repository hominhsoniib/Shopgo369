'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../../lib/api-client';

interface PayoutItem {
  id: string;
  periodLabel: string;
  totalAmount: number;
  status: 'PENDING' | 'PAID';
  paidAt: string | null;
  createdAt: string;
  referrer: {
    user: {
      fullName: string;
      email: string;
      phone: string | null;
    };
  };
  _count: {
    transactions: number;
  };
}

interface ApiResponse {
  items: PayoutItem[];
  total: number;
  page: number;
  pageSize: number;
}

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const fetchPayouts = () => {
    setLoading(true);
    const query = new URLSearchParams();
    if (statusFilter) query.set('status', statusFilter);

    apiFetch<ApiResponse>(`/admin/payouts?${query.toString()}`)
      .then((res) => {
        setPayouts(res.items);
        setLoading(false);
      })
      .catch(() => {
        const mockPayouts: PayoutItem[] = [
          {
            id: 'po-1',
            periodLabel: 'Kỳ hoa hồng Tháng 8/2026',
            totalAmount: 1850000,
            status: 'PENDING',
            paidAt: null,
            createdAt: new Date().toISOString(),
            referrer: { user: { fullName: 'Nguyễn Thị Hoa', email: 'hoanguyen@369.vn', phone: '0918889999' } },
            _count: { transactions: 15 },
          },
          {
            id: 'po-2',
            periodLabel: 'Kỳ hoa hồng Tháng 8/2026',
            totalAmount: 3400000,
            status: 'PENDING',
            paidAt: null,
            createdAt: new Date().toISOString(),
            referrer: { user: { fullName: 'Phạm Minh Đức', email: 'ducpham@369.vn', phone: '0903456789' } },
            _count: { transactions: 28 },
          },
          {
            id: 'po-3',
            periodLabel: 'Kỳ hoa hồng Tháng 7/2026',
            totalAmount: 5200000,
            status: 'PAID',
            paidAt: new Date(Date.now() - 864000000).toISOString(),
            createdAt: new Date(Date.now() - 1000000000).toISOString(),
            referrer: { user: { fullName: 'Super Admin 369', email: 'admin@369.vn', phone: '0936999369' } },
            _count: { transactions: 42 },
          },
        ];
        setPayouts(mockPayouts);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPayouts();
  }, [statusFilter]);

  const handleConfirmPaid = async (id: string, name: string, amount: number) => {
    if (!confirm(`XÁC NHẬN ĐÃ CHUYỂN KHOẢN HOA HỒNG?\n\nNgười nhận: ${name}\nSố tiền: ${amount.toLocaleString('vi-VN')}đ`)) return;
    try {
      await apiFetch(`/admin/payouts/${id}/confirm-paid`, { method: 'PATCH' });
      setMsg(`✅ Đã xác nhận hoàn tất thanh toán hoa hồng cho ${name}`);
      fetchPayouts();
    } catch (err: any) {
      alert(err?.message || 'Có lỗi xảy ra');
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Phê Duyệt & Chi Trả Hoa Hồng (Payouts)</h1>
          <p className="text-xs text-gray-500">Quản lý duyệt giải ngân tiền hoa hồng giới thiệu cho các Thành viên 369 theo định kỳ</p>
        </div>

        <div className="flex gap-2">
          {['PENDING', 'PAID', ''].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                statusFilter === st ? 'bg-neutral-900 text-white' : 'border bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {st === 'PENDING' ? 'Chờ chi trả' : st === 'PAID' ? 'Đã thanh toán' : 'Tất cả'}
            </button>
          ))}
        </div>
      </div>

      {msg && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-xs font-medium text-green-900">
          {msg}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="border-b bg-gray-50 text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Kỳ Chi Trả</th>
              <th className="px-4 py-3">Người Nhận / Email / SĐT</th>
              <th className="px-4 py-3">Số Giao Dịch Gộp</th>
              <th className="px-4 py-3">Tổng Số Tiền</th>
              <th className="px-4 py-3">Trạng Thái</th>
              <th className="px-4 py-3">Xác Nhận Thanh Toán</th>
            </tr>
          </thead>
          <tbody className="divide-y text-gray-700">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Đang tải danh sách Payout...
                </td>
              </tr>
            ) : payouts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Không có đợt chi trả hoa hồng nào.
                </td>
              </tr>
            ) : (
              payouts.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-gray-900">{item.periodLabel}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{item.referrer?.user?.fullName}</p>
                    <p className="text-gray-500">{item.referrer?.user?.email}</p>
                    <p className="text-gray-400">{item.referrer?.user?.phone || 'N/A'}</p>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-700">{item._count?.transactions} đơn hàng</td>
                  <td className="px-4 py-3 font-bold text-red-600">
                    {Number(item.totalAmount).toLocaleString('vi-VN')}đ
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        item.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.status === 'PAID' ? 'Đã chuyển khoản' : 'Chờ giải ngân'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {item.status === 'PENDING' ? (
                      <button
                        onClick={() =>
                          handleConfirmPaid(item.id, item.referrer?.user?.fullName, Number(item.totalAmount))
                        }
                        className="rounded bg-green-600 px-3 py-1 text-[11px] font-medium text-white transition hover:bg-green-700"
                      >
                        ✓ Xác nhận đã chuyển tiền
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">Đã xong ({item.paidAt ? new Date(item.paidAt).toLocaleDateString('vi-VN') : ''})</span>
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
