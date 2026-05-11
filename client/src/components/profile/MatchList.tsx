import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import type { MatchRecord } from '@mpg/shared/types/match';
import type { Paginated } from '@mpg/shared/types/api';
import { getUserMatches } from '../../api/userService';
import { formatDateTime, formatDuration } from '../../utils/formatDate';
import { getGameLabel } from './GameStatsCard';
import { Button, Spinner, EmptyState, Card, Badge, Avatar } from '../ui';

type MatchListProps = {
  username: string;
  /** Currently authenticated user's id — used to highlight "you" in match rows. */
  currentUserId?: string | undefined;
};

const ITEMS_PER_PAGE = 10;

const getOutcomeLabel = (match: MatchRecord, currentUserId?: string): { text: string; variant: 'success' | 'danger' | 'default' } => {
  const { result } = match;

  if (result.outcome === 'draw') {
    return { text: 'Draw', variant: 'default' };
  }

  if (result.outcome === 'forfeit') {
    if (currentUserId && result.forfeitedBy === currentUserId) {
      return { text: 'Forfeit', variant: 'danger' };
    }
    return { text: 'Win (Forfeit)', variant: 'success' };
  }

  if (currentUserId && result.winnerId === currentUserId) {
    return { text: 'Victory', variant: 'success' };
  }

  if (currentUserId && result.winnerId !== currentUserId) {
    return { text: 'Defeat', variant: 'danger' };
  }

  const winner = match.players.find((p) => p.userId === result.winnerId);
  return { text: winner ? `${winner.displayName} won` : 'Completed', variant: 'default' };
};

export const MatchList = ({ username, currentUserId }: MatchListProps) => {
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [pagination, setPagination] = useState<Paginated<MatchRecord> | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMatches = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getUserMatches(username, { page, limit: ITEMS_PER_PAGE });
      setMatches(data.items);
      setPagination(data);
    } catch {
      toast.error('Failed to load matches.');
    } finally {
      setIsLoading(false);
    }
  }, [username, page]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  if (isLoading) return <Spinner center />;

  if (matches.length === 0) {
    return (
      <EmptyState
        icon="🎮"
        heading="No matches yet"
        description="This player hasn't played any matches."
      />
    );
  }

  return (
    <div className="space-y-3">
      {matches.map((match) => {
        const outcome = getOutcomeLabel(match, currentUserId);

        return (
          <Card key={match.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="info">{getGameLabel(match.gameType)}</Badge>
              <Badge variant={outcome.variant}>{outcome.text}</Badge>
            </div>

            <div className="flex items-center gap-2">
              {match.players.map((player) => (
                <div key={player.userId ?? player.displayName} className="flex items-center gap-1.5">
                  <Avatar
                    src={player.avatar || null}
                    name={player.displayName}
                    size="xs"
                  />
                  <span className={`text-sm ${player.userId === currentUserId ? 'font-semibold text-fg' : 'text-fg-muted'}`}>
                    {player.displayName}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 text-xs text-fg-muted">
              <span>{formatDuration(match.duration)}</span>
              <span>{formatDateTime(match.endedAt)}</span>
            </div>
          </Card>
        );
      })}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
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
    </div>
  );
};
