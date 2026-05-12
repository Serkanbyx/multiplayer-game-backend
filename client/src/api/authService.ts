import api from './axios';
import type { ApiResponse } from '@mpg/shared/types/api';
import type { AuthUser } from '@mpg/shared/types/auth';
import type { OwnUser } from '@mpg/shared/types/user';

interface AuthResponse {
  token: string;
  user: AuthUser;
}

interface RawServerUser {
  id?: string;
  _id?: string;
  displayName?: string;
  role?: 'player' | 'admin';
  isGuest?: boolean;
  avatarUrl?: string;
}

const normalizeAuthUser = (raw: RawServerUser): AuthUser => {
  const base: AuthUser = {
    _id: raw._id || raw.id || '',
    displayName: raw.displayName || '',
    role: raw.role || 'player',
    isGuest: raw.isGuest ?? false,
  };
  if (raw.avatarUrl) base.avatarUrl = raw.avatarUrl;
  return base;
};

export const register = async (data: {
  username: string;
  email: string;
  password: string;
  displayName: string;
}): Promise<AuthResponse> => {
  const res = await api.post<ApiResponse<{ user: RawServerUser; token: string }>>('/auth/register', data);
  const { user, token } = res.data.data;
  return { token, user: normalizeAuthUser(user) };
};

export const login = async (data: {
  email: string;
  password: string;
}): Promise<AuthResponse> => {
  const res = await api.post<ApiResponse<{ user: RawServerUser; token: string }>>('/auth/login', data);
  const { user, token } = res.data.data;
  return { token, user: normalizeAuthUser(user) };
};

export const loginAsGuest = async (data: {
  displayName: string;
}): Promise<AuthResponse> => {
  const res = await api.post<ApiResponse<{ user: RawServerUser; token: string }>>('/auth/guest', data);
  const { user, token } = res.data.data;
  return { token, user: normalizeAuthUser(user) };
};

export const getMe = async (): Promise<OwnUser> => {
  const res = await api.get<ApiResponse<{ user: OwnUser }>>('/auth/me');
  return res.data.data.user;
};

export const updateProfile = async (data: {
  displayName?: string;
  bio?: string;
}): Promise<OwnUser> => {
  const res = await api.put<ApiResponse<{ user: OwnUser }>>('/auth/me', data);
  return res.data.data.user;
};

export const changePassword = async (data: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> => {
  await api.put('/auth/me/password', data);
};

export const deleteAccount = async (data: {
  password: string;
}): Promise<void> => {
  await api.delete('/auth/me', { data });
};
