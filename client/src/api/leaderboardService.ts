import api from './axios';
import type { ApiResponse, Paginated } from '@mpg/shared/types/api';
import type { GameType } from '@mpg/shared/types/games';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
}

export const getLeaderboard = async (params?: {
  page?: number;
  limit?: number;
  gameType?: GameType;
  sortBy?: string;
}): Promise<Paginated<LeaderboardEntry>> => {
  const res = await api.get<ApiResponse<Paginated<LeaderboardEntry>>>('/leaderboard', { params });
  return res.data.data;
};
