import { memo } from 'react';
import type { RoomPlayer } from '@mpg/shared/types/room';
import { cn } from '../../utils/cn';

type TurnIndicatorProps = {
  currentPlayerId: string | null;
  mySelfUserId: string;
  players: RoomPlayer[];
  gameOver?: boolean;
};

export const TurnIndicator = memo(
  ({ currentPlayerId, mySelfUserId, players, gameOver }: TurnIndicatorProps) => {
    const isMyTurn = currentPlayerId === mySelfUserId;

    const statusText = (() => {
      if (gameOver) return 'Game Over';
      if (!currentPlayerId) return 'Waiting for game…';
      if (isMyTurn) return 'Your Turn';
      const turnPlayer = players.find((p) => p.userId === currentPlayerId);
      return turnPlayer ? `Waiting for ${turnPlayer.displayName}…` : 'Game in progress';
    })();

    return (
      <div
        role="status"
        className={cn(
          'rounded-lg px-4 py-3 text-center text-lg font-semibold transition-all',
          gameOver && 'bg-surface text-fg-muted',
          !gameOver && isMyTurn && 'bg-primary/15 text-primary animate-pulse',
          !gameOver && !isMyTurn && currentPlayerId && 'bg-surface text-fg-muted',
          !gameOver && !currentPlayerId && 'bg-surface text-fg-muted',
        )}
        aria-live="polite"
      >
        {statusText}
      </div>
    );
  },
);
