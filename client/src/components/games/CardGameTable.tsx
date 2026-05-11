import { memo, useMemo, useCallback, useEffect, useRef } from 'react';
import type { CardGameState, Card, Suit } from '@mpg/shared/types/games';
import { cn } from '../../utils/cn';
import { useSounds } from '../../hooks/useSounds';
import { Avatar } from '../ui/Avatar';

type CardGameTableProps = CardGameState & {
  isMyTurn: boolean;
  mySelfUserId: string;
  onPlayCard: (card: Card) => void;
};

type RelativePosition = 'bottom' | 'left' | 'top' | 'right';

type PlayerInfo = CardGameState['players'][number] & {
  relPos: RelativePosition;
};

const TRICK_POSITION_CLASSES: Record<RelativePosition, string> = {
  top: 'col-start-2 row-start-1',
  left: 'col-start-1 row-start-2',
  right: 'col-start-3 row-start-2',
  bottom: 'col-start-2 row-start-3',
};

/* ─── Playing Card ─── */

const PlayingCard = ({
  card,
  size = 'md',
  className,
}: {
  card: Card;
  size?: 'sm' | 'md';
  className?: string;
}) => {
  const isRed = card.suit === '♥' || card.suit === '♦';
  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center rounded-lg border bg-white shadow-md select-none',
        size === 'sm' ? 'h-14 w-10 text-xs' : 'h-20 w-14 text-sm',
        isRed ? 'text-red-600 border-red-200' : 'text-slate-900 border-gray-300',
        className,
      )}
    >
      <span className="font-bold leading-none">{card.rank}</span>
      <span className={cn('leading-none', size === 'sm' ? 'text-sm' : 'text-lg')}>
        {card.suit}
      </span>
    </div>
  );
};

/* ─── Player Slot ─── */

const PlayerSlot = ({
  displayName,
  handCount,
  tricksWon,
  isCurrentTurn,
  position,
}: {
  displayName: string;
  handCount: number;
  tricksWon: number;
  isCurrentTurn: boolean;
  position: RelativePosition;
}) => {
  const isHorizontal = position === 'left' || position === 'right';

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-xl px-3 py-2 transition-colors',
        isCurrentTurn ? 'bg-yellow-400/20 ring-2 ring-yellow-400/60' : 'bg-black/30',
        isHorizontal ? 'flex-col text-center' : 'flex-row',
      )}
    >
      <Avatar name={displayName} size="xs" className="bg-white/20 text-white" />

      <div className={cn(isHorizontal && 'text-center')}>
        <p className="max-w-[80px] truncate text-xs font-medium text-white/90">
          {displayName}
        </p>
        <div className="flex items-center gap-1.5 text-[10px] text-white/60">
          <span>{handCount} cards</span>
          <span className="text-white/30">|</span>
          <span>{tricksWon} tricks</span>
        </div>
      </div>

      {isCurrentTurn && (
        <span className="h-2 w-2 shrink-0 rounded-full bg-yellow-400 animate-pulse" />
      )}
    </div>
  );
};

/* ─── CardGameTable ─── */

