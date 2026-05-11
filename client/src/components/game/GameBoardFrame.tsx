import { memo } from 'react';
import type { GameType, GameState, GameAction } from '@mpg/shared/types/games';

type GameBoardFrameProps = {
  gameType: GameType;
  gameState: GameState;
  isMyTurn: boolean;
  mySelfUserId: string;
  onAction: (action: GameAction) => void;
};

/** Placeholder board — TicTacToeBoard (Step 39) and CardGameTable (Step 40) plug in here. */
export const GameBoardFrame = memo(
  ({ gameType, gameState, isMyTurn, mySelfUserId, onAction }: GameBoardFrameProps) => {
    switch (gameState.gameType) {
      case 'tictactoe':
        return (
          <TicTacToePlaceholder
            gameState={gameState}
            isMyTurn={isMyTurn}
            mySelfUserId={mySelfUserId}
            onAction={onAction}
          />
        );
      case 'cardgame':
        return (
          <CardGamePlaceholder
            gameState={gameState}
            isMyTurn={isMyTurn}
            mySelfUserId={mySelfUserId}
            onAction={onAction}
          />
        );
      default: {
        const _exhaustive: never = gameState;
        return <div>Unknown game type: {(gameType as string)}</div>;
      }
    }
  },
);

/* ── Temporary placeholders until Step 39 / 40 ── */

import type { TicTacToeState, CardGameState } from '@mpg/shared/types/games';
import { cn } from '../../utils/cn';

const TicTacToePlaceholder = ({
  gameState,
  isMyTurn,
  mySelfUserId,
  onAction,
}: {
  gameState: TicTacToeState;
  isMyTurn: boolean;
  mySelfUserId: string;
  onAction: (action: GameAction) => void;
}) => {
  const mySymbol = gameState.players.find((p) => p.userId === mySelfUserId)?.symbol;

  return (
    <div className="flex flex-col items-center gap-4">
      {mySymbol && (
        <p className="text-sm text-fg-muted">
          You are <span className="font-bold text-fg">{mySymbol}</span>
        </p>
      )}
      <div className="grid grid-cols-3 gap-2">
        {gameState.board.map((cell, i) => {
          const isWinCell = gameState.winningLine?.includes(i) ?? false;
          return (
            <button
              key={i}
              onClick={() => onAction({ type: 'tictactoe:play', index: i })}
              disabled={!isMyTurn || cell !== null || gameState.result !== null}
              className={cn(
                'flex h-20 w-20 items-center justify-center rounded-lg border-2 text-3xl font-bold transition-all cursor-pointer',
                'disabled:cursor-not-allowed',
                isWinCell
                  ? 'border-primary bg-primary/20 text-primary'
                  : 'border-border bg-surface hover:bg-surface/80',
                cell === 'X' && !isWinCell && 'text-info',
                cell === 'O' && !isWinCell && 'text-danger',
              )}
              aria-label={`Cell ${i + 1}: ${cell ?? 'empty'}`}
            >
              {cell}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const CardGamePlaceholder = ({
  gameState,
  isMyTurn,
}: {
  gameState: CardGameState;
  isMyTurn: boolean;
  mySelfUserId: string;
  onAction: (action: GameAction) => void;
}) => (
  <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-surface p-8">
    <p className="text-lg font-semibold text-fg">Card Game</p>
    <p className="text-sm text-fg-muted">
      Trick #{gameState.trickNumber} — {isMyTurn ? 'Your turn' : 'Waiting…'}
    </p>
    <p className="text-xs text-fg-muted">
      Full card game UI will be implemented in Step 40.
    </p>
  </div>
);
