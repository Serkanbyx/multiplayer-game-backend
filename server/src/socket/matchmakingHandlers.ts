import type { TypedServer, TypedSocket } from './index.js';

export const registerMatchmakingHandlers = (io: TypedServer, socket: TypedSocket): void => {
  socket.on('matchmaking:join', (data) => {
    try {
      // TODO: Step 13 — matchmaking queue logic
    } catch {
      socket.emit('error', { code: 'MATCHMAKING_JOIN_FAILED', message: 'Failed to join matchmaking' });
    }
  });

  socket.on('matchmaking:leave', () => {
    try {
      // TODO: Step 13 — leave matchmaking queue
    } catch {
      socket.emit('error', { code: 'MATCHMAKING_LEAVE_FAILED', message: 'Failed to leave matchmaking' });
    }
  });
};