export const CardGameTable = memo(
  ({
    players,
    myHand,
    currentTrick,
    leadSuit,
    currentTurnUserId,
    trickNumber,
    result,
    winner,
    isMyTurn,
    mySelfUserId,
    onPlayCard,
  }: CardGameTableProps) => {
    const { play } = useSounds();
    const prevTurnRef = useRef(currentTurnUserId);
    const prevResultRef = useRef(result);

    /* Sound: turn change */
    useEffect(() => {
      if (prevTurnRef.current && prevTurnRef.current !== currentTurnUserId) {
        play('turn');
      }
      prevTurnRef.current = currentTurnUserId;
    }, [currentTurnUserId, play]);

    /* Sound: win / lose */
    useEffect(() => {
      if (result && prevResultRef.current === null) {
        play(result === 'win' && winner === mySelfUserId ? 'win' : 'lose');
      }
      prevResultRef.current = result;
    }, [result, winner, mySelfUserId, play]);

    /* My position (spectators default to viewing from position 0) */
    const myPlayer = useMemo(
      () => players.find((p) => p.userId === mySelfUserId),
      [players, mySelfUserId],
    );
    const myPosition = myPlayer?.position ?? 0;

    /* Map each player to a relative seat around the table */
    const getRelativePosition = useCallback(
      (playerPosition: number): RelativePosition => {
        const seats: RelativePosition[] = ['bottom', 'left', 'top', 'right'];
        return seats[(playerPosition - myPosition + 4) % 4]!;
      },
      [myPosition],
    );

    const otherPlayers = useMemo<PlayerInfo[]>(
      () =>
        players
          .filter((p) => p.userId !== mySelfUserId)
          .map((p) => ({ ...p, relPos: getRelativePosition(p.position) })),
      [players, mySelfUserId, getRelativePosition],
    );

    const topPlayer = otherPlayers.find((p) => p.relPos === 'top');
    const leftPlayer = otherPlayers.find((p) => p.relPos === 'left');
    const rightPlayer = otherPlayers.find((p) => p.relPos === 'right');

    /* Suit-following dimming: if lead suit is set AND I hold that suit, dim non-lead cards */
    const mustFollowSuit = useMemo(() => {
      if (!myHand || !leadSuit || currentTrick.length === 0) return false;
      return myHand.some((c) => c.suit === leadSuit);
    }, [myHand, leadSuit, currentTrick.length]);

    const isCardDimmed = useCallback(
      (card: Card): boolean => {
        if (!mustFollowSuit || !leadSuit) return false;
        return card.suit !== leadSuit;
      },
      [mustFollowSuit, leadSuit],
    );

    /* Map current trick entries to relative positions */
    const trickCardsByRelPos = useMemo(() => {
      const map = new Map<RelativePosition, Card>();
      for (const entry of currentTrick) {
        const player = players.find((p) => p.userId === entry.userId);
        if (player) {
          map.set(getRelativePosition(player.position), entry.card);
        }
      }
      return map;
    }, [currentTrick, players, getRelativePosition]);

    const gameOver = result !== null;

    const handleCardClick = useCallback(
      (card: Card) => {
        if (!isMyTurn || gameOver) return;
        play('click');
        onPlayCard(card);
      },
      [isMyTurn, gameOver, play, onPlayCard],
    );

    return (
      <div className="flex w-full max-w-3xl flex-col items-center">
        {/* ── Felt table ── */}
        <div className="relative w-full aspect-16/10 overflow-hidden rounded-2xl border-4 border-emerald-950 bg-linear-to-br from-emerald-700 to-emerald-900 shadow-2xl">
          {/* Subtle radial highlight */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.06)_0%,transparent_70%)]" />

          {/* Trick counter */}
          <span className="absolute right-3 top-3 font-mono text-[10px] text-white/40">
            Trick {trickNumber + 1}/13
          </span>

          {/* Lead suit indicator */}
          {leadSuit && (
            <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-black/20 px-2 py-0.5 text-xs text-white/60">
              <span>Lead:</span>
              <span
                className={cn(
                  'text-sm font-bold',
                  leadSuit === '♥' || leadSuit === '♦' ? 'text-red-400' : 'text-white',
                )}
              >
                {leadSuit}
              </span>
            </div>
          )}

          {/* ── Top player ── */}
          {topPlayer && (
            <div className="absolute left-1/2 top-3 z-10 -translate-x-1/2">
              <PlayerSlot
                displayName={topPlayer.displayName}
                handCount={topPlayer.handCount}
                tricksWon={topPlayer.tricksWon}
                isCurrentTurn={currentTurnUserId === topPlayer.userId}
                position="top"
              />
            </div>
          )}

          {/* ── Left player ── */}
          {leftPlayer && (
            <div className="absolute left-3 top-1/2 z-10 -translate-y-1/2">
              <PlayerSlot
                displayName={leftPlayer.displayName}
                handCount={leftPlayer.handCount}
                tricksWon={leftPlayer.tricksWon}
                isCurrentTurn={currentTurnUserId === leftPlayer.userId}
                position="left"
              />
            </div>
          )}

          {/* ── Right player ── */}
          {rightPlayer && (
            <div className="absolute right-3 top-1/2 z-10 -translate-y-1/2">
              <PlayerSlot
                displayName={rightPlayer.displayName}
                handCount={rightPlayer.handCount}
                tricksWon={rightPlayer.tricksWon}
                isCurrentTurn={currentTurnUserId === rightPlayer.userId}
                position="right"
              />
            </div>
          )}

          {/* ── Bottom player info (me) ── */}
          {myPlayer && (
            <div className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2">
              <PlayerSlot
                displayName={myPlayer.displayName}
                handCount={myPlayer.handCount}
                tricksWon={myPlayer.tricksWon}
                isCurrentTurn={isMyTurn}
                position="bottom"
              />
            </div>
          )}

          {/* ── Center trick area ── */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="grid w-36 grid-cols-3 grid-rows-3 place-items-center gap-1">
              {(['top', 'left', 'right', 'bottom'] as const).map((pos) => {
                const card = trickCardsByRelPos.get(pos);
                return (
                  <div key={pos} className={TRICK_POSITION_CLASSES[pos]}>
                    {card && <PlayingCard card={card} size="sm" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── My hand (fanned cards) ── */}
        {myHand && myHand.length > 0 && (
          <div className="relative -mt-4 flex items-end justify-center pb-2">
            {myHand.map((card, i) => {
              const n = myHand.length;
              const mid = (n - 1) / 2;
              const angle = n > 1 ? (i - mid) * (40 / (n - 1)) : 0;
              const lift = Math.abs(i - mid) * 3;
              const dimmed = isCardDimmed(card);
              const canPlay = isMyTurn && !gameOver && !dimmed;

              return (
                <div
                  key={`${card.suit}-${card.rank}`}
                  className="-ml-3 first:ml-0"
                  style={{
                    transform: `rotate(${angle}deg)`,
                    transformOrigin: 'bottom center',
                    zIndex: i,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => canPlay && handleCardClick(card)}
                    disabled={!isMyTurn || gameOver}
                    className={cn(
                      'relative flex h-20 w-14 flex-col items-center justify-center rounded-lg border-2 bg-white shadow-lg transition-all duration-200 select-none',
                      card.suit === '♥' || card.suit === '♦'
                        ? 'text-red-600'
                        : 'text-slate-900',
                      canPlay
                        ? 'cursor-pointer border-gray-300 hover:-translate-y-4 hover:border-yellow-400 hover:shadow-xl hover:z-30'
                        : dimmed
                          ? 'cursor-not-allowed border-gray-400 opacity-40'
                          : 'cursor-not-allowed border-gray-300',
                    )}
                    style={{ marginTop: `${lift}px` }}
                    aria-label={`${card.rank} of ${card.suit}`}
                  >
                    <span className="text-sm font-bold leading-none">{card.rank}</span>
                    <span className="text-lg leading-none">{card.suit}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  },
);
