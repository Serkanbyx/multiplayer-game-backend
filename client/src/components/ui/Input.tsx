import { type InputHTMLAttributes, type ReactNode, forwardRef, useId } from 'react';
import { cn } from '../../utils/cn';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string | undefined;
  hint?: string;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftSlot, rightSlot, className, id: externalId, ...rest }, ref) => {
    const autoId = useId();
    const id = externalId ?? autoId;
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-fg">
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftSlot && (
            <span className="absolute left-3 text-fg-muted pointer-events-none">{leftSlot}</span>
          )}
          <input
            ref={ref}
            id={id}
            aria-invalid={!!error}
            aria-describedby={cn(error && errorId, hint && hintId) || undefined}
            className={cn(
              'w-full rounded-md border bg-bg px-3 py-2 text-fg placeholder:text-fg-muted',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-bg',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors',
              error ? 'border-danger' : 'border-border',
              leftSlot ? 'pl-10' : false,
              rightSlot ? 'pr-10' : false,
              className,
            )}
            {...rest}
          />
          {rightSlot && (
            <span className="absolute right-3 text-fg-muted">{rightSlot}</span>
          )}
        </div>

        {error && (
          <p id={errorId} role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="text-xs text-fg-muted">
            {hint}
          </p>
        )}
      </div>
    );
  },
);
