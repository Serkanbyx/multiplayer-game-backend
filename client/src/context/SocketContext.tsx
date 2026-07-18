import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import type { ClientToServerEvents } from '@mpg/shared/types/events';
import { connectSocket, disconnectSocket, type AppSocket } from '../socket/socket';
import { useAuth } from './AuthContext';

export type ConnectionState =
  | 'idle'
  | 'connected'
  | 'disconnected_temporary'
  | 'disconnected_terminal'
  | 'connecting';

const TEMPORARY_REASONS = new Set([
  'transport close',
  'transport error',
  'ping timeout',
]);

interface SocketContextValue {
  socket: AppSocket | null;
  isConnected: boolean;
  connectionState: ConnectionState;
  reconnectAttempts: number;
  lastDisconnectReason: string | null;
  reconnect: () => void;
  emit: <K extends keyof ClientToServerEvents>(
    event: K,
    ...args: Parameters<ClientToServerEvents[K]>
  ) => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [socket, setSocket] = useState<AppSocket | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastDisconnectReason, setLastDisconnectReason] = useState<string | null>(null);

  const wasConnectedRef = useRef(false);
  const navigateRef = useRef(navigate);
  const logoutRef = useRef(logout);
  navigateRef.current = navigate;
  logoutRef.current = logout;

  const isConnected = connectionState === 'connected';

  useEffect(() => {
    if (!token) {
      disconnectSocket();
      setSocket(null);
      setConnectionState('idle');
      setReconnectAttempts(0);
      setLastDisconnectReason(null);
      wasConnectedRef.current = false;
      return;
    }

    const s = connectSocket(token);
    setSocket(s);
    setConnectionState('connecting');

    const onConnect = () => {
      if (wasConnectedRef.current) {
        toast.success('Reconnected. Catching up…');
      }
      wasConnectedRef.current = true;
      setConnectionState('connected');
      setReconnectAttempts(0);
      setLastDisconnectReason(null);
    };

    const onDisconnect = (reason: string) => {
      setLastDisconnectReason(reason);

      if (reason === 'io server disconnect') {
        setConnectionState('disconnected_terminal');
      } else if (TEMPORARY_REASONS.has(reason)) {
        setConnectionState('disconnected_temporary');
      } else {
        setConnectionState('disconnected_temporary');
      }
    };

    const onConnectError = (err: Error) => {
      const isUnauthorized =
        err.message?.includes('UNAUTHORIZED') ||
        err.message?.includes('jwt expired') ||
        err.message?.includes('invalid token');

      if (isUnauthorized) {
        setConnectionState('disconnected_terminal');
        setLastDisconnectReason('Session expired');
        localStorage.removeItem('token');
        logoutRef.current();
        navigateRef.current('/login', { replace: true });
        toast.error('Your session expired. Please log in again.');
        return;
      }

      setConnectionState('disconnected_temporary');
    };

    const onReconnectAttempt = (attempt: number) => {
      setReconnectAttempts(attempt);
      setConnectionState('disconnected_temporary');
    };

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('connect_error', onConnectError);
    s.io.on('reconnect_attempt', onReconnectAttempt);

    if (s.connected) {
      wasConnectedRef.current = true;
      setConnectionState('connected');
    }

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('connect_error', onConnectError);
      s.io.off('reconnect_attempt', onReconnectAttempt);
      disconnectSocket();
      setSocket(null);
      setConnectionState('idle');
      setReconnectAttempts(0);
      setLastDisconnectReason(null);
      wasConnectedRef.current = false;
    };
  }, [token]);

  const emit = useCallback(
    <K extends keyof ClientToServerEvents>(
      event: K,
      ...args: Parameters<ClientToServerEvents[K]>
    ) => {
      socket?.emit(event, ...args);
    },
    [socket],
  );

  const reconnect = useCallback(() => {
    if (!token) return;
    disconnectSocket();
    const s = connectSocket(token);
    setSocket(s);
    setConnectionState('connecting');
    setReconnectAttempts(0);
  }, [token]);

  const value = useMemo<SocketContextValue>(
    () => ({
      socket,
      isConnected,
      connectionState,
      reconnectAttempts,
      lastDisconnectReason,
      reconnect,
      emit,
    }),
    [socket, isConnected, connectionState, reconnectAttempts, lastDisconnectReason, reconnect, emit],
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextValue => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
};
