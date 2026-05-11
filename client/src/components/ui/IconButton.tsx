import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  'aria-label': string;
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
};

const variantClasses: Record<Variant, string> = {
  primary:   'bg-primary text-white hover:bg-primary/90',
  secondary: 'bg-surface text-fg hover:bg-surface/80 border border-border',
  ghost:     'bg-transparent text-fg hover:bg-surface/50',
  danger:    'bg-danger text-white hover:bg-danger/90',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10',
  lg: 'h-12 w-12 text-lg',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ variant = 'ghost', size = 'md', isLoading, children, className, disabled, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center rounded-md transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
          'cursor-pointer',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...rest}
      >
        {isLoading ? <Spinner size="sm" /> : children}
      </button>
    );
  },
);
