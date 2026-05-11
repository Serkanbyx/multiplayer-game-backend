import { useSocket, type ConnectionState } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui';
import { cn } from '../../utils/cn';

const AnimatedDots = () => (
  <span className="inline-flex w-6">
    <span className="animate-pulse [animation-delay:0ms]">.</span>
    <span className="animate-pulse [animation-delay:200ms]">.</span>
    <span className="animate-pulse [animation-delay:400ms]">.</span>
  </span>
);

const BannerContent = ({
  connectionState,
  reconnectAttempts,
  lastDisconnectReason,
  onReconnect,
  onLogout,
}: {
  connectionState: ConnectionState;
  reconnectAttempts: number;
  lastDisconnectReason: string | null;
  onReconnect: () => void;
  onLogout: () => void;
}) => {
  if (connectionState === 'disconnected_temporary') {
    return (
      <div className="flex items-center justify-center gap-3 text-sm">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
        </span>
        <span>
          Reconnecting
          <AnimatedDots />
        </span>
        {reconnectAttempts > 0 && (
          <span className="text-white/80">
            attempt {reconnectAttempts} of &infin;
          </span>
        )}
      </div>
    );
  }

  if (connectionState === 'disconnected_terminal') {
    const reason = lastDisconnectReason ?? 'Connection lost';

    return (
      <div className="flex items-center justify-center gap-3 text-sm">
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <span>Disconnected: {reason}.</span>
        <Button
          variant="secondary"
          size="sm"
          className="h-7! bg-white/20! text-white! border-white/30! hover:bg-white/30!"
          onClick={onReconnect}
        >
          Reconnect
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7! text-white/80! hover:text-white! hover:bg-white/10!"
          onClick={onLogout}
        >
          Logout
        </Button>
      </div>
    );
  }

  return null;
};

export const ConnectionBanner = () => {
  const { connectionState, reconnectAttempts, lastDisconnectReason, reconnect } = useSocket();
  const { logout } = useAuth();

  const isVisible =
    connectionState === 'disconnected_temporary' ||
    connectionState === 'disconnected_terminal';

  if (!isVisible) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'sticky top-0 z-50 px-4 py-2 text-white transition-colors duration-300',
        connectionState === 'disconnected_temporary'
          ? 'bg-warning/90 backdrop-blur-sm'
          : 'bg-danger/90 backdrop-blur-sm',
      )}
    >
      <BannerContent
        connectionState={connectionState}
        reconnectAttempts={reconnectAttempts}
        lastDisconnectReason={lastDisconnectReason}
        onReconnect={reconnect}
        onLogout={logout}
      />
    </div>
  );
};
