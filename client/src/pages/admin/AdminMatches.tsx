import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { formatDateTime, formatDuration } from '../../utils/formatDate';
import { getRecentMatches, type AdminMatchesResponse, type PaginationMeta } from '../../api/adminService';
import type { MatchRecord } from '@mpg/shared/types/match';
import type { GameType } from '@mpg/shared/types/games';

const PAGE_SIZE = 20;

const GAME_TYPE_LABELS: Record<string, string> = {
  tictactoe: 'Tic Tac Toe',
  cardgame: 'Card Game',
};

const outcomeVariant = (outcome: string): 'success' | 'default' | 'danger' => {
  if (outcome === 'win') return 'success';
  if (outcome === 'forfeit') return 'danger';
  return 'default';
};

const AdminMatches = () => {
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [gameTypeFilter, setGameTypeFilter] = useState<GameType | ''>('');
  const [page, setPage] = useState(1);

  const [detailMatch, setDetailMatch] = useState<MatchRecord | null>(null);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: PAGE_SIZE };
      if (gameTypeFilter) params.gameType = gameTypeFilter;

      const data: AdminMatchesResponse = await getRecentMatches(params);
      setMatches(data.matches);
      setPagination(data.pagination);
      setError(null);
    } catch {
      setError('Failed to load matches.');
    } finally {
      setLoading(false);
    }
  }, [page, gameTypeFilter]);

  useEffect(() => { fetchMatches(); }, [fetchMatches]);

  const getWinnerName = (match: MatchRecord): string => {
    if (match.result.outcome === 'draw') return 'Draw';
    const winnerId = match.result.outcome === 'win' ? match.result.winnerId : null;
    const player = match.players.find((p) => p.userId === winnerId);
    return player?.displayName ?? '—';
  };

  const getPlayerNames = (match: MatchRecord): string =>
    match.players.map((p) => p.displayName).join(' vs ');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 tabIndex={-1} className="text-2xl font-bold text-fg focus:outline-none">Matches</h1>
          <p className="mt-1 text-sm text-fg-muted">Browse all match history.</p>
        </div>
        <div className="w-full sm:w-44">
          <Select
            value={gameTypeFilter}
            onChange={(e) => { setGameTypeFilter(e.target.value as GameType | ''); setPage(1); }}
          >
            <option value="">All Game Types</option>
            <option value="tictactoe">Tic Tac Toe</option>
            <option value="cardgame">Card Game</option>
          </Select>
        </div>
      </div>

      {loading ? (
        <Spinner center size="lg" />
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-danger">{error}</p>
        </div>
      ) : matches.length === 0 ? (
        <EmptyState heading="No matches found" description="Try a different game type filter." />
      ) : (
        <Card className="overflow-hidden p-0!">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface/50">
                  <th className="px-4 py-3 font-medium text-fg-muted">Game Type</th>
                  <th className="px-4 py-3 font-medium text-fg-muted">Players</th>
                  <th className="px-4 py-3 font-medium text-fg-muted">Result</th>
                  <th className="px-4 py-3 font-medium text-fg-muted">Winner</th>
                  <th className="px-4 py-3 font-medium text-fg-muted">Duration</th>
                  <th className="px-4 py-3 font-medium text-fg-muted">Played At</th>
                  <th className="px-4 py-3 font-medium text-fg-muted text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((match) => (
                  <tr
                    key={match.id}
                    className="border-b border-border/50 last:border-0 hover:bg-surface/30 transition-colors cursor-pointer"
                    onClick={() => setDetailMatch(match)}
                  >
                    <td className="px-4 py-3 text-fg">
                      {GAME_TYPE_LABELS[match.gameType] ?? match.gameType}
                    </td>
                    <td className="px-4 py-3 text-fg truncate max-w-[220px]">
                      {getPlayerNames(match)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={outcomeVariant(match.result.outcome)}>
                        {match.result.outcome.charAt(0).toUpperCase() + match.result.outcome.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-fg">{getWinnerName(match)}</td>
                    <td className="px-4 py-3 text-fg-muted tabular-nums">
                      {formatDuration(match.duration)}
                    </td>
                    <td className="px-4 py-3 text-fg-muted text-sm">
                      {formatDateTime(match.endedAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setDetailMatch(match); }}
                      >
                        <Eye className="h-4 w-4" />
                        Detail
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-sm text-fg-muted">
                Showing {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!pagination.hasPrev}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                <span className="text-sm text-fg-muted tabular-nums">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!pagination.hasNext}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Match Detail Modal */}
      <Modal
        isOpen={!!detailMatch}
        onClose={() => setDetailMatch(null)}
        title="Match Detail"
        className="max-w-2xl"
      >
        {detailMatch && <MatchDetail match={detailMatch} />}
      </Modal>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Match Detail (read-only)                                            */
/* ------------------------------------------------------------------ */

const MatchDetail = ({ match }: { match: MatchRecord }) => {
  const getWinnerName = (): string => {
    if (match.result.outcome === 'draw') return 'Draw';
    const winnerId = match.result.outcome === 'win' ? match.result.winnerId : null;
    const player = match.players.find((p) => p.userId === winnerId);
    return player?.displayName ?? '—';
  };

  return (
    <div className="space-y-5">
      {/* Overview */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <Detail label="Room Code" value={match.roomCode} />
        <Detail label="Game Type" value={GAME_TYPE_LABELS[match.gameType] ?? match.gameType} />
        <Detail label="Result">
          <Badge variant={outcomeVariant(match.result.outcome)}>
            {match.result.outcome.charAt(0).toUpperCase() + match.result.outcome.slice(1)}
          </Badge>
        </Detail>
        <Detail label="Winner" value={getWinnerName()} />
        <Detail label="Duration" value={formatDuration(match.duration)} />
        <Detail label="Rounds" value={String(match.totalRounds)} />
        <Detail label="Started At" value={formatDateTime(match.startedAt)} />
        <Detail label="Ended At" value={formatDateTime(match.endedAt)} />
      </div>

      {/* Players */}
      <div>
        <h3 className="text-sm font-medium text-fg mb-2">Players</h3>
        <div className="space-y-2">
          {match.players.map((p, i) => (
            <div
              key={`${p.userId}-${i}`}
              className="flex items-center justify-between rounded-md border border-border/50 bg-surface/30 px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-fg">{p.displayName}</span>
                {p.isGuest && (
                  <Badge variant="default">Guest</Badge>
                )}
              </div>
              <span className="text-fg-muted tabular-nums">Score: {p.score}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Moves summary */}
      <div>
        <h3 className="text-sm font-medium text-fg mb-1">Moves</h3>
        <p className="text-sm text-fg-muted">{match.moves.length} total move{match.moves.length !== 1 ? 's' : ''}</p>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Detail helper                                                       */
/* ------------------------------------------------------------------ */

const Detail = ({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) => (
  <div>
    <p className="text-fg-muted text-xs mb-0.5">{label}</p>
    {children ?? <p className="text-fg font-medium">{value}</p>}
  </div>
);

export default AdminMatches;
