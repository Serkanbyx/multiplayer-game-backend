import { type HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

type CardProps = HTMLAttributes<HTMLDivElement>;

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border border-border bg-surface p-5',
          className,
        )}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
