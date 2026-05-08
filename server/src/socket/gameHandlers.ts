import type { TypedServer, TypedSocket } from './index.js';
import * as roomService from '../services/roomService.js';

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

/**
 * Verilen kullanıcının odada oyuncu olup olmadığını kontrol eder.
 * Spectator'lar game action gönderemez.
 */
const isPlayerInRoom = async (userId: string): Promise<boolean> => {
  const roomCode = await roomService.getUserRoom(userId);
  if (!roomCode) return false;

  const room = await roomService.getRoom(roomCode);
  if (!room) return false;

  return room.players.some((p) => p.userId === userId);
};

export const registerGameHandlers = (io: TypedServer, socket: TypedSocket): void => {
  const userId = socket.data.user._id;

  socket.on('game:action', async (action) => {
    try {
      const isPlayer = await isPlayerInRoom(userId);
      if (!isPlayer) {
        socket.emit('error', { code: 'NOT_A_PLAYER', message: 'Spectators cannot perform game actions' });
        return;
      }

      // TODO: Step 17 — game action processing logic
    } catch {
      socket.emit('error', { code: 'GAME_ACTION_FAILED', message: 'Failed to process game action' });
    }
  });

  socket.on('game:rematch-request', async () => {
    try {
      const isPlayer = await isPlayerInRoom(userId);
      if (!isPlayer) return;

      // TODO: Step 17 — rematch request logic
    } catch {
      socket.emit('error', { code: 'REMATCH_REQUEST_FAILED', message: 'Failed to request rematch' });
    }
  });

  socket.on('game:rematch-accept', async () => {
    try {
      const isPlayer = await isPlayerInRoom(userId);
      if (!isPlayer) return;

      // TODO: Step 17 — rematch accept logic
    } catch {
      socket.emit('error', { code: 'REMATCH_ACCEPT_FAILED', message: 'Failed to accept rematch' });
    }
  });

  socket.on('game:rematch-decline', async () => {
    try {
      const isPlayer = await isPlayerInRoom(userId);
      if (!isPlayer) return;

      // TODO: Step 17 — rematch decline logic
    } catch {
      socket.emit('error', { code: 'REMATCH_DECLINE_FAILED', message: 'Failed to decline rematch' });
    }
  });
};
