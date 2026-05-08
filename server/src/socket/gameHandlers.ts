import type { TypedServer, TypedSocket } from './index.js';

export const registerGameHandlers = (io: TypedServer, socket: TypedSocket): void => {
  socket.on('game:action', (action) => {
    try {
      // TODO: Step 15 — game action processing logic
    } catch {
      socket.emit('error', { code: 'GAME_ACTION_FAILED', message: 'Failed to process game action' });
    }
  });

  socket.on('game:rematch-request', () => {
    try {
      // TODO: Step 15 — rematch request logic
    } catch {
      socket.emit('error', { code: 'REMATCH_REQUEST_FAILED', message: 'Failed to request rematch' });
    }
  });

  socket.on('game:rematch-accept', () => {
    try {
      // TODO: Step 15 — rematch accept logic
    } catch {
      socket.emit('error', { code: 'REMATCH_ACCEPT_FAILED', message: 'Failed to accept rematch' });
    }
  });

  socket.on('game:rematch-decline', () => {
    try {
      // TODO: Step 15 — rematch decline logic
    } catch {
      socket.emit('error', { code: 'REMATCH_DECLINE_FAILED', message: 'Failed to decline rematch' });
    }
  });
};
