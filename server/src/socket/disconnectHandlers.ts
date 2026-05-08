import type { TypedServer, TypedSocket } from './index.js';

export const registerDisconnectHandlers = (io: TypedServer, socket: TypedSocket): void => {
  socket.on('disconnect', (reason) => {
    try {
      const { user } = socket.data;
      console.log(`Socket disconnected: ${user.displayName} (${user._id}) — ${reason}`);
      // TODO: Step 12 — cleanup room state, notify other players
    } catch {
      console.error('Error during disconnect cleanup');
    }
  });
};
