import { memo } from 'react';
import type { GameType, GameState, GameAction, CardGameState } from '@mpg/shared/types/games';
import { TicTacToeBoard } from '../games/TicTacToeBoard';
import { cn } from '../../utils/cn';

type GameBoardFrameProps = {
  gameType: GameType;
  gameState: GameState;
  isMyTurn: boolean;
  mySelfUserId: string;
  onAction: (action: GameAction) => void;
};

export const GameBoardFrame = memo(
  ({ gameType, gameState, isMyTurn, mySelfUserId, onAction }: GameBoardFrameProps) => {
    switch (gameState.gameType) {
      case 'tictactoe': {
        const mySymbol =
          gameState.players.find((p) => p.userId === mySelfUserId)?.symbol ?? null;

        const handlePlay = (index: number) => {
          onAction({ type: 'tictactoe:play', index });
        };

        return (
          <TicTacToeBoard
            {...gameState}
            isMyTurn={isMyTurn}
            mySymbol={mySymbol}
            onPlay={handlePlay}
          />
        );
      }
      case 'cardgame':
        return (
          <CardGamePlaceholder
            gameState={gameState}
            isMyTurn={isMyTurn}
          />
        );
      default: {
        const _exhaustive: never = gameState;
        return <div>Unknown game type: {(gameType as string)}</div>;
      }
    }
  },
);

/* ── Temporary placeholder until Step 40 ── */

const CardGamePlaceholder = ({
  gameState,
  isMyTurn,
}: {
  gameState: CardGameState;
  isMyTurn: boolean;
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
