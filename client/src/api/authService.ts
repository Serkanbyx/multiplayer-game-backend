import api from './axios';
import type { ApiResponse } from '@mpg/shared/types/api';
import type { AuthUser } from '@mpg/shared/types/auth';
import type { OwnUser } from '@mpg/shared/types/user';

interface AuthResponse {
  token: string;
  user: AuthUser;
}

export const register = async (data: {
  username: string;
  email: string;
  password: string;
  displayName: string;
}): Promise<AuthResponse> => {
  const res = await api.post<ApiResponse<AuthResponse>>('/auth/register', data);
  return res.data.data;
};

export const login = async (data: {
  email: string;
  password: string;
}): Promise<AuthResponse> => {
  const res = await api.post<ApiResponse<AuthResponse>>('/auth/login', data);
  return res.data.data;
};

export const loginAsGuest = async (data: {
  displayName: string;
}): Promise<AuthResponse> => {
  const res = await api.post<ApiResponse<AuthResponse>>('/auth/guest', data);
  return res.data.data;
};

export const getMe = async (): Promise<OwnUser> => {
  const res = await api.get<ApiResponse<OwnUser>>('/auth/me');
  return res.data.data;
};

export const updateProfile = async (data: {
  displayName?: string;
  bio?: string;
}): Promise<OwnUser> => {
  const res = await api.put<ApiResponse<OwnUser>>('/auth/me', data);
  return res.data.data;
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
