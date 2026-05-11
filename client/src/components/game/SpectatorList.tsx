import { memo } from 'react';
import type { RoomSpectator } from '@mpg/shared/types/room';
import { Avatar } from '../ui/Avatar';
import { Tooltip } from '../ui/Tooltip';

type SpectatorListProps = {
  spectators: RoomSpectator[];
};

export const SpectatorList = memo(({ spectators }: SpectatorListProps) => {
  if (spectators.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-fg-muted uppercase tracking-wider">
        Spectators
        <span className="ml-1.5 text-xs font-normal">
          ({spectators.length} watching)
        </span>
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {spectators.map((spec) => (
          <Tooltip key={spec.userId} content={spec.displayName}>
            <Avatar name={spec.displayName} size="xs" />
          </Tooltip>
        ))}
      </div>
    </div>
  );
});
