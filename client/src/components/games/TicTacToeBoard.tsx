import { memo, useEffect, useRef, useCallback } from 'react';
import type { TicTacToeState } from '@mpg/shared/types/games';
import { cn } from '../../utils/cn';
import { useSounds } from '../../hooks/useSounds';

type TicTacToeBoardProps = TicTacToeState & {
  isMyTurn: boolean;
  mySymbol: 'X' | 'O' | null;
  onPlay: (index: number) => void;
};

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
    const prevBoardRef = useRef<(string | null)[]>(board);

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

    const isGameWon = result === 'win' && winningLine && winningLine.length > 0;

    return (
      <div className="flex flex-col items-center gap-4">
        {mySymbol && (
          <p className="text-sm text-fg-muted">
            You are <span className="font-bold text-fg">{mySymbol}</span>
          </p>
        )}

        <div
          className="grid grid-cols-3 gap-2"
          role="grid"
          aria-label="Tic Tac Toe board"
        >
          {board.map((cell, i) => {
            const isWinCell = winningLine?.includes(i) ?? false;
            const isClickable = isMyTurn && cell === null && result === null;
            const isNew = newCellIndexes.current.has(i);

            return (
              <button
                key={i}
                onClick={() => isClickable && handleCellClick(i)}
                disabled={!isClickable}
                className={cn(
                  'flex h-20 w-20 items-center justify-center rounded-lg border-2 text-3xl font-bold transition-all',
                  isClickable
                    ? 'cursor-pointer hover:bg-surface/80 hover:scale-105'
                    : 'cursor-not-allowed',
                  isWinCell
                    ? 'border-primary bg-primary/20 text-primary animate-win-pulse'
                    : 'border-border bg-surface',
                  cell === 'X' && !isWinCell && 'text-info',
                  cell === 'O' && !isWinCell && 'text-danger',
                  isNew && cell !== null && 'animate-piece-drop',
                )}
                aria-label={`Cell ${i + 1}: ${cell ?? 'empty'}`}
              >
                {cell}
              </button>
            );
          })}
        </div>
      </div>
    );
  },
);
