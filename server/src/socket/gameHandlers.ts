import type { TypedServer, TypedSocket } from './index.js';

/**
 * Oda dolduğunda çağrılır — oyun başlatma mantığı Step 17'de implemente edilecek.
 * roomHandlers'dan referans alınabilmesi için export edilir.
 */
export const startGame = async (
  _io: TypedServer,
  _roomCode: string,
): Promise<void> => {
  // TODO: Step 17 — initialize game state via GameFactory.create(), persist, broadcast game:started
};

/**
 * Bir oyuncu oyun sırasında odadan ayrıldığında çağrılır (forfeit mantığı).
 * Step 17'de implemente edilecek.
 */
export const handleAbortOnLeave = async (
  _io: TypedServer,
  _roomCode: string,
  _userId: string,
): Promise<void> => {
  // TODO: Step 17 — forfeit logic, end game, broadcast game:ended
};

export const registerGameHandlers = (io: TypedServer, socket: TypedSocket): void => {
  socket.on('game:action', (action) => {
    try {
      // TODO: Step 17 — game action processing logic
    } catch {
      socket.emit('error', { code: 'GAME_ACTION_FAILED', message: 'Failed to process game action' });
    }
  });

  socket.on('game:rematch-request', () => {
    try {
      // TODO: Step 17 — rematch request logic
    } catch {
      socket.emit('error', { code: 'REMATCH_REQUEST_FAILED', message: 'Failed to request rematch' });
    }
  });

  socket.on('game:rematch-accept', () => {
    try {
      // TODO: Step 17 — rematch accept logic
    } catch {
      socket.emit('error', { code: 'REMATCH_ACCEPT_FAILED', message: 'Failed to accept rematch' });
    }
  });

  socket.on('game:rematch-decline', () => {
    try {
      // TODO: Step 17 — rematch decline logic
    } catch {
      socket.emit('error', { code: 'REMATCH_DECLINE_FAILED', message: 'Failed to decline rematch' });
    }
  });
};
