import { describe, it, expect } from 'vitest';
import { io as ioClient } from 'socket.io-client';
import { createTestClient, emitWithCb, waitForEvent } from './helpers/createTestClient.js';
import { getTestContext } from './helpers/testContext.js';

describe('Disconnect Integration', () => {
  it('disconnect mid-game → other player sees isConnected: false → reconnect within grace → state resumes', async () => {
    const playerA = await createTestClient();
    const playerB = await createTestClient();

    try {
      const createRes = await emitWithCb<{ success: boolean; room?: any }>(
        playerA.socket,
        'room:create',
        { gameType: 'tictactoe', isPrivate: false },
      );
      const roomCode = createRes.room.roomCode as string;

      const gameStartedA = waitForEvent<any>(playerA.socket, 'game:started');
      const gameStartedB = waitForEvent<any>(playerB.socket, 'game:started');
      await emitWithCb(playerB.socket, 'room:join', { roomCode });
      await Promise.all([gameStartedA, gameStartedB]);

      /* Player A disconnects */
      const roomUpdatePromise = waitForEvent<any>(playerB.socket, 'room:updated');
      playerA.socket.disconnect();

      const updatedRoom = await roomUpdatePromise;
      const disconnectedPlayer = updatedRoom.players.find(
        (p: any) => p.userId === playerA.userId,
      );
      expect(disconnectedPlayer.isConnected).toBe(false);

      /* Set up listener for reconnect room:updated BEFORE creating the new socket */
      const reconnectUpdatePromise = waitForEvent<any>(playerB.socket, 'room:updated', 10_000);

      /* Player A reconnects within grace period */
      const { baseUrl } = getTestContext();
      const reconnectedSocket = ioClient(baseUrl, {
        auth: { token: playerA.token },
        transports: ['websocket'],
        forceNew: true,
      });

      /*
       * Set up game:state-updated listener immediately on the new socket
       * (before handleReconnection finishes), using a manual promise.
       */
      const statePromise = new Promise<any>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout waiting for game:state-updated')), 10_000);
        reconnectedSocket.on('game:state-updated', (data: any) => {
          clearTimeout(timer);
          resolve(data);
        });
      });

      /* Wait for the connection + both events */
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Reconnect timeout')), 5000);
        reconnectedSocket.on('connect', () => {
          clearTimeout(timer);
          resolve();
        });
      });

      const [reconnectUpdate, stateEvent] = await Promise.all([
        reconnectUpdatePromise,
        statePromise,
      ]);

      const reconnectedPlayer = reconnectUpdate.players.find(
        (p: any) => p.userId === playerA.userId,
      );
      expect(reconnectedPlayer.isConnected).toBe(true);
      expect(stateEvent.roomCode).toBe(roomCode);
      expect(stateEvent.gameState).toBeDefined();

      reconnectedSocket.disconnect();
    } finally {
      playerA.cleanup();
      playerB.cleanup();
    }
  });

  it('player does not reconnect within grace → opponent gets game:ended with forfeit', async () => {
    const playerA = await createTestClient();
    const playerB = await createTestClient();

    try {
      const createRes = await emitWithCb<{ success: boolean; room?: any }>(
        playerA.socket,
        'room:create',
        { gameType: 'tictactoe', isPrivate: false },
      );
      const roomCode = createRes.room.roomCode as string;

      const gameStartedA = waitForEvent<any>(playerA.socket, 'game:started');
      const gameStartedB = waitForEvent<any>(playerB.socket, 'game:started');
      await emitWithCb(playerB.socket, 'room:join', { roomCode });
      await Promise.all([gameStartedA, gameStartedB]);

      const gameEndedPromise = waitForEvent<any>(playerB.socket, 'game:ended', 40_000);

      playerA.socket.disconnect();

      const endResult = await gameEndedPromise;
      expect(['forfeit', 'player_left']).toContain(endResult.reason);
      expect(endResult.winnerId).toBe(playerB.userId);
    } finally {
      playerA.cleanup();
      playerB.cleanup();
    }
  }, 45_000);
});
