import api from './axios';
import type { ApiResponse } from '@mpg/shared/types/api';
import type { IUserBase } from '@mpg/shared/types/user';
import type { MatchRecord } from '@mpg/shared/types/match';
import type { GameType } from '@mpg/shared/types/games';

/* ------------------------------------------------------------------ */
/*  Response shapes (match server controller output)                    */
/* ------------------------------------------------------------------ */

export interface DashboardStats {
  totalUsers: number;
  totalAdmins: number;
  totalMatches: number;
  matchesByGameType: Record<string, number>;
  activeRoomsCount: number;
  queueSize: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface AdminUsersResponse {
  users: IUserBase[];
  pagination: PaginationMeta;
}

export interface AdminMatchesResponse {
  matches: MatchRecord[];
  pagination: PaginationMeta;
}

export interface ActiveRoom {
  roomCode: string;
  gameType: string;
  status: string;
  playerCount: number;
  createdAt: string | null;
}

/* ------------------------------------------------------------------ */
/*  Dashboard                                                           */
/* ------------------------------------------------------------------ */

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const res = await api.get<ApiResponse<DashboardStats>>('/admin/stats');
  return res.data.data;
};

/* ------------------------------------------------------------------ */
/*  Users                                                               */
/* ------------------------------------------------------------------ */

export const getUsers = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}): Promise<AdminUsersResponse> => {
  const res = await api.get<ApiResponse<AdminUsersResponse>>('/admin/users', { params });
  return res.data.data;
};

export const updateUserRole = async (
  userId: string,
  role: 'player' | 'admin',
): Promise<IUserBase> => {
  const res = await api.patch<ApiResponse<{ user: IUserBase }>>(`/admin/users/${userId}/role`, { role });
  return res.data.data.user;
};

export const deleteUser = async (userId: string): Promise<void> => {
  await api.delete(`/admin/users/${userId}`);
};

/* ------------------------------------------------------------------ */
/*  Rooms                                                               */
/* ------------------------------------------------------------------ */

export const getActiveRooms = async (): Promise<ActiveRoom[]> => {
  const res = await api.get<ApiResponse<{ rooms: ActiveRoom[] }>>('/admin/rooms');
  return res.data.data.rooms;
};

export const forceCloseRoom = async (roomCode: string): Promise<void> => {
  await api.delete(`/admin/rooms/${roomCode}`);
};

/* ------------------------------------------------------------------ */
/*  Matches                                                             */
/* ------------------------------------------------------------------ */

export const getRecentMatches = async (params?: {
  page?: number;
  limit?: number;
  gameType?: GameType;
}): Promise<AdminMatchesResponse> => {
  const res = await api.get<ApiResponse<AdminMatchesResponse>>('/admin/matches', { params });
  return res.data.data;
};
