import type { TypedServer, TypedSocket } from './index.js';
import type { ChatMessage } from '../../../shared/types/room.js';
import * as roomService from '../services/roomService.js';
import { validateChatPayload } from '../validators/socketValidators.js';

/* ─── Per-user throttle (500 ms) ──────────────────────────────── */

const THROTTLE_MS = 500;
const lastMessageAt = new Map<string, number>();

/* ─── Helpers ─────────────────────────────────────────────────── */

const socketRoomChannel = (roomCode: string) => `room:${roomCode}`;

/* ─── Handler Registration ────────────────────────────────────── */

export const registerChatHandlers = (io: TypedServer, socket: TypedSocket): void => {
  const userId = socket.data.user._id;

  socket.on('chat:message', async (data) => {
    try {
      /* ── Throttle kontrolü ────────────────────────────────────── */
      const now = Date.now();
      const lastAt = lastMessageAt.get(userId);
      if (lastAt && now - lastAt < THROTTLE_MS) {
        return socket.emit('error', { code: 'CHAT_THROTTLED', message: 'You are sending messages too fast' });
      }

      /* ── Mesaj validasyonu ────────────────────────────────────── */
      const v = validateChatPayload(data);
      if (!v.ok) {
        return socket.emit('error', { code: v.code, message: v.message });
      }

      /* ── Socket'in bir odada olduğunu doğrula ─────────────────── */
      const roomCode = await roomService.getUserRoom(userId);
      if (!roomCode) {
        return socket.emit('error', { code: 'CHAT_SEND_FAILED', message: 'You are not in a room' });
      }

      const room = await roomService.getRoom(roomCode);
      if (!room) {
        return socket.emit('error', { code: 'CHAT_SEND_FAILED', message: 'Room not found' });
      }

      const isInRoom =
        room.players.some((p) => p.userId === userId) ||
        room.spectators.some((s) => s.userId === userId);

      if (!isInRoom) {
        return socket.emit('error', { code: 'CHAT_SEND_FAILED', message: 'You are not in this room' });
      }

      /* ── Mesajı oluştur ve kaydet ─────────────────────────────── */
      const sanitized = v.value.message;
      const timestamp = new Date().toISOString();

      const chatMessage: ChatMessage = {
        userId,
        displayName: socket.data.user.displayName,
        text: sanitized,
        timestamp: Date.now(),
      };

      await roomService.appendChat(roomCode, chatMessage);
      lastMessageAt.set(userId, now);

      /* ── Odaya broadcast ──────────────────────────────────────── */
      io.in(socketRoomChannel(roomCode)).emit('chat:message', {
        senderId: userId,
        senderName: socket.data.user.displayName,
        message: sanitized,
        timestamp,
      });
    } catch {
      socket.emit('error', { code: 'CHAT_SEND_FAILED', message: 'Failed to send message' });
    }
  });
};
