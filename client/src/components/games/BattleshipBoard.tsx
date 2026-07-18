import { memo, useState, useCallback, useMemo, useEffect, useRef, type ReactNode } from 'react';
import type {
  BattleshipState,
  BattleshipShipType,
  BattleshipOrientation,
  BattleshipCell,
  BattleshipShotCell,
  BattleshipLastShot,
} from '@mpg/shared/types/games';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';
import { useSounds } from '../../hooks/useSounds';

type BattleshipBoardProps = BattleshipState & {
  isMyTurn: boolean;
  mySelfUserId: string;
  onAutoPlace: () => void;
  onClearShips: () => void;
  onReady: () => void;
  onPlaceShip: (
    shipType: BattleshipShipType,
    row: number,
    col: number,
    orientation: BattleshipOrientation,
  ) => void;
  onFire: (row: number, col: number) => void;
};

const SHIP_LABELS: Record<BattleshipShipType, string> = {
  carrier: 'Carrier (5)',
  battleship: 'Battleship (4)',
  cruiser: 'Cruiser (3)',
  submarine: 'Submarine (3)',
  destroyer: 'Destroyer (2)',
};

const SHOT_CELL_CLASSES: Record<BattleshipShotCell, string> = {
  unknown: 'bg-sky-900/40 hover:bg-sky-800/60 border-sky-700/50',
  hit: 'bg-danger/80 border-danger text-white',
  miss: 'bg-slate-700/80 border-slate-500 text-sky-200',
  sunk: 'bg-danger text-white border-red-900 ring-2 ring-red-300/50',
};

const OWN_CELL_CLASSES = (cell: BattleshipCell): string => {
  switch (cell) {
    case 'ship':
      return 'bg-emerald-600/80 border-emerald-400';
    case 'hit':
      return 'bg-danger/90 border-danger';
    case 'miss':
      return 'bg-slate-600/60 border-slate-500';
    default:
      return 'bg-sky-900/30 border-sky-800/40';
  }
};

const GridCell = ({
  label,
  className,
  onClick,
  disabled,
  children,
}: {
  label: string;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  children?: ReactNode;
}) => (
  <button
    type="button"
    aria-label={label}
    disabled={disabled}
    onClick={onClick}
    className={cn(
      'aspect-square w-full rounded-sm border text-[10px] sm:text-xs font-bold transition-colors',
      disabled && 'cursor-not-allowed opacity-60',
      className,
    )}
  >
    {children}
  </button>
);

