export default function MemberProfilePage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-2xl font-semibold text-neutral-900">Hồ sơ thành viên 369</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Placeholder Phase 1 — gọi <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-700">GET /api/v1/members/me</code>
        {' '}để hiển thị mã thành viên, trạng thái duyệt, điểm tích lũy.
      </p>
    </main>
  );
}
