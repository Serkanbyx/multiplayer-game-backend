import { cn } from '../../utils/cn';

type CharacterCounterProps = {
  current: number;
  max: number;
  className?: string;
};

export const CharacterCounter = ({ current, max, className }: CharacterCounterProps) => {
  const isOver = current > max;

  return (
    <span
      className={cn(
        'text-xs tabular-nums',
        isOver ? 'text-danger' : 'text-fg-muted',
        className,
      )}
      aria-live="polite"
    >
      {current}/{max}
    </span>
  );
};
