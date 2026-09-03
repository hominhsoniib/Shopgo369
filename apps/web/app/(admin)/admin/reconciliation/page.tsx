'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../../lib/api-client';

interface DailyLog {
  id?: string;
  reconciliationDate?: string;
  totalTransactions?: number;
  matchedCount?: number;
  mismatchedCount?: number;
  status?: string;
  details?: any;
}

export default function AdminReconciliationPage() {
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  });
  const [logData, setLogData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const fetchReconciliation = (runNow = false) => {
    setLoading(true);
    setMsg('');
    const url = `/admin/reconciliation/daily?date=${date}${runNow ? '&run=true' : ''}`;
    apiFetch<any>(url)
      .then((res) => {
        setLogData(res);
        setLoading(false);
        if (runNow) setMsg('✅ Đã chạy đối soát dữ liệu ngày ' + date);
      })
      .catch((err) => {
        setMsg(typeof err?.message === 'string' ? err.message : 'Không thể tải log đối soát');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchReconciliation();
  }, [date]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Đối Soát Thanh Toán Hàng Ngày (Reconciliation)</h1>
          <p className="text-xs text-gray-500">So khớp giao dịch tự động giữa Cổng thanh toán ↔ Hệ thống đơn hàng ↔ Bút toán kế toán</p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-gray-700">Chọn ngày:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border px-3 py-1.5 text-xs text-gray-800"
          />
          <button
            onClick={() => fetchReconciliation(true)}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
          >
            ⚡ Chạy đối soát ngay
          </button>
        </div>
      </div>

      {msg && <div className="mb-4 rounded-lg bg-blue-50 p-3 text-xs font-medium text-blue-900">{msg}</div>}

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        {loading ? (
          <p className="text-center text-xs text-gray-400">Đang kiểm tra đối soát...</p>
        ) : !logData ? (
          <p className="text-center text-xs text-gray-400">Chưa có kết quả đối soát cho ngày {date}.</p>
        ) : (
          <div className="space-y-6 text-xs">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-lg border p-4 bg-gray-50">
                <p className="text-gray-500">Ngày đối soát</p>
                <p className="mt-1 font-bold text-gray-900">{date}</p>
              </div>
              <div className="rounded-lg border p-4 bg-gray-50">
                <p className="text-gray-500">Tổng số giao dịch</p>
                <p className="mt-1 font-bold text-gray-900">{logData.totalTransactions ?? logData.count ?? 0}</p>
              </div>
              <div className="rounded-lg border p-4 bg-green-50">
                <p className="text-green-700">Khớp 100%</p>
                <p className="mt-1 font-bold text-green-900">{logData.matchedCount ?? logData.matched ?? 0}</p>
              </div>
              <div className="rounded-lg border p-4 bg-red-50">
                <p className="text-red-700">Sai lệch / Treo</p>
                <p className="mt-1 font-bold text-red-900">{logData.mismatchedCount ?? logData.mismatches ?? 0}</p>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="mb-2 font-bold text-gray-800">Chi tiết Báo cáo Đối soát:</h3>
              <pre className="max-h-96 overflow-auto rounded bg-gray-900 p-4 font-mono text-xs text-green-400">
                {JSON.stringify(logData, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
