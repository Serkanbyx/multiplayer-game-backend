import type { MatchRecord } from '../../../shared/types/match.js';

export const sampleTicTacToeMatch: MatchRecord = {
  id: 'match-ttt-001',
  roomCode: 'ab12cd34',
  gameType: 'tictactoe',
  players: [
    { userId: 'user-1', displayName: 'Alice', isGuest: false, score: 1, position: 0 },
    { userId: 'user-2', displayName: 'Bob', isGuest: false, score: 0, position: 1 },
  ],
  result: { outcome: 'win', winnerId: 'user-1' },
  moves: [
    { by: 'user-1', type: 'play', payload: { index: 4 }, at: 1700000000000 },
    { by: 'user-2', type: 'play', payload: { index: 0 }, at: 1700000001000 },
  ],
  winnerUserId: 'user-1',
  duration: 45000,
  totalRounds: 1,
  startedAt: '2025-11-14T00:00:00.000Z',
  endedAt: '2025-11-14T00:00:45.000Z',
  createdAt: '2025-11-14T00:00:00.000Z',
};

export const sampleCardGameMatch: MatchRecord = {
  id: 'match-cg-001',
  roomCode: 'ef56gh78',
  gameType: 'cardgame',
  players: [
    { userId: 'user-1', displayName: 'Alice', isGuest: false, score: 5, position: 0 },
    { userId: 'user-2', displayName: 'Bob', isGuest: false, score: 3, position: 1 },
    { userId: 'user-3', displayName: 'Charlie', isGuest: false, score: 3, position: 2 },
    { userId: 'user-4', displayName: 'Diana', isGuest: true, score: 2, position: 3 },
  ],
  result: { outcome: 'win', winnerId: 'user-1' },
  moves: [],
  winnerUserId: 'user-1',
  duration: 180000,
  totalRounds: 13,
  startedAt: '2025-11-14T00:00:00.000Z',
  endedAt: '2025-11-14T00:03:00.000Z',
  createdAt: '2025-11-14T00:00:00.000Z',
};

export const sampleDrawMatch: MatchRecord = {
  id: 'match-draw-001',
  roomCode: 'ij90kl12',
  gameType: 'tictactoe',
  players: [
    { userId: 'user-1', displayName: 'Alice', isGuest: false, score: 0, position: 0 },
    { userId: 'user-2', displayName: 'Bob', isGuest: false, score: 0, position: 1 },
  ],
  result: { outcome: 'draw' },
  moves: [],
  winnerUserId: null,
  duration: 60000,
  totalRounds: 1,
  startedAt: '2025-11-14T00:00:00.000Z',
  endedAt: '2025-11-14T00:01:00.000Z',
  createdAt: '2025-11-14T00:00:00.000Z',
};
