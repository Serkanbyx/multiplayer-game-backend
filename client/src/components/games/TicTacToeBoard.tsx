import { memo, useEffect, useRef, useCallback, useState } from 'react';
import type { TicTacToeState } from '@mpg/shared/types/games';
import { cn } from '../../utils/cn';
import { useSounds } from '../../hooks/useSounds';

type TicTacToeBoardProps = TicTacToeState & {
  isMyTurn: boolean;
  mySymbol: 'X' | 'O' | null;
  onPlay: (index: number) => void;
};

const toRowCol = (index: number) => ({
  row: Math.floor(index / 3),
  col: index % 3,
});

export const TicTacToeBoard = memo(
  ({
    board,
    currentTurnUserId,
    players,
    winner,
    result,
    winningLine,
    isMyTurn,
    mySymbol,
    onPlay,
  }: TicTacToeBoardProps) => {
    const { play } = useSounds();
    const prevTurnRef = useRef(currentTurnUserId);
    const prevResultRef = useRef(result);
    const prevBoardRef = useRef<readonly (string | null)[]>(board);
    const cellRefs = useRef<(HTMLButtonElement | null)[]>(new Array(9).fill(null));
    const [focusedIndex, setFocusedIndex] = useState(0);

    /* Sound: turn change */
    useEffect(() => {
      if (prevTurnRef.current && prevTurnRef.current !== currentTurnUserId) {
        play('turn');
      }
      prevTurnRef.current = currentTurnUserId;
    }, [currentTurnUserId, play]);

    /* Sound: win / lose on game end */
    useEffect(() => {
      if (result && prevResultRef.current === null && mySymbol) {
        const myPlayer = players.find((p) => p.symbol === mySymbol);
        const isWin = result === 'win' && myPlayer && winner === myPlayer.userId;
        play(isWin ? 'win' : 'lose');
      }
      prevResultRef.current = result;
    }, [result, winner, mySymbol, players, play]);

    /* Track which cells are newly placed for piece-drop animation */
    const newCellIndexes = useRef(new Set<number>());
    useEffect(() => {
      const prev = prevBoardRef.current;
      const fresh = new Set<number>();
      board.forEach((cell, i) => {
        if (cell !== null && prev[i] === null) fresh.add(i);
      });
      newCellIndexes.current = fresh;
      prevBoardRef.current = board;
    }, [board]);

    const handleCellClick = useCallback(
      (index: number) => {
        play('click');
        onPlay(index);
      },
      [play, onPlay],
    );

    /* Arrow key navigation within the 3×3 grid */
    const handleGridKeyDown = useCallback(
      (e: React.KeyboardEvent, index: number) => {
        const { row, col } = toRowCol(index);
        let nextIndex = index;

        switch (e.key) {
          case 'ArrowUp':
            nextIndex = row > 0 ? (row - 1) * 3 + col : index;
            break;
          case 'ArrowDown':
            nextIndex = row < 2 ? (row + 1) * 3 + col : index;
            break;
          case 'ArrowLeft':
            nextIndex = col > 0 ? row * 3 + (col - 1) : index;
            break;
          case 'ArrowRight':
            nextIndex = col < 2 ? row * 3 + (col + 1) : index;
            break;
          default:
            return;
        }

        if (nextIndex !== index) {
          e.preventDefault();
          setFocusedIndex(nextIndex);
          cellRefs.current[nextIndex]?.focus();
        }
      },
      [],
    );

    const isGameWon = result === 'win' && winningLine && winningLine.length > 0;

    const rows = [board.slice(0, 3), board.slice(3, 6), board.slice(6, 9)];

    return (
      <div className="flex flex-col items-center gap-4 w-[90vw] max-w-[320px] lg:w-[480px] lg:max-w-[480px]">
        {mySymbol && (
          <p className="text-sm text-fg-muted">
            You are <span className="font-bold text-fg">{mySymbol}</span>
          </p>
        )}

        <div
          role="grid"
          aria-label="TicTacToe game board"
          className="w-full"
        >
          {rows.map((row, rowIdx) => (
            <div key={rowIdx} role="row" className="flex gap-2 mb-2 last:mb-0 justify-center">
              {row.map((cell, colIdx) => {
                const i = rowIdx * 3 + colIdx;
                const isWinCell = winningLine?.includes(i) ?? false;
                const canPlay = isMyTurn && cell === null && result === null;
                const isNew = newCellIndexes.current.has(i);
                const cellLabel = `Row ${rowIdx + 1}, Column ${colIdx + 1}, ${cell ?? 'empty'}`;

                return (
                  <button
                    key={i}
                    ref={(el) => { cellRefs.current[i] = el; }}
                    role="gridcell"
                    tabIndex={focusedIndex === i ? 0 : -1}
                    onClick={() => canPlay && handleCellClick(i)}
                    onKeyDown={(e) => handleGridKeyDown(e, i)}
                    aria-label={cellLabel}
                    aria-disabled={!canPlay}
                    className={cn(
                      'flex aspect-square w-[calc((100%-1rem)/3)] lg:h-[152px] lg:w-[152px] items-center justify-center rounded-lg border-2 text-3xl lg:text-4xl font-bold transition-all',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
                      canPlay
                        ? 'cursor-pointer hover:bg-surface/80 hover:scale-105'
                        : 'cursor-not-allowed',
                      isWinCell
                        ? 'border-primary bg-primary/20 text-primary animate-win-pulse'
                        : 'border-border bg-surface',
                      cell === 'X' && !isWinCell && 'text-info',
                      cell === 'O' && !isWinCell && 'text-danger',
                      isNew && cell !== null && 'animate-piece-drop',
                    )}
                  >
                    {cell}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  },
);
