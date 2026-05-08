import type { TypedServer, TypedSocket } from './index.js';

export const registerChatHandlers = (io: TypedServer, socket: TypedSocket): void => {
  socket.on('chat:message', (data) => {
    try {
      // TODO: Step 14 — chat message broadcast logic
    } catch {
      socket.emit('error', { code: 'CHAT_SEND_FAILED', message: 'Failed to send message' });
    }
  });
};
