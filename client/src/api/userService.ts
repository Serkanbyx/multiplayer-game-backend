import api from './axios';
import type { ApiResponse, Paginated } from '@mpg/shared/types/api';
import type { PublicUser, OwnUser, UserPreferences } from '@mpg/shared/types/user';
import type { MatchRecord } from '@mpg/shared/types/match';

export const getPublicProfile = async (username: string): Promise<PublicUser> => {
  const res = await api.get<ApiResponse<PublicUser>>(`/users/${username}`);
  return res.data.data;
};

export const updatePreferences = async (
  prefs: Partial<UserPreferences>,
): Promise<OwnUser> => {
  const res = await api.patch<ApiResponse<OwnUser>>('/users/me/preferences', prefs);
  return res.data.data;
};

export const uploadAvatar = async (file: File): Promise<OwnUser> => {
  const formData = new FormData();
  formData.append('avatar', file);
  const res = await api.post<ApiResponse<OwnUser>>('/users/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
};

export const removeAvatar = async (): Promise<OwnUser> => {
  const res = await api.delete<ApiResponse<OwnUser>>('/users/me/avatar');
  return res.data.data;
};

export const getUserMatches = async (
  username: string,
  params?: { page?: number; limit?: number },
): Promise<Paginated<MatchRecord>> => {
  const res = await api.get<ApiResponse<Paginated<MatchRecord>>>(
    `/users/${username}/matches`,
    { params },
  );
  return res.data.data;
};
