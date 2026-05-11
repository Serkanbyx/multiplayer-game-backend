import { type TextareaHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '../../utils/cn';
import { CharacterCounter } from './CharacterCounter';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
  hint?: string;
  showCounter?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, showCounter, maxLength, value, className, id: externalId, ...rest }, ref) => {
    const autoId = useId();
    const id = externalId ?? autoId;
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;
    const currentLength = typeof value === 'string' ? value.length : 0;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-fg">
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          id={id}
          value={value}
          maxLength={maxLength}
          aria-invalid={!!error}
          aria-describedby={cn(error && errorId, hint && hintId) || undefined}
          className={cn(
            'w-full rounded-md border bg-bg px-3 py-2 text-fg placeholder:text-fg-muted',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-bg',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors resize-y min-h-[80px]',
            error ? 'border-danger' : 'border-border',
            className,
          )}
          {...rest}
        />

        <div className="flex items-center justify-between">
          <div>
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
          {showCounter && maxLength && (
            <CharacterCounter current={currentLength} max={maxLength} />
          )}
        </div>
      </div>
    );
  },
);
