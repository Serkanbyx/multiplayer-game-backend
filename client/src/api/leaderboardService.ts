import api from './axios';
import type { ApiResponse } from '@mpg/shared/types/api';
import type { GameType } from '@mpg/shared/types/games';
import type { GameStats } from '@mpg/shared/types/user';

export interface LeaderboardEntry {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  stats: GameStats;
  gameStats?: GameStats;
}

export interface LeaderboardPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  pagination: LeaderboardPagination;
}

export const getLeaderboard = async (params?: {
  page?: number;
  limit?: number;
  gameType?: GameType;
}): Promise<LeaderboardResponse> => {
  const res = await api.get<ApiResponse<LeaderboardResponse>>('/leaderboard', { params });
  return res.data.data;
};
