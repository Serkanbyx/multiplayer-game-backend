import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { GameType } from '@mpg/shared/types/games';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useSocketEvent } from '../hooks/useSocketEvent';
import { useSounds } from '../hooks/useSounds';
import { getActiveRooms, type ActiveRoom } from '../api/adminService';
import {
  Button,
  Card,
  Input,
  SelectableCard,
  ToggleSwitch,
  Spinner,
  Badge,
} from '../components/ui';

/* ── Error code → user-friendly message map ── */
const ERROR_MESSAGES: Record<string, string> = {
  ROOM_NOT_FOUND: 'Room not found. Please check the code and try again.',
  ROOM_FULL: 'This room is already full.',
  ALREADY_IN_ROOM: 'You are already in a room. Leave it first.',
  GAME_IN_PROGRESS: 'A game is already in progress in this room.',
  MATCHMAKING_ALREADY_QUEUED: 'You are already in the matchmaking queue.',
};

const friendlyErrorMessage = (code?: string, fallback?: string): string =>
  (code && ERROR_MESSAGES[code]) || fallback || 'Something went wrong. Please try again.';

/* ── Game type metadata ── */
const GAME_OPTIONS: { type: GameType; label: string; players: string; icon: string }[] = [
  { type: 'tictactoe', label: 'Tic Tac Toe', players: '2 Players', icon: '⭕' },
  { type: 'cardgame', label: 'Card Game', players: '4 Players', icon: '🃏' },
];

