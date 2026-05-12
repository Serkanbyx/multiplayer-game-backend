import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from 'react';
import { cn } from '../../utils/cn';
import { Spinner } from './Spinner';
import { useSounds } from '../../hooks/useSounds';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  leftIcon?: ReactNode;
};

const buttonVariants = ({ variant, size }: { variant: Variant; size: Size }): string => {
  const variants: Record<Variant, string> = {
    primary:   'bg-primary text-white hover:bg-primary/90',
    secondary: 'bg-surface text-fg hover:bg-surface/80 border border-border',
    ghost:     'bg-transparent text-fg hover:bg-surface/50',
    danger:    'bg-danger text-white hover:bg-danger/90',
  };
  const sizes: Record<Size, string> = {
    sm: 'h-8 min-h-[44px] sm:min-h-0 px-3 text-sm',
    md: 'h-10 min-h-[44px] sm:min-h-0 px-4',
    lg: 'h-12 px-6 text-lg',
  };
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
    'cursor-pointer',
    variants[variant],
    sizes[size],
  );
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading, leftIcon, children, className, disabled, onClick, ...rest }, ref) => {
    const { play } = useSounds();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      play('click', 0.3);
      onClick?.(e);
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(buttonVariants({ variant, size }), className)}
        onClick={handleClick}
        {...rest}
      >
        {isLoading ? <Spinner size="sm" /> : leftIcon}
        {children}
      </button>
    );
  },
);
