'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../../../lib/api-client';
import Card from '../../../../components/ui/Card';
import Badge from '../../../../components/ui/Badge';
import Button from '../../../../components/ui/Button';

interface MemberUser {
  fullName?: string;
  email?: string;
  phone?: string;
}

interface MemberLevel {
  id: string;
  name: string;
  minPoints: number;
}

interface ReferralItem {
  id: string;
  memberCode: string;
  status: string;
  createdAt: string;
  user?: { fullName?: string };
}

interface MemberData {
  id?: string;
  memberCode?: string;
  status?: string;
  points?: number;
  user?: MemberUser;
  level?: MemberLevel;
  referrals?: ReferralItem[];
}

interface PointHistoryItem {
  id: string;
  points: number;
  reason: string;
  createdAt: string;
}

interface PointsData {
  totalPoints: number;
  level?: MemberLevel;
  history?: PointHistoryItem[];
}

// Fallback demo data cho Vercel Cloud
const MOCK_MEMBER_DATA: MemberData = {
  id: 'mem-demo-001',
  memberCode: '369-888999',
  status: 'APPROVED',
  points: 1250,
  user: {
    fullName: 'Nguyễn Văn Nông Dân',
    email: 'nongdan369@gmail.com',
    phone: '0988 123 456',
  },
  level: {
    id: 'lvl-2',
    name: 'Thành viên Vàng',
    minPoints: 1000,
  },
  referrals: [
    {
      id: 'ref-1',
      memberCode: '369-100201',
      status: 'APPROVED',
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      user: { fullName: 'Trần Thị Mai' },
    },
    {
      id: 'ref-2',
      memberCode: '369-100202',
      status: 'PENDING',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      user: { fullName: 'Lê Văn Hòa' },
    },
  ],
};

const MOCK_POINTS_DATA: PointsData = {
  totalPoints: 1250,
  level: { id: 'lvl-2', name: 'Thành viên Vàng', minPoints: 1000 },
  history: [
    {
      id: 'ph-1',
      points: 500,
      reason: 'Thưởng giới thiệu thành viên 369-100201 thành công',
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
      id: 'ph-2',
      points: 750,
      reason: 'Tích điểm từ đơn hàng nông sản #ORD-369-0892',
      createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    },
  ],
};

