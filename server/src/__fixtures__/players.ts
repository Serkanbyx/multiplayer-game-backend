import type { RoomPlayer } from '../../../shared/types/room.js';

export const twoPlayers: RoomPlayer[] = [
  {
    userId: 'user-1',
    displayName: 'Alice',
    isGuest: false,
    avatarUrl: null,
    position: 0,
    isConnected: true,
  },
  {
    userId: 'user-2',
    displayName: 'Bob',
    isGuest: false,
    avatarUrl: null,
    position: 1,
    isConnected: true,
  },
];

export const fourPlayers: RoomPlayer[] = [
  {
    userId: 'user-1',
    displayName: 'Alice',
    isGuest: false,
    avatarUrl: null,
    position: 0,
    isConnected: true,
  },
  {
    userId: 'user-2',
    displayName: 'Bob',
    isGuest: false,
    avatarUrl: null,
    position: 1,
    isConnected: true,
  },
  {
    userId: 'user-3',
    displayName: 'Charlie',
    isGuest: false,
    avatarUrl: null,
    position: 2,
    isConnected: true,
  },
  {
    userId: 'user-4',
    displayName: 'Diana',
    isGuest: true,
    avatarUrl: null,
    position: 3,
    isConnected: true,
  },
];
