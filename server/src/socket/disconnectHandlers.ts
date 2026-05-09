import type { TypedServer, TypedSocket } from './index.js';
import * as roomService from '../services/roomService.js';
import * as matchmakingService from '../services/matchmakingService.js';
import { handleAbortOnLeave } from './gameHandlers.js';

const socketRoomChannel = (roomCode: string) => `room:${roomCode}`;

export const registerDisconnectHandlers = (io: TypedServer, socket: TypedSocket): void => {
  socket.on('disconnect', async (reason) => {
    const { user } = socket.data;
    console.log(`Socket disconnected: ${user.displayName} (${user._id}) — ${reason}`);

    try {
      await matchmakingService.cleanupOnDisconnect(user._id);

      const roomCode = await roomService.getUserRoom(user._id);
      if (!roomCode) return;

      const room = await roomService.getRoom(roomCode);
      if (!room) return;

      const isPlayer = room.players.some((p) => p.userId === user._id);
      const isSpectator = room.spectators.some((s) => s.userId === user._id);

      if (isPlayer) {
        if (room.status === 'playing') {
          await handleAbortOnLeave(io, roomCode, user._id);
        }

        const updatedRoom = await roomService.removePlayer(roomCode, user._id);

        if (updatedRoom) {
          io.in(socketRoomChannel(roomCode)).emit('room:player-left', {
            playerId: user._id,
            newHostId: updatedRoom.hostId,
          });
          io.in(socketRoomChannel(roomCode)).emit('room:updated', updatedRoom);
        }
      } else if (isSpectator) {
        await roomService.removeSpectator(roomCode, user._id);
      }
    } catch (err) {
      console.error('Error during disconnect cleanup:', err);
    }
  });
};
