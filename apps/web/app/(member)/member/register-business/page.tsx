'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../../../lib/api-client';
import { AuthUser, getCurrentUser } from '../../../../lib/auth-client';

export default function RegisterBusinessPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  const [form, setForm] = useState({
    businessName: '',
    taxCode: '',
    ownerIdCard: '',
    address: '',
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName.trim() || !form.ownerIdCard.trim() || !form.address.trim()) {
      setErrorMsg('Vui lòng điền đầy đủ các thông tin bắt buộc (*)');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await apiFetch('/businesses', {
        method: 'POST',
        body: JSON.stringify({
          businessName: form.businessName.trim(),
          taxCode: form.taxCode.trim() || undefined,
          ownerIdCard: form.ownerIdCard.trim(),
          address: form.address.trim(),
        }),
      });

      setSuccessMsg('🎉 Đăng ký thông tin Hộ Kinh Doanh thành công! Hồ sơ của bạn đã được gửi tới Ban Quản Trị để phê duyệt KYC.');
      setTimeout(() => {
        router.push('/seller/dashboard');
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Không thể gửi đăng ký Hộ kinh doanh. Vui lòng kiểm tra lại tài khoản Thành viên của bạn.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="rounded-2xl border bg-white p-8 shadow-sm">
        <div className="mb-8 border-b pb-6 text-center">
          <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 mb-2">
            Đăng ký Hộ Kinh Doanh (Business KYC)
          </span>
          <h1 className="text-2xl font-bold text-gray-900">Trở Thành Người Bán Trên Sàn ShopGo 369</h1>
          <p className="mt-2 text-xs text-gray-500 max-w-lg mx-auto leading-relaxed">
            Điền đầy đủ thông tin Hộ Kinh Doanh chính thức để được xác thực KYC và cấp quyền mở gian hàng bán sản phẩm trên sàn 369.
          </p>
        </div>

        {/* Thông tin Chủ gian hàng (User đang đăng nhập) */}
        {currentUser && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs">
            <div className="flex items-center gap-2 mb-2 font-bold text-emerald-900 text-sm">
              <span>👤</span> Thông Tin Chủ Gian Hàng / Chủ Hộ Kinh Doanh
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-neutral-800">
              <div>
                <span className="text-neutral-500">Họ và tên chủ sở hữu:</span>{' '}
                <strong className="text-neutral-900 font-semibold">{currentUser.fullName}</strong>
              </div>
              <div>
                <span className="text-neutral-500">Email liên hệ:</span>{' '}
                <strong className="text-neutral-900 font-mono">{currentUser.email}</strong>
              </div>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 rounded-xl bg-rose-50 p-4 text-xs font-medium text-rose-900 border border-rose-200">
            🚨 {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-6 rounded-xl bg-emerald-50 p-4 text-xs font-medium text-emerald-900 border border-emerald-200">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-xs">
          <div>
            <label className="block font-semibold text-gray-800 mb-1.5">
              Tên Hộ Kinh Doanh <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ví dụ: HKD Nông Sản Hợp Tác Xã 369"
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              className="w-full rounded-xl border border-gray-300 p-3 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none"
              required
            />
            <p className="mt-1 text-[11px] text-gray-400">Tên Hộ kinh doanh được ghi trên Giấy chứng nhận ĐKKD hoặc Đăng ký Thuế.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block font-semibold text-gray-800 mb-1.5">
                Số CCCD / CMND Chủ Hộ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="001099xxxxxx"
                value={form.ownerIdCard}
                onChange={(e) => setForm({ ...form, ownerIdCard: e.target.value })}
                className="w-full rounded-xl border border-gray-300 p-3 text-sm font-mono text-gray-900 focus:border-emerald-500 focus:outline-none"
                required
              />
              <p className="mt-1 text-[11px] text-gray-400">Số Căn cước công dân của người đại diện Hộ kinh doanh.</p>
            </div>

            <div>
              <label className="block font-semibold text-gray-800 mb-1.5">
                Mã Số Thuế (MST) <span className="text-gray-400 font-normal">(Nếu có)</span>
              </label>
              <input
                type="text"
                placeholder="800123456"
                value={form.taxCode}
                onChange={(e) => setForm({ ...form, taxCode: e.target.value })}
                className="w-full rounded-xl border border-gray-300 p-3 text-sm font-mono text-gray-900 focus:border-emerald-500 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-gray-400">Mã số thuế đăng ký với cơ quan thuế nhà nước.</p>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-800 mb-1.5">
              Địa Chỉ Đăng Ký Kinh Doanh <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="Số nhà, Tên đường, Xã/Phường, Quận/Huyện, Tỉnh/Thành phố..."
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full rounded-xl border border-gray-300 p-3 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div className="rounded-xl bg-blue-50 p-4 border border-blue-100 text-[11px] text-blue-900 leading-relaxed">
            ℹ️ <strong>Cam kết thông tin:</strong> Bằng việc nhấn "Gửi Đăng Ký KYC", bạn cam kết các thông tin cung cấp là hoàn toàn chính xác và chịu trách nhiệm trước pháp luật về hoạt động kinh doanh của mình trên nền tảng 369.
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-xl border border-gray-300 px-6 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Quay lại
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 transition active:scale-95"
            >
              {loading ? 'Đang nộp hồ sơ...' : 'Gửi Đăng Ký KYC'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

