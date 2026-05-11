import { memo } from 'react';
import type { RoomPlayer } from '@mpg/shared/types/room';
import { Avatar } from '../ui/Avatar';
import { cn } from '../../utils/cn';

type PlayerListProps = {
  players: RoomPlayer[];
  currentTurnUserId: string | null;
  mySelfUserId: string;
};

const PlayerCard = memo(
  ({
    player,
    isCurrentTurn,
    isSelf,
  }: {
    player: RoomPlayer;
    isCurrentTurn: boolean;
    isSelf: boolean;
  }) => (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border p-3 transition-all',
        isCurrentTurn
          ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
          : 'border-border bg-surface',
        !player.isConnected && 'opacity-50',
      )}
    >
      <div className="relative">
        <Avatar
          src={player.avatarUrl}
          name={player.displayName}
          size="sm"
        />
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface',
            player.isConnected ? 'bg-success' : 'bg-fg-muted',
          )}
          aria-label={player.isConnected ? 'Online' : 'Offline'}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium text-fg">
            {player.displayName}
          </span>
          {isSelf && (
            <span className="text-xs text-fg-muted">(you)</span>
          )}
        </div>
        {!player.isConnected && (
          <span className="text-xs text-warning">Reconnecting…</span>
        )}
      </div>

      <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-fg-muted">
        P{player.position + 1}
      </span>
    </div>
  ),
);

const arePlayerListPropsEqual = (prev: PlayerListProps, next: PlayerListProps): boolean => {
  if (prev.currentTurnUserId !== next.currentTurnUserId) return false;
  if (prev.mySelfUserId !== next.mySelfUserId) return false;
  if (prev.players.length !== next.players.length) return false;

  const prevKey = prev.players.map((p) => p.userId + p.isConnected).join();
  const nextKey = next.players.map((p) => p.userId + p.isConnected).join();
  return prevKey === nextKey;
};

export const PlayerList = memo(
  ({ players, currentTurnUserId, mySelfUserId }: PlayerListProps) => (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-fg-muted uppercase tracking-wider">
        Players
      </h3>
      <div className="space-y-2">
        {players.map((player) => (
          <PlayerCard
            key={player.userId}
            player={player}
            isCurrentTurn={player.userId === currentTurnUserId}
            isSelf={player.userId === mySelfUserId}
          />
        ))}
      </div>
    </div>
  ),
  arePlayerListPropsEqual,
);
