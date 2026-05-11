import { type HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

type SpinnerSize = 'sm' | 'md' | 'lg';

type SpinnerProps = HTMLAttributes<HTMLDivElement> & {
  size?: SpinnerSize;
  center?: boolean;
};

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-3',
};

export const Spinner = ({ size = 'md', center, className, ...rest }: SpinnerProps) => {
  const spinner = (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        'animate-spin rounded-full border-primary border-t-transparent',
        sizeClasses[size],
        className,
      )}
      {...rest}
    >
      <span className="sr-only">Loading…</span>
    </div>
  );

  if (center) {
    return <div className="flex items-center justify-center w-full py-8">{spinner}</div>;
  }

  return spinner;
};