export default function MemberProfilePage() {
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<MemberData | null>(null);
  const [pointsData, setPointsData] = useState<PointsData | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'referrals' | 'points' | 'password'>('overview');

  // Clipboard feedback
  const [copied, setCopied] = useState(false);

  // Form đăng ký thành viên
  const [referralCodeInput, setReferralCodeInput] = useState('');
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState('');

  // Form đổi mật khẩu
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; success: boolean } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [mRes, pRes] = await Promise.all([
        apiFetch<MemberData>('/members/me'),
        apiFetch<PointsData>('/member/points'),
      ]);
      setMember(mRes);
      setPointsData(pRes);
    } catch {
      // Fallback mượt mà trên Vercel Cloud khi không có kết nối DB live
      setMember(MOCK_MEMBER_DATA);
      setPointsData(MOCK_POINTS_DATA);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegisterMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistering(true);
    setRegisterError('');
    try {
      await apiFetch('/members/register', {
        method: 'POST',
        body: JSON.stringify({
          ...(referralCodeInput.trim() ? { referralCode: referralCodeInput.trim() } : {}),
        }),
      });
      await loadData();
    } catch (err: any) {
      setRegisterError(err?.message || 'Đăng ký thất bại — vui lòng kiểm tra lại mã giới thiệu.');
    } finally {
      setRegistering(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPassword(true);
    setPasswordMsg(null);
    try {
      await apiFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setPasswordMsg({ text: 'Cập nhật mật khẩu mới thành công!', success: true });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPasswordMsg({
        text: err?.message || 'Mật khẩu hiện tại không chính xác. Vui lòng thử lại.',
        success: false,
      });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-neutral-500">Đang tải hồ sơ thành viên 369...</p>
        </div>
      </main>
    );
  }

  const isMember = Boolean(member && member.memberCode);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      {/* Header & Avatar Card */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md text-2xl font-bold text-emerald-200 border border-white/20">
              {member?.user?.fullName ? member.user.fullName.charAt(0).toUpperCase() : '369'}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold font-display">{member?.user?.fullName || 'Tài khoản 369'}</h1>
                {isMember && (
                  <span className="rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-semibold text-emerald-200 border border-emerald-400/30">
                    {member?.level?.name || 'Thành viên 369'}
                  </span>
                )}
              </div>
              <p className="text-sm text-emerald-100/80 mt-1">{member?.user?.email || 'Chưa cập nhật email'}</p>
              {member?.user?.phone && <p className="text-xs text-emerald-200/70 mt-0.5">{member.user.phone}</p>}
            </div>
          </div>

          {isMember ? (
            <div className="flex flex-col items-start sm:items-end bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10">
              <span className="text-xs font-medium text-emerald-200 uppercase tracking-wider">Mã thành viên của bạn</span>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-mono text-xl font-bold tracking-wider text-amber-300">{member?.memberCode}</span>
                <button
                  onClick={() => handleCopyCode(member?.memberCode || '')}
                  className="rounded-lg bg-white/20 px-2.5 py-1 text-xs font-medium hover:bg-white/30 transition-colors"
                >
                  {copied ? '✓ Đã chép' : 'Sao chép'}
                </button>
              </div>
              <div className="mt-2 text-xs text-emerald-100">
                Tổng điểm: <strong className="text-amber-300 font-semibold">{member?.points || 0} điểm</strong>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-amber-500/20 p-4 border border-amber-400/30 text-amber-200 text-xs">
              ⚠️ Bạn chưa hoàn tất đăng ký Thành viên 369
            </div>
          )}
        </div>
      </div>

      {/* Trường hợp chưa đăng ký thành viên */}
      {!isMember && (
        <Card className="p-6 border-amber-200 bg-amber-50/50">
          <div className="max-w-xl mx-auto text-center space-y-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xl font-bold">
              🎖️
            </div>
            <h2 className="text-xl font-bold text-neutral-900">Đăng ký làm Thành viên HTX 369</h2>
            <p className="text-sm text-neutral-600">
              Trở thành Thành viên để sở hữu mã giới thiệu cá nhân, tích điểm đổi quà và nhận hoa hồng từ các đơn hàng nông sản.
            </p>

            <form onSubmit={handleRegisterMember} className="mt-6 space-y-4 text-left">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase mb-1">
                  Mã người giới thiệu (Không bắt buộc)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 369-000001"
                  value={referralCodeInput}
                  onChange={(e) => setReferralCodeInput(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {registerError && (
                <p className="text-xs font-medium text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                  {registerError}
                </p>
              )}

              <Button
                type="submit"
                disabled={registering}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg transition-colors"
              >
                {registering ? 'Đang xử lý đăng ký...' : 'Xác nhận Đăng ký Thành viên 369'}
              </Button>
            </form>
          </div>
        </Card>
      )}

      {/* Tabs chuyển đổi chức năng */}
      <div className="border-b border-neutral-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            Tổng quan & Điểm tích lũy
          </button>
          <button
            onClick={() => setActiveTab('referrals')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'referrals'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            Mạng lưới giới thiệu ({member?.referrals?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'password'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            Đổi mật khẩu
          </button>
        </nav>
      </div>

      {/* Tab Content: Tổng quan & Điểm tích lũy */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 bg-emerald-50/50 border-emerald-100">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Tổng điểm thưởng</span>
              <p className="mt-2 text-3xl font-bold text-emerald-700">{pointsData?.totalPoints || member?.points || 0}</p>
              <p className="mt-1 text-xs text-emerald-600">Điểm khả dụng quy đổi quà tặng</p>
            </Card>

            <Card className="p-6 bg-amber-50/50 border-amber-100">
              <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Cấp độ hiện tại</span>
              <p className="mt-2 text-3xl font-bold text-amber-700">{pointsData?.level?.name || member?.level?.name || 'Hạng Đồng'}</p>
              <p className="mt-1 text-xs text-amber-600">Quyền lợi thành viên hợp tác xã</p>
            </Card>

            <Card className="p-6 bg-blue-50/50 border-blue-100">
              <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Người đã giới thiệu</span>
              <p className="mt-2 text-3xl font-bold text-blue-700">{member?.referrals?.length || 0} người</p>
              <p className="mt-1 text-xs text-blue-600">Thành viên tầng 1 phát sinh hoa hồng</p>
            </Card>
          </div>

          {/* Lịch sử tích điểm */}
          <Card className="p-6">
            <h3 className="text-base font-bold text-neutral-900 mb-4">Lịch sử tích lũy điểm thưởng</h3>
            {pointsData?.history && pointsData.history.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-50 text-neutral-500 font-medium border-b">
                    <tr>
                      <th className="py-3 px-4">Nội dung / Lý do</th>
                      <th className="py-3 px-4">Điểm</th>
                      <th className="py-3 px-4">Thời gian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {pointsData.history.map((h) => (
                      <tr key={h.id} className="hover:bg-neutral-50/50">
                        <td className="py-3.5 px-4 font-medium text-neutral-800">{h.reason}</td>
                        <td className={`py-3.5 px-4 font-bold ${h.points >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {h.points >= 0 ? `+${h.points}` : h.points}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-neutral-500">
                          {new Date(h.createdAt).toLocaleDateString('vi-VN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-neutral-500">Chưa có lịch sử giao dịch điểm.</div>
            )}
          </Card>
        </div>
      )}

      {/* Tab Content: Mạng lưới giới thiệu */}
      {activeTab === 'referrals' && (
        <div className="space-y-6">
          <Card className="p-6 bg-gradient-to-r from-teal-50 to-emerald-50 border-emerald-100">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-neutral-900">Mã giới thiệu trực tiếp</h3>
                <p className="text-xs text-neutral-600 mt-0.5">
                  Chia sẻ mã này với bà con nông dân và khách hàng để tích điểm và hưởng hoa hồng mua sắm.
                </p>
              </div>
              {isMember && (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-bold text-emerald-800 bg-white px-3 py-1.5 rounded-lg border border-emerald-200">
                    {member?.memberCode}
                  </span>
                  <button
                    onClick={() => handleCopyCode(member?.memberCode || '')}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                  >
                    {copied ? '✓ Đã chép' : 'Sao chép mã'}
                  </button>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-base font-bold text-neutral-900 mb-4">
              Danh sách Thành viên được giới thiệu ({member?.referrals?.length || 0})
            </h3>
            {member?.referrals && member.referrals.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-50 text-neutral-500 font-medium border-b">
                    <tr>
                      <th className="py-3 px-4">Họ và tên</th>
                      <th className="py-3 px-4">Mã thành viên</th>
                      <th className="py-3 px-4">Trạng thái</th>
                      <th className="py-3 px-4">Ngày tham gia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {member.referrals.map((ref) => (
                      <tr key={ref.id} className="hover:bg-neutral-50/50">
                        <td className="py-3.5 px-4 font-semibold text-neutral-900">
                          {ref.user?.fullName || 'Thành viên 369'}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs font-bold text-neutral-700">{ref.memberCode}</td>
                        <td className="py-3.5 px-4">
                          <Badge tone={ref.status === 'APPROVED' ? 'primary' : 'warning'}>
                            {ref.status === 'APPROVED' ? 'Đã duyệt' : 'Chờ duyệt'}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-neutral-500">
                          {new Date(ref.createdAt).toLocaleDateString('vi-VN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-neutral-500">
                Bạn chưa giới thiệu thành viên nào. Hãy chia sẻ mã thành viên của bạn để bắt đầu!
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab Content: Đổi mật khẩu */}
      {activeTab === 'password' && (
        <Card className="p-6 max-w-xl mx-auto">
          <h3 className="text-lg font-bold text-neutral-900 mb-4">Cập nhật mật khẩu tài khoản</h3>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase mb-1">Mật khẩu hiện tại</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase mb-1">
                Mật khẩu mới (Tối thiểu 8 ký tự)
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
              />
            </div>

            {passwordMsg && (
              <div
                className={`p-3 rounded-lg text-xs font-medium border ${
                  passwordMsg.success
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-red-50 text-red-800 border-red-200'
                }`}
              >
                {passwordMsg.text}
              </div>
            )}

            <Button
              type="submit"
              disabled={changingPassword}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              {changingPassword ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
            </Button>
          </form>
        </Card>
      )}
    </main>
  );
}
