import type { TypedServer, TypedSocket } from './index.js';
import type { RoomPlayer, RoomSpectator } from '../../../shared/types/room.js';
import { GameFactory } from '../games/GameFactory.js';
import * as roomService from '../services/roomService.js';
import { startGame, handleAbortOnLeave } from './gameHandlers.js';

/* ─── Helpers ─────────────────────────────────────────────────── */

const socketRoomChannel = (roomCode: string) => `room:${roomCode}`;

const buildPlayer = (socket: TypedSocket, position = 0): RoomPlayer => ({
  userId: socket.data.user._id,
  displayName: socket.data.user.displayName,
  isGuest: socket.data.user.isGuest,
  avatarUrl: socket.data.user.avatarUrl ?? null,
  position,
  isConnected: true,
});

const buildSpectator = (socket: TypedSocket): RoomSpectator => ({
  userId: socket.data.user._id,
  displayName: socket.data.user.displayName,
});

/* ─── Handler Registration ────────────────────────────────────── */

export const registerRoomHandlers = (io: TypedServer, socket: TypedSocket): void => {
  const userId = socket.data.user._id;

  /* ── room:create ────────────────────────────────────────────── */

  socket.on('room:create', async (data, callback) => {
    try {
      if (!GameFactory.isValidGameType(data.gameType)) {
        return callback({ success: false, error: 'Invalid game type' });
      }

      const existingRoom = await roomService.getUserRoom(userId);
      if (existingRoom) {
        return callback({ success: false, error: 'You are already in a room' });
      }

      const { maxPlayers } = GameFactory.getConfig(data.gameType);

      const room = await roomService.createRoom({
        host: buildPlayer(socket),
        gameType: data.gameType,
        isPrivate: Boolean(data.isPrivate),
        maxPlayers,
      });

      socket.join(socketRoomChannel(room.roomCode));
      socket.emit('room:updated', room);

      callback({ success: true, room });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create room';
      socket.emit('error', { code: 'ROOM_CREATE_FAILED', message });
      callback({ success: false, error: message });
    }
  });

  /* ── room:join ──────────────────────────────────────────────── */

  socket.on('room:join', async (data, callback) => {
    try {
      if (!data.roomCode || typeof data.roomCode !== 'string') {
        return callback({ success: false, error: 'Room code is required' });
      }

      const existingRoom = await roomService.getUserRoom(userId);
      if (existingRoom) {
        return callback({ success: false, error: 'You are already in a room' });
      }

      const room = await roomService.getRoom(data.roomCode);
      if (!room) {
        socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
        return callback({ success: false, error: 'Room not found' });
      }

      const player = buildPlayer(socket, room.players.length);
      const updatedRoom = await roomService.addPlayer(data.roomCode, player);

      socket.join(socketRoomChannel(data.roomCode));

      socket.to(socketRoomChannel(data.roomCode)).emit('room:player-joined', player);

      io.in(socketRoomChannel(data.roomCode)).emit('room:updated', updatedRoom);

      callback({ success: true, room: updatedRoom });

      if (
        updatedRoom.players.length >= updatedRoom.maxPlayers &&
        updatedRoom.status === 'waiting'
      ) {
        await startGame(io, data.roomCode);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to join room';
      socket.emit('error', { code: 'ROOM_JOIN_FAILED', message });
      callback({ success: false, error: message });
    }
  });

  /* ── room:leave ─────────────────────────────────────────────── */

  socket.on('room:leave', async () => {
    try {
      const roomCode = await roomService.getUserRoom(userId);
      if (!roomCode) return;

      const room = await roomService.getRoom(roomCode);
      if (!room) return;

      const isPlayer = room.players.some((p) => p.userId === userId);
      const isSpectator = room.spectators.some((s) => s.userId === userId);

      if (isPlayer) {
        if (room.status === 'playing') {
          await handleAbortOnLeave(io, roomCode, userId);
        }

        const updatedRoom = await roomService.removePlayer(roomCode, userId);

        socket.leave(socketRoomChannel(roomCode));

        if (updatedRoom) {
          io.in(socketRoomChannel(roomCode)).emit('room:player-left', {
            playerId: userId,
            newHostId: updatedRoom.hostId,
          });
          io.in(socketRoomChannel(roomCode)).emit('room:updated', updatedRoom);
        }
      } else if (isSpectator) {
        await roomService.removeSpectator(roomCode, userId);
        socket.leave(socketRoomChannel(roomCode));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to leave room';
      socket.emit('error', { code: 'ROOM_LEAVE_FAILED', message });
    }
  });

  /* ── room:spectate ──────────────────────────────────────────── */

  socket.on('room:spectate', async (data, callback) => {
    try {
      if (!data.roomCode || typeof data.roomCode !== 'string') {
        return callback({ success: false, error: 'Room code is required' });
      }

      const existingRoom = await roomService.getUserRoom(userId);
      if (existingRoom) {
        return callback({ success: false, error: 'You are already in a room' });
      }

      const room = await roomService.getRoom(data.roomCode);
      if (!room) {
        socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
        return callback({ success: false, error: 'Room not found' });
      }

      const spectator = buildSpectator(socket);
      const updatedRoom = await roomService.addSpectator(data.roomCode, spectator);

      socket.join(socketRoomChannel(data.roomCode));
      socket.emit('room:updated', updatedRoom);

      callback({ success: true, room: updatedRoom });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to spectate room';
      socket.emit('error', { code: 'ROOM_SPECTATE_FAILED', message });
      callback({ success: false, error: message });
    }
  });

  /* ── room:ready ─────────────────────────────────────────────── */

  socket.on('room:ready', () => {
    try {
      // TODO: Step 15 — toggle ready state
    } catch {
      socket.emit('error', { code: 'ROOM_READY_FAILED', message: 'Failed to toggle ready' });
    }
  });

  /* ── room:start ─────────────────────────────────────────────── */

  socket.on('room:start', () => {
    try {
      // TODO: Step 15 — host starts game
    } catch {
      socket.emit('error', { code: 'ROOM_START_FAILED', message: 'Failed to start game' });
    }
  });
};
