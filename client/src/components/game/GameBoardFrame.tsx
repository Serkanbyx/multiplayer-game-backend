import { memo } from 'react';
import type { GameType, GameState, GameAction, Card } from '@mpg/shared/types/games';
import { TicTacToeBoard } from '../games/TicTacToeBoard';
import { CardGameTable } from '../games/CardGameTable';

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
      case 'cardgame': {
        const handlePlayCard = (card: Card) => {
          onAction({ type: 'cardgame:play_card', card });
        };

        return (
          <CardGameTable
            {...gameState}
            isMyTurn={isMyTurn}
            mySelfUserId={mySelfUserId}
            onPlayCard={handlePlayCard}
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

