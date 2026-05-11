import { type ReactNode } from 'react';
import { cn } from '../../utils/cn';

type SelectableCardProps = {
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
};

export const SelectableCard = ({
  selected,
  onSelect,
  children,
  disabled,
  className,
}: SelectableCardProps) => {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-left transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
        selected
          ? 'border-primary bg-primary/10 text-fg'
          : 'border-border bg-surface text-fg-muted hover:border-primary/50',
        className,
      )}
    >
      {children}
    </button>
  );
};
