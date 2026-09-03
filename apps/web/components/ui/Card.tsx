import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

/** Card dùng chung — nền trắng ấm, viền neutral, bo góc xl theo token thương hiệu. */
export default function Card({ hoverable = false, className = '', ...props }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-neutral-200 bg-white p-4 ${
        hoverable ? 'transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary-900/5' : ''
      } ${className}`}
      {...props}
    />
  );
}
