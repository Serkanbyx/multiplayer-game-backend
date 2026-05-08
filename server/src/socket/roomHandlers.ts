import type { TypedServer, TypedSocket } from './index.js';

export const registerRoomHandlers = (io: TypedServer, socket: TypedSocket): void => {
  socket.on('room:create', async (data, callback) => {
    try {
      // TODO: Step 12 — room creation logic
      callback({ success: false, error: 'Not implemented yet' });
    } catch {
      socket.emit('error', { code: 'ROOM_CREATE_FAILED', message: 'Failed to create room' });
    }
  });

  socket.on('room:join', async (data, callback) => {
    try {
      // TODO: Step 12 — room join logic
      callback({ success: false, error: 'Not implemented yet' });
    } catch {
      socket.emit('error', { code: 'ROOM_JOIN_FAILED', message: 'Failed to join room' });
    }
  });

  socket.on('room:leave', () => {
    try {
      // TODO: Step 12 — room leave logic
    } catch {
      socket.emit('error', { code: 'ROOM_LEAVE_FAILED', message: 'Failed to leave room' });
    }
  });

  socket.on('room:ready', () => {
    try {
      // TODO: Step 12 — toggle ready state
    } catch {
      socket.emit('error', { code: 'ROOM_READY_FAILED', message: 'Failed to toggle ready' });
    }
  });

  socket.on('room:start', () => {
    try {
      // TODO: Step 12 — host starts game
    } catch {
      socket.emit('error', { code: 'ROOM_START_FAILED', message: 'Failed to start game' });
    }
  });

  socket.on('room:spectate', async (data, callback) => {
    try {
      // TODO: Step 12 — spectate logic
      callback({ success: false, error: 'Not implemented yet' });
    } catch {
      socket.emit('error', { code: 'ROOM_SPECTATE_FAILED', message: 'Failed to spectate room' });
    }
  });
};
