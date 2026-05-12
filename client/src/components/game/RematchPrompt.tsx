import { memo, useState, useCallback, useEffect, useRef, useId } from 'react';
import type { RoomPlayer } from '@mpg/shared/types/room';
import { Button } from '../ui/Button';

type RematchPromptProps = {
  visible: boolean;
  iAmPlayer: boolean;
  rematchVotes: string[];
  players: RoomPlayer[];
  result: 'win' | 'draw' | 'aborted' | null;
  winnerId: string | null;
  winnerDisplayName: string | null;
  mySelfUserId: string;
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
    onRequest,
    onDecline,
  }: RematchPromptProps) => {
    const [isDismissing, setIsDismissing] = useState(false);
    const titleId = useId();
    const panelRef = useRef<HTMLDivElement>(null);
    const rematchBtnRef = useRef<HTMLButtonElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);

    /* Auto-focus rematch button (or first focusable) when prompt appears */
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

    /* Focus trap + Escape to close */
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
    }, [visible]);

    const handleDecline = useCallback(() => {
      setIsDismissing(true);
      const timeout = setTimeout(() => {
        setIsDismissing(false);
        onDecline();
      }, 200);
      return () => clearTimeout(timeout);
    }, [onDecline]);

    if (!visible) return null;

    const alreadyVoted = rematchVotes.includes(mySelfUserId);
    const iAmWinner = winnerId === mySelfUserId;

    const resultText = (() => {
      if (result === 'draw') return 'Draw!';
      if (result === 'aborted') return 'Game Aborted';
      if (result === 'win') {
        return iAmWinner ? 'You Won!' : `${winnerDisplayName ?? 'Opponent'} Wins!`;
      }
      return 'Game Over';
    })();

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity ${isDismissing ? 'opacity-0' : 'opacity-100'}`}
          aria-hidden="true"
        />

        <div
          ref={panelRef}
          className={`relative z-10 w-full max-w-sm rounded-xl border border-border bg-surface p-6 text-center shadow-xl space-y-5 ${isDismissing ? 'animate-modal-out' : 'animate-modal-in'}`}
        >
          <h2 id={titleId} className="text-2xl font-bold text-fg">{resultText}</h2>

          {/* Vote status per player */}
          <div className="space-y-2">
            {players.map((p) => (
              <div
                key={p.userId}
                className="flex items-center justify-between rounded-md bg-bg px-3 py-2 text-sm"
              >
                <span className="text-fg">{p.displayName}</span>
                <span className="text-fg-muted">
                  {rematchVotes.includes(p.userId) ? '✓ Ready' : 'Pending'}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            {iAmPlayer && (
              <Button
                ref={rematchBtnRef}
                onClick={onRequest}
                disabled={alreadyVoted}
                className="w-full"
              >
                {alreadyVoted ? 'Waiting for others…' : 'Rematch'}
              </Button>
            )}
            <Button variant="secondary" onClick={handleDecline} className="w-full">
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  },
);
