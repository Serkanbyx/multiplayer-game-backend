import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, XCircle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { formatDateTime } from '../../utils/formatDate';
import { getActiveRooms, forceCloseRoom, type ActiveRoom } from '../../api/adminService';

const POLL_INTERVAL = 10_000;

const GAME_TYPE_LABELS: Record<string, string> = {
  tictactoe: 'Tic Tac Toe',
  cardgame: 'Card Game',
};

const statusVariant = (status: string): 'success' | 'warning' | 'default' => {
  if (status === 'playing') return 'success';
  if (status === 'waiting') return 'warning';
  return 'default';
};

const AdminRooms = () => {
  const [rooms, setRooms] = useState<ActiveRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState<string | null>(null);

  const [confirmRoom, setConfirmRoom] = useState<ActiveRoom | null>(null);
  const [closeLoading, setCloseLoading] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchRooms = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getActiveRooms();
      setRooms(data);
      setError(null);
    } catch {
      if (!silent) setError('Failed to load active rooms.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
    intervalRef.current = setInterval(() => fetchRooms(true), POLL_INTERVAL);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchRooms]);

  const handleForceClose = async () => {
    if (!confirmRoom) return;
    setCloseLoading(true);
    setClosing(confirmRoom.roomCode);
    try {
      await forceCloseRoom(confirmRoom.roomCode);
      setRooms((prev) => prev.filter((r) => r.roomCode !== confirmRoom.roomCode));
      setConfirmRoom(null);
    } catch {
      /* stay open */
    } finally {
      setCloseLoading(false);
      setClosing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fg">Active Rooms</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Live list — auto-refreshes every 10 seconds.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => fetchRooms()}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {loading ? (
        <Spinner center size="lg" />
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-danger">{error}</p>
        </div>
      ) : rooms.length === 0 ? (
        <EmptyState heading="No active rooms" description="There are currently no rooms in progress." />
      ) : (
        <Card className="overflow-hidden p-0!">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface/50">
                  <th className="px-4 py-3 font-medium text-fg-muted">Room Code</th>
                  <th className="px-4 py-3 font-medium text-fg-muted">Game Type</th>
                  <th className="px-4 py-3 font-medium text-fg-muted">Status</th>
                  <th className="px-4 py-3 font-medium text-fg-muted text-right">Players</th>
                  <th className="px-4 py-3 font-medium text-fg-muted">Created At</th>
                  <th className="px-4 py-3 font-medium text-fg-muted text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr
                    key={room.roomCode}
                    className="border-b border-border/50 last:border-0 hover:bg-surface/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <code className="rounded bg-surface px-2 py-0.5 text-xs font-mono text-fg">
                        {room.roomCode}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-fg">
                      {GAME_TYPE_LABELS[room.gameType] ?? room.gameType}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(room.status)}>
                        {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-fg text-right tabular-nums">
                      {room.playerCount}
                    </td>
                    <td className="px-4 py-3 text-fg-muted text-sm">
                      {room.createdAt ? formatDateTime(room.createdAt) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={closing === room.roomCode}
                        onClick={() => setConfirmRoom(room)}
                      >
                        <XCircle className="h-4 w-4" />
                        Force Close
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Confirm Force Close */}
      <ConfirmModal
        isOpen={!!confirmRoom}
        onClose={() => setConfirmRoom(null)}
        onConfirm={handleForceClose}
        title="Force Close Room"
        message={`Are you sure you want to force close room "${confirmRoom?.roomCode}"? All players will be disconnected.`}
        confirmLabel="Force Close"
        variant="danger"
        isLoading={closeLoading}
      />
    </div>
  );
};

export default AdminRooms;
