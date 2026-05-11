import { type ButtonHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '../../utils/cn';

type ToggleSwitchProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> & {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
};

export const ToggleSwitch = forwardRef<HTMLButtonElement, ToggleSwitchProps>(
  ({ checked, onChange, label, className, id: externalId, disabled, ...rest }, ref) => {
    const autoId = useId();
    const id = externalId ?? autoId;

    return (
      <div className="flex items-center gap-3">
        <button
          ref={ref}
          id={id}
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={cn(
            'relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
            'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
            checked ? 'bg-primary' : 'bg-border',
            className,
          )}
          {...rest}
        >
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
              checked ? 'translate-x-5' : 'translate-x-0',
            )}
          />
        </button>
        {label && (
          <label htmlFor={id} className="text-sm text-fg cursor-pointer select-none">
            {label}
          </label>
        )}
      </div>
    );
  },
);
