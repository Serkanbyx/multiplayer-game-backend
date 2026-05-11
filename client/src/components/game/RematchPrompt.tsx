import { memo } from 'react';
import type { RoomPlayer } from '@mpg/shared/types/room';
import { Button } from '../ui/Button';

type RematchPromptProps = {
  visible: boolean;
  iAmPlayer: boolean;
  rematchVotes: string[];
  players: RoomPlayer[];
  result: 'win' | 'draw' | 'aborted' | null;
  winnerId: string | null;
  winnerDisplayName: string | null;
  mySelfUserId: string;
  onRequest: () => void;
  onDecline: () => void;
};

export const RematchPrompt = memo(
  ({
    visible,
    iAmPlayer,
    rematchVotes,
    players,
    result,
    winnerId,
    winnerDisplayName,
    mySelfUserId,
    onRequest,
    onDecline,
  }: RematchPromptProps) => {
    if (!visible) return null;

    const alreadyVoted = rematchVotes.includes(mySelfUserId);
    const iAmWinner = winnerId === mySelfUserId;

    const resultText = (() => {
      if (result === 'draw') return 'Draw!';
      if (result === 'aborted') return 'Game Aborted';
      if (result === 'win') {
        return iAmWinner ? 'You Won!' : `${winnerDisplayName ?? 'Opponent'} Wins!`;
      }
      return 'Game Over';
    })();

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />

        <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-surface p-6 text-center shadow-xl space-y-5">
          <h2 className="text-2xl font-bold text-fg">{resultText}</h2>

          {/* Vote status per player */}
          <div className="space-y-2">
            {players.map((p) => (
              <div
                key={p.userId}
                className="flex items-center justify-between rounded-md bg-bg px-3 py-2 text-sm"
              >
                <span className="text-fg">{p.displayName}</span>
                <span className="text-fg-muted">
                  {rematchVotes.includes(p.userId) ? '✓ Ready' : 'Pending'}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            {iAmPlayer && (
              <Button
                onClick={onRequest}
                disabled={alreadyVoted}
                className="w-full"
              >
                {alreadyVoted ? 'Waiting for others…' : 'Rematch'}
              </Button>
            )}
            <Button variant="secondary" onClick={onDecline} className="w-full">
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  },
);
