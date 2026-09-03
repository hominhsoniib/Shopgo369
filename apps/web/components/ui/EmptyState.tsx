interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/** EmptyState — thay cho <p className="text-gray-500">...</p> lặp lại ở nhiều trang. */
export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-12 text-center">
      <p className="font-medium text-neutral-700">{title}</p>
      {description && <p className="text-sm text-neutral-500">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
