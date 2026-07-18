import type { GameState } from '@mpg/shared/types/games';
import type { RoomPlayer } from '@mpg/shared/types/room';

export type GameEndResult = {
  result: 'win' | 'draw' | 'aborted';
  winnerId: string | null;
  winnerDisplayName: string | null;
};

export const buildGameEndFromState = (
  gameState: GameState,
  players: RoomPlayer[],
): GameEndResult | null => {
  if (gameState.result === 'draw') {
    return { result: 'draw', winnerId: null, winnerDisplayName: null };
  }

  if (gameState.result === 'win' && gameState.winner) {
    const winner = players.find((p) => p.userId === gameState.winner);
    return {
      result: 'win',
      winnerId: gameState.winner,
      winnerDisplayName: winner?.displayName ?? null,
    };
  }

  return null;
};
