import { memo } from 'react';
import type { GameType, GameState, GameAction } from '@mpg/shared/types/games';
import { TicTacToeBoard } from '../games/TicTacToeBoard';
import { BattleshipBoard } from '../games/BattleshipBoard';

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
      case 'battleship': {
        const canAct =
          gameState.phase === 'placement'
            ? !gameState.players.find((p) => p.userId === mySelfUserId)?.ready
            : isMyTurn;

        return (
          <BattleshipBoard
            {...gameState}
            isMyTurn={canAct}
            mySelfUserId={mySelfUserId}
            onAutoPlace={() => onAction({ type: 'battleship:auto_place' })}
            onClearShips={() => onAction({ type: 'battleship:clear_ships' })}
            onReady={() => onAction({ type: 'battleship:ready' })}
            onPlaceShip={(shipType, row, col, orientation) =>
              onAction({ type: 'battleship:place_ship', shipType, row, col, orientation })
            }
            onFire={(row, col) => onAction({ type: 'battleship:fire', row, col })}
          />
        );
      }
      default: {
        const _exhaustive: never = gameState;
        return <div>Unknown game type: {(gameType as string)}</div>;
      }
    }
  },
);