const HomePage = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { emit, isConnected } = useSocket();
  const { play } = useSounds();

  /* ── Create Room state ── */
  const [createGameType, setCreateGameType] = useState<GameType>('tictactoe');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  /* ── Join Room state ── */
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  /* ── Matchmaking state ── */
  const [matchGameType, setMatchGameType] = useState<GameType>('tictactoe');
  const [isQueued, setIsQueued] = useState(false);
  const [estimatedWait, setEstimatedWait] = useState<number | null>(null);

  /* ── Public rooms (admin only) ── */
  const [publicRooms, setPublicRooms] = useState<ActiveRoom[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);

  /* ── Socket event listeners ── */
  const handleMatchSearching = useCallback(
    (data: { gameType: GameType; estimatedWait: number }) => {
      setIsQueued(true);
      setEstimatedWait(data.estimatedWait);
    },
    [],
  );

  const handleMatchFound = useCallback(
    (data: { roomCode: string }) => {
      setIsQueued(false);
      setEstimatedWait(null);
      play('match-found');
      toast.success('Match found! Joining room…');
      navigate(`/room/${data.roomCode}`);
    },
    [navigate, play],
  );

  const handleMatchCancelled = useCallback(() => {
    setIsQueued(false);
    setEstimatedWait(null);
    toast('Matchmaking cancelled.', { icon: 'ℹ️' });
  }, []);

  const handleError = useCallback(
    (data: { message: string; code?: string }) => {
      toast.error(friendlyErrorMessage(data.code, data.message));
      setIsCreating(false);
      setIsJoining(false);
      setIsQueued(false);
    },
    [],
  );

  useSocketEvent('matchmaking:searching', handleMatchSearching);
  useSocketEvent('matchmaking:found', handleMatchFound);
  useSocketEvent('matchmaking:cancelled', handleMatchCancelled);
  useSocketEvent('error', handleError);

  /* ── Fetch public rooms for admin ── */
  useEffect(() => {
    if (!isAdmin()) return;
    setIsLoadingRooms(true);
    getActiveRooms()
      .then((rooms) => {
        const openRooms = rooms.filter((r) => r.status === 'waiting');
        setPublicRooms(openRooms);
      })
      .catch(() => {
        /* silently fail — section simply won't show */
      })
      .finally(() => setIsLoadingRooms(false));
  }, [isAdmin]);

  /* ── Handlers ── */
  const handleCreateRoom = () => {
    if (!isConnected) return toast.error('Not connected to server.');
    setIsCreating(true);
    emit('room:create', { gameType: createGameType, isPrivate }, (res) => {
      setIsCreating(false);
      if (res.success && res.room) {
        toast.success('Room created!');
        navigate(`/room/${res.room.roomCode}`);
      } else {
        toast.error(friendlyErrorMessage(undefined, res.error));
      }
    });
  };

  const handleJoinRoom = () => {
    const code = joinRoomCode.trim().toUpperCase();
    if (!code) return toast.error('Please enter a room code.');
    if (!isConnected) return toast.error('Not connected to server.');
    setIsJoining(true);
    emit('room:join', { roomCode: code }, (res) => {
      setIsJoining(false);
      if (res.success && res.room) {
        navigate(`/room/${res.room.roomCode}`);
      } else {
        toast.error(friendlyErrorMessage(undefined, res.error));
      }
    });
  };

  const handleMatchmakingJoin = () => {
    if (!isConnected) return toast.error('Not connected to server.');
    emit('matchmaking:join', { gameType: matchGameType });
    setIsQueued(true);
  };

  const handleMatchmakingCancel = () => {
    emit('matchmaking:leave');
    setIsQueued(false);
    setEstimatedWait(null);
  };

  const handleSpectate = (roomCode: string) => {
    if (!isConnected) return toast.error('Not connected to server.');
    emit('room:join', { roomCode, asSpectator: true }, (res) => {
      if (res.success) {
        navigate(`/room/${roomCode}`);
      } else {
        toast.error(friendlyErrorMessage(undefined, res.error));
      }
    });
  };

  const displayName = user?.displayName || 'Player';

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* ── Hero ── */}
      <section className="text-center space-y-3">
        <h1 tabIndex={-1} className="text-4xl font-extrabold tracking-tight text-fg focus:outline-none">
          Welcome back, <span className="text-primary">{displayName}</span>
        </h1>
        <p className="text-fg-muted text-lg">
          Create a room, join a friend, or find an opponent instantly.
        </p>

        {!isConnected && (
          <div className="inline-flex items-center gap-2 rounded-full bg-warning/15 px-4 py-1.5 text-sm text-warning">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-warning" />
            </span>
            Connecting to server…
          </div>
        )}
      </section>

      {/* ── Action cards grid ── */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* ── Create Room ── */}
        <Card className="flex flex-col gap-5">
          <div>
            <h2 className="text-lg font-semibold text-fg">Create Room</h2>
            <p className="text-sm text-fg-muted">Start a new game and invite friends.</p>
          </div>

          <div className="space-y-1.5">
            <span className="text-sm font-medium text-fg">Game Type</span>
            <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Game type selection">
              {GAME_OPTIONS.map((opt) => (
                <SelectableCard
                  key={opt.type}
                  selected={createGameType === opt.type}
                  onSelect={() => setCreateGameType(opt.type)}
                  disabled={isCreating}
                >
                  <span className="text-2xl">{opt.icon}</span>
                  <span className="text-sm font-medium">{opt.label}</span>
                  <span className="text-xs text-fg-muted">{opt.players}</span>
                </SelectableCard>
              ))}
            </div>
          </div>

          <ToggleSwitch
            checked={isPrivate}
            onChange={setIsPrivate}
            label="Private Room"
            disabled={isCreating}
          />

          <Button
            onClick={handleCreateRoom}
            isLoading={isCreating}
            disabled={!isConnected}
            className="w-full"
          >
            Create Room
          </Button>
        </Card>

        {/* ── Join Room ── */}
        <Card className="flex flex-col gap-5">
          <div>
            <h2 className="text-lg font-semibold text-fg">Join Room</h2>
            <p className="text-sm text-fg-muted">Enter a room code to join a game.</p>
          </div>

          <Input
            label="Room Code"
            placeholder="e.g. ABC123"
            value={joinRoomCode}
            onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
            maxLength={10}
            disabled={isJoining}
          />

          <Button
            onClick={handleJoinRoom}
            isLoading={isJoining}
            disabled={!isConnected || !joinRoomCode.trim()}
            className="w-full mt-auto"
          >
            Join Room
          </Button>
        </Card>

        {/* ── Matchmaking ── */}
        <Card className="flex flex-col gap-5 md:col-span-2 lg:col-span-1">
          <div>
            <h2 className="text-lg font-semibold text-fg">Quick Match</h2>
            <p className="text-sm text-fg-muted">Find an opponent automatically.</p>
          </div>

          {!isQueued ? (
            <>
              <div className="space-y-1.5">
                <span className="text-sm font-medium text-fg">Game Type</span>
                <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Matchmaking game type">
                  {GAME_OPTIONS.map((opt) => (
                    <SelectableCard
                      key={opt.type}
                      selected={matchGameType === opt.type}
                      onSelect={() => setMatchGameType(opt.type)}
                    >
                      <span className="text-2xl">{opt.icon}</span>
                      <span className="text-sm font-medium">{opt.label}</span>
                      <span className="text-xs text-fg-muted">{opt.players}</span>
                    </SelectableCard>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleMatchmakingJoin}
                disabled={!isConnected}
                className="w-full mt-auto"
              >
                Find Match
              </Button>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-4">
              <Spinner size="lg" />
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-fg">Searching for opponents…</p>
                {estimatedWait !== null && (
                  <p className="text-xs text-fg-muted">
                    Estimated wait: ~{Math.ceil(estimatedWait / 1000)}s
                  </p>
                )}
              </div>
              <Button variant="secondary" onClick={handleMatchmakingCancel}>
                Cancel
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* ── Recent Public Rooms (admin only) ── */}
      {isAdmin() && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-fg">Recent Public Rooms</h2>

          {isLoadingRooms ? (
            <Spinner center />
          ) : publicRooms.length === 0 ? (
            <Card className="text-center py-8">
              <p className="text-fg-muted">No open public rooms at the moment.</p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {publicRooms.map((room) => (
                <Card
                  key={room.roomCode}
                  className="flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-fg">
                      {room.roomCode}
                    </span>
                    <Badge variant="info">
                      {room.gameType === 'tictactoe' ? 'Tic Tac Toe' : 'Card Game'}
                    </Badge>
                  </div>

                  <div className="text-sm text-fg-muted">
                    {room.playerCount} player{room.playerCount !== 1 ? 's' : ''}
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleSpectate(room.roomCode)}
                    disabled={!isConnected}
                    className="w-full"
                  >
                    Watch
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default HomePage;