export const BattleshipBoard = memo(
  ({
    phase,
    boardSize,
    currentTurnUserId,
    players,
    ownBoard,
    ownShips,
    opponentBoard,
    shipsToPlace,
    lastShot,
    isMyTurn,
    mySelfUserId,
    onAutoPlace,
    onClearShips,
    onReady,
    onPlaceShip,
    onFire,
  }: BattleshipBoardProps) => {
    const { play } = useSounds();
    const prevLastShotRef = useRef<BattleshipLastShot | null>(null);
    const prevPhaseRef = useRef(phase);
    const prevOwnShipsLenRef = useRef(ownShips.length);
    const prevIsMyTurnRef = useRef(isMyTurn);

    const [selectedShip, setSelectedShip] = useState<BattleshipShipType | null>(
      shipsToPlace[0] ?? null,
    );
    const [orientation, setOrientation] = useState<BattleshipOrientation>('horizontal');

    useEffect(() => {
      if (selectedShip && !shipsToPlace.includes(selectedShip)) {
        setSelectedShip(shipsToPlace[0] ?? null);
      } else if (!selectedShip && shipsToPlace[0]) {
        setSelectedShip(shipsToPlace[0]);
      }
    }, [shipsToPlace, selectedShip]);

    const me = players.find((p) => p.userId === mySelfUserId);
    const opponent = players.find((p) => p.userId !== mySelfUserId);
    const isPlacementPhase = phase === 'placement';
    const isBattlePhase = phase === 'battle';
    const iAmReady = me?.ready ?? false;
    const canPlace = isPlacementPhase && !iAmReady && isMyTurn;

    useEffect(() => {
      if (phase === 'battle' && prevPhaseRef.current === 'placement') {
        play('deploy');
      }
      prevPhaseRef.current = phase;
    }, [phase, play]);

    useEffect(() => {
      if (!lastShot || lastShot === prevLastShotRef.current) return;

      if (lastShot.shooterId === mySelfUserId) {
        if (lastShot.sunkShip) play('sunk');
        else if (lastShot.hit) play('hit');
        else play('miss');
      } else {
        if (lastShot.hit) play('hit', 0.45);
        else play('miss', 0.35);
      }
      prevLastShotRef.current = lastShot;
    }, [lastShot, mySelfUserId, play]);

    useEffect(() => {
      if (canPlace && ownShips.length > prevOwnShipsLenRef.current) {
        play('click', 0.45);
      }
      prevOwnShipsLenRef.current = ownShips.length;
    }, [ownShips.length, canPlace, play]);

    useEffect(() => {
      if (isBattlePhase && isMyTurn && !prevIsMyTurnRef.current) {
        play('turn');
      }
      prevIsMyTurnRef.current = isMyTurn;
    }, [isMyTurn, isBattlePhase, play]);

    const handleAutoPlace = useCallback(() => {
      play('click', 0.35);
      onAutoPlace();
    }, [onAutoPlace, play]);

    const handleClearShips = useCallback(() => {
      play('click', 0.3);
      onClearShips();
    }, [onClearShips, play]);

    const handleReady = useCallback(() => {
      play('deploy');
      onReady();
    }, [onReady, play]);

    const previewCells = useMemo(() => {
      if (!canPlace || !selectedShip) return new Set<number>();
      return new Set<number>();
    }, [canPlace, selectedShip]);

    const handleOwnCellClick = useCallback(
      (row: number, col: number) => {
        if (!canPlace || !selectedShip) return;
        onPlaceShip(selectedShip, row, col, orientation);
      },
      [canPlace, selectedShip, orientation, onPlaceShip],
    );

    const handleOpponentCellClick = useCallback(
      (row: number, col: number) => {
        if (!isBattlePhase || !isMyTurn) return;
        const index = row * boardSize + col;
        if (opponentBoard[index] !== 'unknown') return;
        onFire(row, col);
      },
      [isBattlePhase, isMyTurn, boardSize, opponentBoard, onFire],
    );

    const statusText = (() => {
      if (isPlacementPhase) {
        if (iAmReady) return 'Waiting for opponent to deploy fleet…';
        return 'Deploy your fleet, then press Ready';
      }
      if (isBattlePhase) {
        return isMyTurn ? 'Your turn — fire at the enemy grid!' : `Waiting for ${opponent?.displayName ?? 'opponent'}…`;
      }
      return 'Battle complete';
    })();

    const renderOwnGrid = () => (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-fg text-center">Your Fleet</h3>
        <div
          className="grid gap-0.5 sm:gap-1 w-full max-w-[280px] mx-auto"
          style={{ gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: boardSize * boardSize }, (_, index) => {
            const row = Math.floor(index / boardSize);
            const col = index % boardSize;
            const cell = ownBoard[index] ?? 'empty';
            const isPreview = previewCells.has(index);

            return (
              <GridCell
                key={`own-${index}`}
                label={`Your grid row ${row + 1} column ${col + 1}`}
                className={cn(
                  OWN_CELL_CLASSES(cell),
                  isPreview && 'ring-2 ring-primary/70',
                  canPlace && 'cursor-crosshair hover:ring-1 hover:ring-primary/40',
                )}
                {...(canPlace ? { onClick: () => handleOwnCellClick(row, col) } : {})}
                disabled={!canPlace}
              />
            );
          })}
        </div>
      </div>
    );

    const renderOpponentGrid = () => (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-fg text-center">
          {isPlacementPhase ? 'Enemy Waters' : 'Target Grid'}
        </h3>
        <div
          className="grid gap-0.5 sm:gap-1 w-full max-w-[280px] mx-auto"
          style={{ gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: boardSize * boardSize }, (_, index) => {
            const row = Math.floor(index / boardSize);
            const col = index % boardSize;
            const cell = opponentBoard[index] ?? 'unknown';
            const isLastShot =
              lastShot?.row === row && lastShot?.col === col && lastShot.shooterId === mySelfUserId;
            const canFire = isBattlePhase && isMyTurn && cell === 'unknown';

            return (
              <GridCell
                key={`opp-${index}`}
                label={`Target grid row ${row + 1} column ${col + 1}`}
                className={cn(
                  SHOT_CELL_CLASSES[cell],
                  isLastShot && 'ring-2 ring-yellow-400 animate-pulse',
                  canFire && 'cursor-crosshair',
                )}
                {...(canFire ? { onClick: () => handleOpponentCellClick(row, col) } : {})}
                disabled={!canFire}
              >
                {cell === 'hit' || cell === 'sunk' ? '✕' : cell === 'miss' ? '•' : ''}
              </GridCell>
            );
          })}
        </div>
      </div>
    );

    return (
      <div className="flex flex-col items-center gap-4 w-full max-w-3xl mx-auto">
        <p
          role="status"
          aria-live="polite"
          className={cn(
            'rounded-lg px-4 py-2 text-sm font-semibold text-center w-full',
            isBattlePhase && isMyTurn && 'bg-primary/15 text-primary',
            (!isBattlePhase || !isMyTurn) && 'bg-surface text-fg-muted',
          )}
        >
          {statusText}
        </p>

        {lastShot && isBattlePhase && (
          <p className="text-xs text-fg-muted text-center">
            Last shot: {lastShot.hit ? 'Hit' : 'Miss'}
            {lastShot.sunkShip ? ` — ${SHIP_LABELS[lastShot.sunkShip]} sunk!` : ''}
          </p>
        )}

        <div className="grid gap-6 sm:grid-cols-2 w-full">
          {renderOwnGrid()}
          {renderOpponentGrid()}
        </div>

        {canPlace && (
          <div className="w-full max-w-md space-y-3 rounded-xl border border-border bg-surface p-4">
            <p className="text-sm font-medium text-fg">Place ships ({ownShips.length}/5)</p>

            <div className="flex flex-wrap gap-2">
              {shipsToPlace.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedShip(type)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-xs font-medium border transition-colors',
                    selectedShip === type
                      ? 'bg-primary text-white border-primary'
                      : 'bg-bg border-border text-fg hover:border-primary/50',
                  )}
                >
                  {SHIP_LABELS[type]}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() =>
                  setOrientation((o) => (o === 'horizontal' ? 'vertical' : 'horizontal'))
                }
              >
                Orientation: {orientation === 'horizontal' ? 'Horizontal' : 'Vertical'}
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={handleAutoPlace}>
                Random Fleet
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={handleClearShips}>
                Clear
              </Button>
            </div>

            <Button
              type="button"
              className="w-full"
              disabled={ownShips.length !== 5}
              onClick={handleReady}
            >
              Ready for Battle
            </Button>
          </div>
        )}

        {isPlacementPhase && iAmReady && (
          <p className="text-sm text-fg-muted">
            {opponent?.ready
              ? 'Both fleets deployed — battle starting…'
              : `Waiting for ${opponent?.displayName ?? 'opponent'} to ready up…`}
          </p>
        )}
      </div>
    );
  },
);
