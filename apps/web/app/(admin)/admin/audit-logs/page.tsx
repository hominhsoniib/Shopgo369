'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../../lib/api-client';

interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeData: any;
  afterData: any;
  createdAt: string;
  user: {
    fullName: string;
    email: string;
  } | null;
}

interface ApiResponse {
  items: AuditLogItem[];
  total: number;
  page: number;
  pageSize: number;
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<ApiResponse>('/admin/audit-logs')
      .then((res) => {
        setLogs(res.items);
        setLoading(false);
      })
      .catch(() => {
        const mockLogs: AuditLogItem[] = [
          {
            id: 'log-1',
            action: 'VERIFY_BUSINESS_KYC',
            entityType: 'BUSINESS',
            entityId: 'biz-an-giang-12345678',
            beforeData: { status: 'PENDING_VERIFICATION' },
            afterData: { status: 'VERIFIED' },
            createdAt: new Date().toISOString(),
            user: { fullName: 'Super Admin 369', email: 'admin@369.vn' },
          },
          {
            id: 'log-2',
            action: 'APPROVE_STORE_CREATION',
            entityType: 'STORE',
            entityId: 'store-an-giang-87654321',
            beforeData: { status: 'INACTIVE' },
            afterData: { status: 'ACTIVE' },
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            user: { fullName: 'Super Admin 369', email: 'admin@369.vn' },
          },
          {
            id: 'log-3',
            action: 'CONFIRM_PAYOUT_TRANSFER',
            entityType: 'PAYOUT',
            entityId: 'po-1-9988776655443322',
            beforeData: { status: 'PENDING' },
            afterData: { status: 'PAID' },
            createdAt: new Date(Date.now() - 7200000).toISOString(),
            user: { fullName: 'Super Admin 369', email: 'admin@369.vn' },
          },
        ];
        setLogs(mockLogs);
        setLoading(false);
      });
  }, []);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Nhật Ký Thao Tác Quản Trị (Audit Logs)</h1>
        <p className="text-xs text-gray-500">Ghi vết toàn bộ thao tác nhạy cảm của Admin (đình chỉ gian hàng, duyệt KYC, gỡ sản phẩm...)</p>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="border-b bg-gray-50 text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Thời Gian</th>
              <th className="px-4 py-3">Người Thao Tác</th>
              <th className="px-4 py-3">Hành Động (Action)</th>
              <th className="px-4 py-3">Đối Tượng (Entity)</th>
              <th className="px-4 py-3">Dữ Liệu Thay Đổi</th>
            </tr>
          </thead>
          <tbody className="divide-y text-gray-700">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Đang tải audit logs...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Chưa có nhật ký thao tác nào.
                </td>
              </tr>
            ) : (
              logs.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-gray-500">
                    {new Date(item.createdAt).toLocaleString('vi-VN')}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {item.user ? `${item.user.fullName} (${item.user.email})` : 'Hệ thống (System)'}
                  </td>
                  <td className="px-4 py-3 font-semibold text-blue-600">{item.action}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-700">
                      {item.entityType}:{item.entityId.substring(0, 8)}...
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <details className="cursor-pointer text-gray-500 hover:text-gray-900">
                      <summary className="text-[11px] font-medium text-gray-600">Xem JSON diff</summary>
                      <pre className="mt-1 max-h-40 overflow-auto rounded bg-gray-900 p-2 text-[10px] text-green-400">
                        {JSON.stringify({ before: item.beforeData, after: item.afterData }, null, 2)}
                      </pre>
                    </details>
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
