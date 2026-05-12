import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TicTacToeBoard } from '../TicTacToeBoard';
import type { TicTacToeBoard as BoardTuple } from '@mpg/shared/types/games';


const EMPTY_BOARD: BoardTuple = [null, null, null, null, null, null, null, null, null];

const defaultProps = {
  gameType: 'tictactoe' as const,
  board: EMPTY_BOARD,
  currentTurnUserId: 'user-1',
  players: [
    { userId: 'user-1', displayName: 'Alice', symbol: 'X' as const },
    { userId: 'user-2', displayName: 'Bob', symbol: 'O' as const },
  ],
  winner: null,
  result: null,
  winningLine: null,
  isMyTurn: true,
  mySymbol: 'X' as const,
  onPlay: vi.fn(),
};

describe('TicTacToeBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders 9 cells', () => {
    render(<TicTacToeBoard {...defaultProps} />);
    const cells = screen.getAllByRole('gridcell');
    expect(cells).toHaveLength(9);
  });

  it('renders the grid with proper aria label', () => {
    render(<TicTacToeBoard {...defaultProps} />);
    expect(screen.getByRole('grid', { name: /tictactoe game board/i })).toBeInTheDocument();
  });

  it('displays current symbol text', () => {
    render(<TicTacToeBoard {...defaultProps} />);
    expect(screen.getByText('X')).toBeInTheDocument();
    expect(screen.getByText(/you are/i)).toBeInTheDocument();
  });

  it('calls onPlay(index) when clicking an empty cell while isMyTurn', async () => {
    const user = userEvent.setup();
    const onPlay = vi.fn();
    render(<TicTacToeBoard {...defaultProps} onPlay={onPlay} />);

    const cells = screen.getAllByRole('gridcell');
    await user.click(cells[4]!);

    expect(onPlay).toHaveBeenCalledWith(4);
  });

  it('does NOT call onPlay when isMyTurn is false', async () => {
    const user = userEvent.setup();
    const onPlay = vi.fn();
    render(<TicTacToeBoard {...defaultProps} isMyTurn={false} onPlay={onPlay} />);

    const cells = screen.getAllByRole('gridcell');
    await user.click(cells[4]!);

    expect(onPlay).not.toHaveBeenCalled();
  });

  it('does NOT call onPlay when clicking an occupied cell', async () => {
    const user = userEvent.setup();
    const onPlay = vi.fn();
    const board: BoardTuple = ['X', null, null, null, null, null, null, null, null];
    render(<TicTacToeBoard {...defaultProps} board={board} onPlay={onPlay} />);

    const cells = screen.getAllByRole('gridcell');
    await user.click(cells[0]!);

    expect(onPlay).not.toHaveBeenCalled();
  });

  it('renders board content with X and O symbols', () => {
    const board: BoardTuple = ['X', 'O', null, null, 'X', null, null, null, 'O'];
    render(<TicTacToeBoard {...defaultProps} board={board} />);

    const cells = screen.getAllByRole('gridcell');
    expect(cells[0]).toHaveTextContent('X');
    expect(cells[1]).toHaveTextContent('O');
    expect(cells[2]).toHaveTextContent('');
    expect(cells[4]).toHaveTextContent('X');
    expect(cells[8]).toHaveTextContent('O');
  });

  it('marks winning line cells with aria-label containing cell info', () => {
    const board: BoardTuple = ['X', 'X', 'X', 'O', 'O', null, null, null, null];
    render(
      <TicTacToeBoard
        {...defaultProps}
        board={board}
        result="win"
        winner="user-1"
        winningLine={[0, 1, 2] as unknown as readonly [number, number, number]}
      />,
    );

    const cells = screen.getAllByRole('gridcell');
    expect(cells[0]).toHaveAttribute('aria-label', expect.stringContaining('X'));
    expect(cells[1]).toHaveAttribute('aria-label', expect.stringContaining('X'));
    expect(cells[2]).toHaveAttribute('aria-label', expect.stringContaining('X'));
  });

  it('sets aria-disabled on cells that cannot be played', () => {
    render(<TicTacToeBoard {...defaultProps} isMyTurn={false} />);

    const cells = screen.getAllByRole('gridcell');
    cells.forEach((cell) => {
      expect(cell).toHaveAttribute('aria-disabled', 'true');
    });
  });
});
