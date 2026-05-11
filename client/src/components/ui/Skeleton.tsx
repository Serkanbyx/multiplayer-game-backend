import { type HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  variant?: 'rectangular' | 'circular';
  width?: string;
  height?: string;
};

export const Skeleton = ({
  variant = 'rectangular',
  width,
  height,
  className,
  style,
  ...rest
}: SkeletonProps) => {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse bg-surface/60',
        variant === 'circular' ? 'rounded-full' : 'rounded-md',
        className,
      )}
      style={{ width, height, ...style }}
      {...rest}
    />
  );
};
