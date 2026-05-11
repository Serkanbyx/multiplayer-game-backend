import { type ReactNode } from 'react';
import { cn } from '../../utils/cn';

type EmptyStateProps = {
  icon?: ReactNode;
  heading: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export const EmptyState = ({ icon, heading, description, action, className }: EmptyStateProps) => {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      {icon && <div className="mb-4 text-fg-muted text-4xl">{icon}</div>}
      <h3 className="text-lg font-semibold text-fg">{heading}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
