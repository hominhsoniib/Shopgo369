type Size = 'sm' | 'md' | 'lg';

interface PriceTagProps {
  value: number | string;
  size?: Size;
  className?: string;
}

const SIZE_CLASS: Record<Size, string> = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-2xl',
};

/**
 * PriceTag — thay cho pattern lặp lại `Number(x).toLocaleString('vi-VN') + 'đ'`
 * với className rời rạc ở từng trang. Dùng font-display (Lora) để giá nổi bật,
 * tạo cảm giác đáng tin thay vì chữ số Tailwind mặc định.
 */
export default function PriceTag({ value, size = 'md', className = '' }: PriceTagProps) {
  const num = typeof value === 'string' ? Number(value) : value;
  return (
    <span className={`font-display font-semibold text-primary-700 ${SIZE_CLASS[size]} ${className}`}>
      {num.toLocaleString('vi-VN')}đ
    </span>
  );
}
