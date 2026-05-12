import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { GameType } from '@mpg/shared/types/games';
import type { GameStats } from '@mpg/shared/types/user';
import {
  getLeaderboard,
  type LeaderboardEntry,
  type LeaderboardPagination,
} from '../api/leaderboardService';
import { Avatar, Button, Select, Spinner, EmptyState, Card } from '../components/ui';

type GameFilter = 'all' | GameType;

const GAME_FILTER_OPTIONS: { value: GameFilter; label: string }[] = [
  { value: 'all', label: 'All Games' },
  { value: 'tictactoe', label: 'Tic Tac Toe' },
  { value: 'cardgame', label: 'Card Game' },
];

const ITEMS_PER_PAGE = 25;

const calculateWinRate = (stats: GameStats): string => {
  if (stats.gamesPlayed === 0) return '0%';
  return `${((stats.wins / stats.gamesPlayed) * 100).toFixed(1)}%`;
};

const getDisplayStats = (entry: LeaderboardEntry, filter: GameFilter): GameStats => {
  if (filter !== 'all' && entry.gameStats) return entry.gameStats;
  return entry.stats;
};

const LeaderboardPage = () => {
  const [gameFilter, setGameFilter] = useState<GameFilter>('all');
  const [page, setPage] = useState(1);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [pagination, setPagination] = useState<LeaderboardPagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: { page: number; limit: number; gameType?: GameType } = {
        page,
        limit: ITEMS_PER_PAGE,
      };
      if (gameFilter !== 'all') params.gameType = gameFilter;

      const data = await getLeaderboard(params);
      setEntries(data.leaderboard);
      setPagination(data.pagination);
    } catch {
      toast.error('Failed to load leaderboard.');
    } finally {
      setIsLoading(false);
    }
  }, [page, gameFilter]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleFilterChange = (value: GameFilter) => {
    setGameFilter(value);
    setPage(1);
  };

  const computedRows = useMemo(
    () =>
      entries.map((entry, index) => ({
        entry,
        rank: (page - 1) * ITEMS_PER_PAGE + index + 1,
        stats: getDisplayStats(entry, gameFilter),
        winRate: calculateWinRate(getDisplayStats(entry, gameFilter)),
      })),
    [entries, page, gameFilter],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 tabIndex={-1} className="text-3xl font-bold tracking-tight text-fg focus:outline-none">Leaderboard</h1>
          <p className="mt-1 text-fg-muted">
            Top players ranked by wins.
            {pagination && (
              <span className="ml-1 text-fg-muted/70">
                ({pagination.total} player{pagination.total !== 1 ? 's' : ''})
              </span>
            )}
          </p>
        </div>

        <div className="w-full sm:w-48">
          <Select
            label="Game Type"
            value={gameFilter}
            onChange={(e) => handleFilterChange(e.target.value as GameFilter)}
          >
            {GAME_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <Spinner center />
      ) : entries.length === 0 ? (
        <Card>
          <EmptyState
            icon="🏆"
            heading="No players yet"
            description="Be the first to win a game!"
          />
        </Card>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface/50">
                  <th className="whitespace-nowrap px-4 py-3 font-semibold text-fg-muted w-16">
                    Rank
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold text-fg-muted">
                    Player
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold text-fg-muted text-center">
                    Wins
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold text-fg-muted text-center">
                    Losses
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold text-fg-muted text-center">
                    Draws
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold text-fg-muted text-center">
                    Games
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold text-fg-muted text-center">
                    Win Rate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {computedRows.map(({ entry, rank, stats, winRate }) => (
                    <tr
                      key={entry.id}
                      className="bg-surface transition-colors hover:bg-surface/70"
                    >
                      {/* Rank */}
                      <td className="px-4 py-3">
                        <span
                          className={
                            rank <= 3
                              ? 'inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ' +
                                (rank === 1
                                  ? 'bg-yellow-400/20 text-yellow-500'
                                  : rank === 2
                                    ? 'bg-gray-300/20 text-gray-400'
                                    : 'bg-amber-600/20 text-amber-600')
                              : 'pl-1.5 text-fg-muted font-medium'
                          }
                        >
                          {rank}
                        </span>
                      </td>

                      {/* Player */}
                      <td className="px-4 py-3">
                        <Link
                          to={`/u/${entry.username}`}
                          className="inline-flex items-center gap-3 group"
                        >
                          <Avatar
                            src={entry.avatarUrl}
                            name={entry.displayName}
                            size="sm"
                            lazy
                          />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-fg group-hover:text-primary transition-colors">
                              {entry.displayName}
                            </p>
                            <p className="truncate text-xs text-fg-muted">
                              @{entry.username}
                            </p>
                          </div>
                        </Link>
                      </td>

                      {/* Stats */}
                      <td className="px-4 py-3 text-center font-medium text-success">
                        {stats.wins}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-danger">
                        {stats.losses}
                      </td>
                      <td className="px-4 py-3 text-center text-fg-muted">
                        {stats.draws}
                      </td>
                      <td className="px-4 py-3 text-center text-fg">
                        {stats.gamesPlayed}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-fg">
                        {winRate}
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-fg-muted">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={!pagination.hasPrev}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!pagination.hasNext}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LeaderboardPage;
