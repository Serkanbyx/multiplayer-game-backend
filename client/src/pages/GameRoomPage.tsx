import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { Room, ChatMessage } from '@mpg/shared/types/room';
import type { GameState, GameAction } from '@mpg/shared/types/games';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useSocketEvent } from '../hooks/useSocketEvent';
import { Badge, Button, Spinner, IconButton } from '../components/ui';
import {
  PlayerList,
  SpectatorList,
  TurnIndicator,
  ChatPanel,
  GameBoardFrame,
  RematchPrompt,
} from '../components/game';

/* ── Status pill variant map ── */
const STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'success' | 'warning' | 'info' | 'danger' }
> = {
  waiting: { label: 'Waiting', variant: 'warning' },
  playing: { label: 'In Progress', variant: 'success' },
  finished: { label: 'Ended', variant: 'danger' },
};

/* ── Game type labels ── */
const GAME_LABELS: Record<string, string> = {
  tictactoe: 'Tic Tac Toe',
  cardgame: 'Card Game',
};

/* ── Game end result state ── */
type GameEndResult = {
  result: 'win' | 'draw' | 'aborted';
  winnerId: string | null;
  winnerDisplayName: string | null;
};

const GameRoomPage = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { emit, isConnected } = useSocket();

  /* ── Core state ── */
  const [room, setRoom] = useState<Room | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [currentTurnUserId, setCurrentTurnUserId] = useState<string | null>(null);
  const [gameEndResult, setGameEndResult] = useState<GameEndResult | null>(null);
  const [rematchVotes, setRematchVotes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [throttledUntil, setThrottledUntil] = useState<number | null>(null);

  const hasJoinedRef = useRef(false);
  const mySelfUserId = user?._id ?? '';

  /* ── Derived values ── */
  const iAmPlayer = room?.players.some((p) => p.userId === mySelfUserId) ?? false;
  const isMyTurn = currentTurnUserId === mySelfUserId;
  const statusConfig = STATUS_CONFIG[room?.status ?? ''] ?? STATUS_CONFIG.waiting;

  /* ── Join room on mount ── */
  useEffect(() => {
    if (!roomCode || !isConnected || hasJoinedRef.current) return;

    hasJoinedRef.current = true;
    emit('room:join', { roomCode }, (res) => {
      setIsLoading(false);
      if (res.success && res.room) {
        setRoom(res.room);
        setChat(res.room.chat);
        setRematchVotes(res.room.rematchVotes);
        if (res.room.gameState) {
          setGameState(res.room.gameState);
          setCurrentTurnUserId(res.room.gameState.currentTurnUserId);
        }
      } else {
        toast.error(res.error ?? 'Failed to join room.');
        navigate('/', { replace: true });
      }
    });
  }, [roomCode, isConnected, emit, navigate]);

  /* ── Leave room on unmount ── */
  useEffect(() => {
    return () => {
      if (hasJoinedRef.current) {
        emit('room:leave');
      }
    };
  }, [emit]);

  /* ── Socket event handlers ── */
  const handleRoomUpdated = useCallback((updatedRoom: Room) => {
    setRoom(updatedRoom);
    setChat(updatedRoom.chat);
    setRematchVotes(updatedRoom.rematchVotes);
    if (updatedRoom.gameState) {
      setGameState(updatedRoom.gameState);
      setCurrentTurnUserId(updatedRoom.gameState.currentTurnUserId);
    }
  }, []);

  const handlePlayerJoined = useCallback(
    (player: { userId: string; displayName: string; isGuest: boolean; avatarUrl: string | null; position: number; isConnected: boolean }) => {
      setRoom((prev) => {
        if (!prev) return prev;
        const exists = prev.players.some((p) => p.userId === player.userId);
        if (exists) return prev;
        return { ...prev, players: [...prev.players, player] };
      });
      toast(`${player.displayName} joined the room`, { icon: '👋' });
    },
    [],
  );

  const handlePlayerLeft = useCallback(
    (data: { playerId: string; newHostId?: string }) => {
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          players: prev.players.filter((p) => p.userId !== data.playerId),
          hostId: data.newHostId ?? prev.hostId,
        };
      });
    },
    [],
  );

  const handleRoomClosed = useCallback(() => {
    toast('Room has been closed.', { icon: 'ℹ️' });
    navigate('/', { replace: true });
  }, [navigate]);

  const handleGameStarted = useCallback(
    (data: { roomCode: string; gameState: GameState }) => {
      setGameState(data.gameState);
      setCurrentTurnUserId(data.gameState.currentTurnUserId);
      setGameEndResult(null);
      setRematchVotes([]);
      setRoom((prev) => (prev ? { ...prev, status: 'playing' } : prev));
    },
    [],
  );

  const handleGameStateUpdated = useCallback(
    (data: { roomCode: string; gameState: GameState }) => {
      setGameState(data.gameState);
      setCurrentTurnUserId(data.gameState.currentTurnUserId);
    },
    [],
  );

  const handleGameTurn = useCallback(
    (data: { roomCode: string; currentPlayerId: string }) => {
      setCurrentTurnUserId(data.currentPlayerId);
    },
    [],
  );

  const handleGameEnded = useCallback(
    (data: {
      roomCode: string;
      result: 'win' | 'draw' | 'aborted';
      winnerId: string | null;
      winnerDisplayName: string | null;
      matchId: string | null;
      reason: string;
    }) => {
      setGameEndResult({
        result: data.result,
        winnerId: data.winnerId,
        winnerDisplayName: data.winnerDisplayName,
      });
      setCurrentTurnUserId(null);
      setRoom((prev) => (prev ? { ...prev, status: 'finished' } : prev));
    },
    [],
  );

  const handleChatMessage = useCallback(
    (data: { senderId: string; senderName: string; message: string; timestamp: string }) => {
      const newMsg: ChatMessage = {
        userId: data.senderId,
        displayName: data.senderName,
        text: data.message,
        timestamp: new Date(data.timestamp).getTime(),
      };
      setChat((prev) => [...prev, newMsg]);
    },
    [],
  );

  const handleRematchRequested = useCallback(
    (data: { userId: string; votes: string[] }) => {
      setRematchVotes(data.votes);
    },
    [],
  );

  const handleRematchAccepted = useCallback(
    (data: { userId: string; votes: string[] }) => {
      setRematchVotes(data.votes);
    },
    [],
  );

  const handleRematchDeclined = useCallback(
    (data: { userId: string }) => {
      toast(`A player declined the rematch.`, { icon: 'ℹ️' });
    },
    [],
  );

  const handleOnlineStatus = useCallback(
    (data: { userId: string; isOnline: boolean }) => {
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          players: prev.players.map((p) =>
            p.userId === data.userId ? { ...p, isConnected: data.isOnline } : p,
          ),
        };
      });
    },
    [],
  );

  const handleError = useCallback(
    (data: { message: string; code?: string }) => {
      if (data.code === 'CHAT_THROTTLED') {
        const cooldownMs = parseInt(data.message.match(/(\d+)/)?.[1] ?? '5', 10) * 1000;
        setThrottledUntil(Date.now() + cooldownMs);
        return;
      }
      toast.error(data.message);
    },
    [],
  );

  /* ── Subscribe to socket events ── */
  useSocketEvent('room:updated', handleRoomUpdated);
  useSocketEvent('room:player-joined', handlePlayerJoined);
  useSocketEvent('room:player-left', handlePlayerLeft);
  useSocketEvent('room:closed', handleRoomClosed);
  useSocketEvent('game:started', handleGameStarted);
  useSocketEvent('game:state-updated', handleGameStateUpdated);
  useSocketEvent('game:turn', handleGameTurn);
  useSocketEvent('game:ended', handleGameEnded);
  useSocketEvent('chat:message', handleChatMessage);
  useSocketEvent('game:rematch-requested', handleRematchRequested);
  useSocketEvent('game:rematch-accepted', handleRematchAccepted);
  useSocketEvent('game:rematch-declined', handleRematchDeclined);
  useSocketEvent('user:online-status', handleOnlineStatus);
  useSocketEvent('error', handleError);

  /* ── Action handlers ── */
  const handleGameAction = useCallback(
    (action: GameAction) => {
      if (!isMyTurn) return;
      emit('game:action', action);
    },
    [isMyTurn, emit],
  );

  const handleSendChat = useCallback(
    (text: string) => {
      emit('chat:message', { message: text });
    },
    [emit],
  );

  const handleLeaveRoom = useCallback(() => {
    emit('room:leave');
    navigate('/');
  }, [emit, navigate]);

  const handleRematchRequest = useCallback(() => {
    emit('game:rematch-request');
  }, [emit]);

  const handleRematchDecline = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const handleCopyRoomCode = useCallback(async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy room code.');
    }
  }, [roomCode]);

  /* ── Loading state ── */
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-3">
          <Spinner size="lg" center />
          <p className="text-fg-muted">Joining room…</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-lg font-semibold text-fg">Room not found</p>
          <Button variant="secondary" onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* ── Header ── */}
      <header className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xl font-bold text-fg tracking-wider">
            {room.roomCode}
          </span>
          <IconButton
            aria-label={copied ? 'Copied!' : 'Copy room code'}
            size="sm"
            variant="ghost"
            onClick={handleCopyRoomCode}
          >
            {copied ? (
              <svg className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </IconButton>
        </div>

        <Badge variant="info">{GAME_LABELS[room.gameType] ?? room.gameType}</Badge>
        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>

        {!isConnected && (
          <Badge variant="warning">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-warning" />
            </span>
            Reconnecting…
          </Badge>
        )}

        <div className="ml-auto">
          <Button variant="danger" size="sm" onClick={handleLeaveRoom}>
            Leave Room
          </Button>
        </div>
      </header>

      {/* ── 3-column layout ── */}
      <div className="grid gap-6 lg:grid-cols-[260px_1fr_300px]">
        {/* ── Left column: Players & Spectators ── */}
        <aside className="space-y-6">
          <PlayerList
            players={room.players}
            currentTurnUserId={currentTurnUserId}
            mySelfUserId={mySelfUserId}
          />
          <SpectatorList spectators={room.spectators} />
        </aside>

        {/* ── Center column: Game Board ── */}
        <main className="space-y-4">
          <TurnIndicator
            currentPlayerId={currentTurnUserId}
            mySelfUserId={mySelfUserId}
            players={room.players}
            gameOver={gameEndResult !== null}
          />

          {gameState ? (
            <div className="flex justify-center">
              <GameBoardFrame
                gameType={room.gameType}
                gameState={gameState}
                isMyTurn={isMyTurn}
                mySelfUserId={mySelfUserId}
                onAction={handleGameAction}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface/50 py-16 space-y-3">
              <p className="text-lg font-medium text-fg-muted">
                Waiting for players…
              </p>
              <p className="text-sm text-fg-muted">
                {room.players.length}/{room.maxPlayers} players joined
              </p>
            </div>
          )}
        </main>

        {/* ── Right column: Chat ── */}
        <aside>
          <ChatPanel
            messages={chat}
            onSend={handleSendChat}
            mySelfUserId={mySelfUserId}
            throttledUntil={throttledUntil}
          />
        </aside>
      </div>

      {/* ── Rematch overlay ── */}
      <RematchPrompt
        visible={gameEndResult !== null}
        iAmPlayer={iAmPlayer}
        rematchVotes={rematchVotes}
        players={room.players}
        result={gameEndResult?.result ?? null}
        winnerId={gameEndResult?.winnerId ?? null}
        winnerDisplayName={gameEndResult?.winnerDisplayName ?? null}
        mySelfUserId={mySelfUserId}
        onRequest={handleRematchRequest}
        onDecline={handleRematchDecline}
      />
    </div>
  );
};

export default GameRoomPage;
