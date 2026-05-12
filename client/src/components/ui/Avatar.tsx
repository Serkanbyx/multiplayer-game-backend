import { type ImgHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

type AvatarProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src?: string | null | undefined;
  name: string;
  size?: AvatarSize;
  lazy?: boolean;
};

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-24 w-24 text-2xl',
};

const getInitials = (name: string | undefined): string => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

export const Avatar = ({ src, name, size = 'md', lazy: lazyLoad, className, alt, ...rest }: AvatarProps) => {
  const safeName = name || 'User';
  const base = cn(
    'inline-flex items-center justify-center rounded-full bg-primary/20 text-primary font-semibold shrink-0 select-none',
    sizeClasses[size],
    className,
  );

  if (src) {
    return (
      <img
        src={src}
        alt={alt ?? safeName}
        loading={lazyLoad ? 'lazy' : undefined}
        className={cn(base, 'object-cover')}
        {...rest}
      />
    );
  }

  return (
    <span className={base} role="img" aria-label={safeName}>
      {getInitials(safeName)}
    </span>
  );
};
