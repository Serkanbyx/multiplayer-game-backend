import { Link } from 'react-router-dom';
import { Avatar, RoleBadge, Button } from '../ui';
import { formatDate } from '../../utils/formatDate';

type ProfileHeaderProps = {
  displayName: string;
  username: string;
  avatarUrl?: string;
  role: 'player' | 'admin';
  bio?: string;
  createdAt: string;
  isOwnProfile?: boolean;
};

export const ProfileHeader = ({
  displayName,
  username,
  avatarUrl,
  role,
  bio,
  createdAt,
  isOwnProfile,
}: ProfileHeaderProps) => {
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
      <Avatar
        src={avatarUrl || null}
        name={displayName}
        size="xl"
      />

      <div className="flex-1 text-center sm:text-left">
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center">
          <h1 className="text-2xl font-bold text-fg">{displayName}</h1>
          <RoleBadge role={role} />
        </div>

        <p className="mt-0.5 text-sm text-fg-muted">@{username}</p>

        {bio && (
          <p className="mt-2 max-w-lg text-sm text-fg">{bio}</p>
        )}

        <p className="mt-2 text-xs text-fg-muted">
          Member since {formatDate(createdAt)}
        </p>

        {isOwnProfile && (
          <Link to="/settings/profile" className="mt-3 inline-block">
            <Button variant="secondary" size="sm">
              Edit Profile
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
};
