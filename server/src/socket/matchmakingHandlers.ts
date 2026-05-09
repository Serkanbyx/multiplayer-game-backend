import type { TypedServer, TypedSocket } from './index.js';
import { GameFactory } from '../games/GameFactory.js';
import * as matchmakingService from '../services/matchmakingService.js';

export const registerMatchmakingHandlers = (io: TypedServer, socket: TypedSocket): void => {
  const user = socket.data.user;

  /* ── matchmaking:join ───────────────────────────────────────── */

  socket.on('matchmaking:join', async (data) => {
    try {
      if (!GameFactory.isValidGameType(data.gameType)) {
        return socket.emit('error', {
          code: 'INVALID_GAME_TYPE',
          message: 'Invalid game type',
        });
      }

      const { position } = await matchmakingService.joinQueue({
        user,
        gameType: data.gameType,
      });

      socket.emit('matchmaking:searching', {
        gameType: data.gameType,
        estimatedWait: position * 5,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to join matchmaking';
      socket.emit('error', { code: 'MATCHMAKING_JOIN_FAILED', message });
    }
  });

  /* ── matchmaking:leave ──────────────────────────────────────── */

  socket.on('matchmaking:leave', async () => {
    try {
      const validGameTypes = ['tic-tac-toe', 'card-game'] as const;

      for (const gameType of validGameTypes) {
        await matchmakingService.cancelQueue({ user, gameType });
      }

      socket.emit('matchmaking:cancelled');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to leave matchmaking';
      socket.emit('error', { code: 'MATCHMAKING_LEAVE_FAILED', message });
    }
  });
};
