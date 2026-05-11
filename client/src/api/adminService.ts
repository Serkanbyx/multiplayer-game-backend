import api from './axios';
import type { ApiResponse, Paginated } from '@mpg/shared/types/api';
import type { IUserBase } from '@mpg/shared/types/user';
import type { MatchRecord } from '@mpg/shared/types/match';
import type { Room } from '@mpg/shared/types/room';

export interface DashboardStats {
  totalUsers: number;
  onlineUsers: number;
  activeRooms: number;
  totalMatches: number;
  guestUsers: number;
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const res = await api.get<ApiResponse<DashboardStats>>('/admin/stats');
  return res.data.data;
};

export const getUsers = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}): Promise<Paginated<IUserBase>> => {
  const res = await api.get<ApiResponse<Paginated<IUserBase>>>('/admin/users', { params });
  return res.data.data;
};

export const updateUserRole = async (
  userId: string,
  role: 'player' | 'admin',
): Promise<IUserBase> => {
  const res = await api.patch<ApiResponse<IUserBase>>(`/admin/users/${userId}/role`, { role });
  return res.data.data;
};

export const deleteUser = async (userId: string): Promise<void> => {
  await api.delete(`/admin/users/${userId}`);
};

export const getActiveRooms = async (): Promise<Room[]> => {
  const res = await api.get<ApiResponse<Room[]>>('/admin/rooms');
  return res.data.data;
};

export const forceCloseRoom = async (roomCode: string): Promise<void> => {
  await api.delete(`/admin/rooms/${roomCode}`);
};

export const getRecentMatches = async (params?: {
  page?: number;
  limit?: number;
}): Promise<Paginated<MatchRecord>> => {
  const res = await api.get<ApiResponse<Paginated<MatchRecord>>>('/admin/matches', { params });
  return res.data.data;
};
