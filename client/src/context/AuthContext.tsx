import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type { AuthUser, JwtPayload } from '@mpg/shared/types/auth';
import * as authService from '../api/authService';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    username: string;
    email: string;
    password: string;
    displayName: string;
  }) => Promise<void>;
  loginAsGuest: (displayName: string) => Promise<void>;
  logout: () => void;
  updateUser: (patch: Partial<AuthUser>) => void;
  isAdmin: () => boolean;
  isGuest: () => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Decode JWT payload without verifying signature (info-only on client). */
const decodeJwtPayload = (token: string): JwtPayload | null => {
  try {
    const base64 = token.split('.')[1];
    const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
};

const buildAuthUserFromPayload = (payload: JwtPayload): AuthUser => ({
  _id: payload.id,
  displayName: payload.isGuest ? payload.displayName : '',
  role: payload.role,
  isGuest: payload.isGuest,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    loading: true,
  });

  /* Hydrate on mount — read stored token */
  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (!stored) {
      setState({ user: null, token: null, loading: false });
      return;
    }

    const payload = decodeJwtPayload(stored);
    if (!payload) {
      localStorage.removeItem('token');
      setState({ user: null, token: null, loading: false });
      return;
    }

    if (payload.isGuest) {
      setState({
        user: buildAuthUserFromPayload(payload),
        token: stored,
        loading: false,
      });
      return;
    }

    /* Registered user — validate token with server */
    authService
      .getMe()
      .then((me) => {
        setState({
          user: {
            _id: me.id,
            displayName: me.displayName,
            role: me.role,
            isGuest: me.isGuest,
            avatarUrl: me.avatarUrl,
          },
          token: stored,
          loading: false,
        });
      })
      .catch(() => {
        localStorage.removeItem('token');
        setState({ user: null, token: null, loading: false });
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user } = await authService.login({ email, password });
    localStorage.setItem('token', token);
    setState({ user, token, loading: false });
  }, []);

  const register = useCallback(
    async (data: {
      username: string;
      email: string;
      password: string;
      displayName: string;
    }) => {
      const { token, user } = await authService.register(data);
      localStorage.setItem('token', token);
      setState({ user, token, loading: false });
    },
    [],
  );

  const loginAsGuest = useCallback(async (displayName: string) => {
    const { token, user } = await authService.loginAsGuest({ displayName });
    localStorage.setItem('token', token);
    setState({ user, token, loading: false });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setState({ user: null, token: null, loading: false });
  }, []);

  const updateUser = useCallback((patch: Partial<AuthUser>) => {
    setState((prev) => ({
      ...prev,
      user: prev.user ? { ...prev.user, ...patch } : null,
    }));
  }, []);

  const isAdmin = useCallback(
    () => state.user?.role === 'admin' && !state.user.isGuest,
    [state.user],
  );

  const isGuest = useCallback(
    () => state.user?.isGuest === true,
    [state.user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      register,
      loginAsGuest,
      logout,
      updateUser,
      isAdmin,
      isGuest,
    }),
    [state, login, register, loginAsGuest, logout, updateUser, isAdmin, isGuest],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
