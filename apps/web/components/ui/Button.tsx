import { ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 disabled:bg-primary-300',
  secondary:
    'bg-secondary-50 text-secondary-700 border border-secondary-200 hover:bg-secondary-100 disabled:opacity-50',
  ghost: 'text-neutral-600 hover:bg-neutral-100 disabled:opacity-50',
  danger: 'bg-danger-600 text-white hover:bg-danger-700 disabled:bg-danger-100 disabled:text-danger-400',
};

const SIZE_CLASS: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

/**
 * Button dùng chung — thay cho các className rời rạc "rounded bg-red-600..."
 * lặp lại ở từng trang. Dùng: <Button variant="primary">Thêm vào giỏ</Button>
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', ...props }, ref) => (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:cursor-not-allowed ${VARIANT_CLASS[variant]} ${SIZE_CLASS[size]} ${className}`}
      {...props}
    />
  ),
);
Button.displayName = 'Button';

export default Button;
