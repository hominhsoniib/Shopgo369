import { HTMLAttributes } from 'react';

type Tone = 'primary' | 'secondary' | 'neutral' | 'danger' | 'warning';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const TONE_CLASS: Record<Tone, string> = {
  primary: 'bg-primary-50 text-primary-700',
  secondary: 'bg-secondary-50 text-secondary-700',
  neutral: 'bg-neutral-100 text-neutral-600',
  danger: 'bg-danger-50 text-danger-700',
  warning: 'bg-warning-50 text-warning-700',
};

/** Badge — nhãn trạng thái nhỏ (đơn hàng, tồn kho...). Dùng: <Badge tone="warning">Chờ xử lý</Badge> */
export default function Badge({ tone = 'neutral', className = '', ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${TONE_CLASS[tone]} ${className}`}
      {...props}
    />
  );
}
