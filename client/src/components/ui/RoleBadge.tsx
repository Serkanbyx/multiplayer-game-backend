import { Badge } from './Badge';

type RoleBadgeProps = {
  role: 'admin' | 'player';
  className?: string;
};

export const RoleBadge = ({ role, className }: RoleBadgeProps) => {
  if (role === 'admin') {
    return (
      <Badge variant="danger" icon={<span>🛡️</span>} className={className}>
        Admin
      </Badge>
    );
  }

  return (
    <Badge variant="info" icon={<span>🎯</span>} className={className}>
      Player
    </Badge>
  );
};
