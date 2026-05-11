import api from './axios';
import type { ApiResponse, Paginated } from '@mpg/shared/types/api';
import type { MatchRecord } from '@mpg/shared/types/match';
import type { GameType } from '@mpg/shared/types/games';

export const getRecentMatches = async (params?: {
  page?: number;
  limit?: number;
  gameType?: GameType;
}): Promise<Paginated<MatchRecord>> => {
  const res = await api.get<ApiResponse<Paginated<MatchRecord>>>('/matches', { params });
  return res.data.data;
};

export const getMatchById = async (id: string): Promise<MatchRecord> => {
  const res = await api.get<ApiResponse<MatchRecord>>(`/matches/${id}`);
  return res.data.data;
};
