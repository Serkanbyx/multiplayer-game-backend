import { memo, useState, useCallback, useEffect, useRef, useId } from 'react';
import { Link } from 'react-router-dom';
import type { RoomPlayer } from '@mpg/shared/types/room';
import type { GuestSessionStats } from '../../utils/guestSessionStats';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

type RematchPromptProps = {
  visible: boolean;
  iAmPlayer: boolean;
  rematchVotes: string[];
  players: RoomPlayer[];
  result: 'win' | 'draw' | 'aborted' | null;
  winnerId: string | null;
  winnerDisplayName: string | null;
  mySelfUserId: string;
  isGuest: boolean;
  matchRecorded: boolean;
  guestSessionStats: GuestSessionStats | null;
  onRequest: () => void;
  onDecline: () => void;
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const RematchPrompt = memo(
  ({
    visible,
    iAmPlayer,
    rematchVotes,
    players,
    result,
    winnerId,
    winnerDisplayName,
    mySelfUserId,
    isGuest,
    matchRecorded,
    guestSessionStats,
    onRequest,
    onDecline,
  }: RematchPromptProps) => {
    const [isDismissing, setIsDismissing] = useState(false);
    const titleId = useId();
    const panelRef = useRef<HTMLDivElement>(null);
    const rematchBtnRef = useRef<HTMLButtonElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);

    const handleDecline = useCallback(() => {
      setIsDismissing(true);
      setTimeout(() => {
        setIsDismissing(false);
        onDecline();
      }, 200);
    }, [onDecline]);

    useEffect(() => {
      if (!visible) {
        previousFocusRef.current?.focus();
        return;
      }

      previousFocusRef.current = document.activeElement as HTMLElement;

      const timer = requestAnimationFrame(() => {
        if (rematchBtnRef.current && iAmPlayer) {
          rematchBtnRef.current.focus();
        } else if (panelRef.current) {
          const first = panelRef.current.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
          first?.focus();
        }
      });

      return () => cancelAnimationFrame(timer);
    }, [visible, iAmPlayer]);

    useEffect(() => {
      if (!visible) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          handleDecline();
          return;
        }

        if (e.key !== 'Tab' || !panelRef.current) return;
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusable.length === 0) return;

        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }, [visible, handleDecline]);

    if (!visible) return null;

    const alreadyVoted = rematchVotes.includes(mySelfUserId);
    const iAmWinner = winnerId === mySelfUserId;

    const resultConfig = (() => {
      if (result === 'draw') {
        return {
          emoji: '🤝',
          title: "It's a Draw!",
          subtitle: 'Evenly matched — ready for a rematch?',
          accent: 'border-warning/40 bg-warning/10',
          titleClass: 'text-warning',
        };
      }
      if (result === 'aborted') {
        return {
          emoji: '⚠️',
          title: 'Game Ended',
          subtitle: 'The match was interrupted.',
          accent: 'border-danger/40 bg-danger/10',
          titleClass: 'text-danger',
        };
      }
      if (result === 'win') {
        if (iAmWinner) {
          return {
            emoji: '🏆',
            title: 'Victory!',
            subtitle: 'You outplayed your opponent.',
            accent: 'border-success/40 bg-success/10',
            titleClass: 'text-success',
          };
        }
        return {
          emoji: '😔',
          title: `${winnerDisplayName ?? 'Opponent'} Wins`,
          subtitle: 'Better luck next round!',
          accent: 'border-danger/40 bg-danger/10',
          titleClass: 'text-danger',
        };
      }
      return {
        emoji: '🎮',
        title: 'Game Over',
        subtitle: 'What would you like to do next?',
        accent: 'border-border bg-bg',
        titleClass: 'text-fg',
      };
    })();

    const statsMessage = (() => {
      if (result === 'aborted') return null;
      if (isGuest && guestSessionStats) {
        return (
          <p className="text-sm text-fg-muted">
            Session: {guestSessionStats.wins}W · {guestSessionStats.losses}L · {guestSessionStats.draws}D
            {' · '}
            <Link to="/register" className="text-primary hover:underline">
              Sign up
            </Link>
            {' '}to save stats permanently
          </p>
        );
      }
      if (!isGuest && matchRecorded && result === 'win' && iAmWinner) {
        return (
          <p className="text-sm font-medium text-success">
            +1 Win saved to your profile
          </p>
        );
      }
      if (!isGuest && matchRecorded && result === 'win' && !iAmWinner) {
        return (
          <p className="text-sm text-fg-muted">
            Result saved to your profile
          </p>
        );
      }
      if (!isGuest && matchRecorded && result === 'draw') {
        return (
          <p className="text-sm text-fg-muted">
            Draw recorded on your profile
          </p>
        );
      }
      return null;
    })();

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div
          className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity ${isDismissing ? 'opacity-0' : 'opacity-100'}`}
          aria-hidden="true"
        />

        <div
          ref={panelRef}
          className={`relative z-10 w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden ${isDismissing ? 'animate-modal-out' : 'animate-modal-in'}`}
        >
          <div className={cn('px-6 py-8 text-center border-b', resultConfig.accent)}>
            <div className="text-5xl mb-3 select-none" aria-hidden="true">
              {resultConfig.emoji}
            </div>
            <h2 id={titleId} className={cn('text-3xl font-bold', resultConfig.titleClass)}>
              {resultConfig.title}
            </h2>
            <p className="mt-2 text-fg-muted">{resultConfig.subtitle}</p>
            {statsMessage && <div className="mt-3">{statsMessage}</div>}
          </div>

          <div className="p-6 space-y-5">
            {iAmPlayer && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
                  Rematch votes
                </p>
                {players.map((p) => (
                  <div
                    key={p.userId}
                    className="flex items-center justify-between rounded-lg bg-bg px-3 py-2 text-sm"
                  >
                    <span className="text-fg font-medium">{p.displayName}</span>
                    <span
                      className={cn(
                        'text-xs font-semibold px-2 py-0.5 rounded-full',
                        rematchVotes.includes(p.userId)
                          ? 'bg-success/15 text-success'
                          : 'bg-surface text-fg-muted',
                      )}
                    >
                      {rematchVotes.includes(p.userId) ? 'Ready' : 'Waiting'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2">
              {iAmPlayer && (
                <Button
                  ref={rematchBtnRef}
                  onClick={onRequest}
                  disabled={alreadyVoted}
                  className="w-full"
                  size="lg"
                >
                  {alreadyVoted ? 'Waiting for opponent…' : 'Play Again'}
                </Button>
              )}
              <Button variant="secondary" onClick={handleDecline} className="w-full">
                {iAmPlayer ? 'Leave & Go Home' : 'Back to Home'}
              </Button>
              {!isGuest && (
                <Link
                  to="/leaderboard"
                  className="text-center text-sm text-primary hover:underline py-1"
                >
                  View Leaderboard
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
);
