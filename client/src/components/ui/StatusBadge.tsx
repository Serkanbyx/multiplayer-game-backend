import type { RoomStatus } from '@mpg/shared/types/room';
import { Badge } from './Badge';

const statusConfig: Record<RoomStatus, { label: string; variant: 'success' | 'warning' | 'default'; icon: string }> = {
  waiting:  { label: 'Waiting',  variant: 'warning', icon: '⏳' },
  playing:  { label: 'Playing',  variant: 'success', icon: '🎮' },
  finished: { label: 'Finished', variant: 'default', icon: '🏁' },
};

type StatusBadgeProps = {
  status: RoomStatus;
  className?: string;
};

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} icon={<span>{config.icon}</span>} className={className}>
      {config.label}
    </Badge>
  );
};
