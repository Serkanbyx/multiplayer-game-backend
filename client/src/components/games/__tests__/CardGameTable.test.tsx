import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CardGameTable } from '../CardGameTable';
import type { Card, Suit } from '@mpg/shared/types/games';


const mkCard = (suit: Suit, rank: Card['rank']): Card => ({ suit, rank });

const defaultProps = {
  gameType: 'cardgame' as const,
  players: [
    { userId: 'me', displayName: 'Me', position: 0 as const, handCount: 5, tricksWon: 0 },
    { userId: 'opp', displayName: 'Opponent', position: 2 as const, handCount: 5, tricksWon: 0 },
  ],
  myHand: [
    mkCard('♠', 'A'),
    mkCard('♥', 'K'),
    mkCard('♦', '10'),
    mkCard('♣', 'J'),
  ],
  currentTrick: [] as { userId: string; card: Card }[],
  leadSuit: null as Suit | null,
  currentTurnUserId: 'me',
  trickNumber: 0,
  result: null,
  winner: null,
  isMyTurn: true,
  mySelfUserId: 'me',
  onPlayCard: vi.fn(),
};

describe('CardGameTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders hand with correct number of card buttons', () => {
    render(<CardGameTable {...defaultProps} />);
    const handGroup = screen.getByRole('group', { name: /your hand/i });
    const cards = handGroup.querySelectorAll('button');
    expect(cards).toHaveLength(4);
  });

  it('each card button has accessible label with rank and suit', () => {
    render(<CardGameTable {...defaultProps} />);
    expect(screen.getByLabelText(/card: a of ♠/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/card: k of ♥/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/card: 10 of ♦/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/card: j of ♣/i)).toBeInTheDocument();
  });

  it('calls onPlayCard when clicking a playable card on my turn', async () => {
    const user = userEvent.setup();
    const onPlayCard = vi.fn();
    render(<CardGameTable {...defaultProps} onPlayCard={onPlayCard} />);

    await user.click(screen.getByLabelText(/card: a of ♠/i));

    expect(onPlayCard).toHaveBeenCalledWith(mkCard('♠', 'A'));
  });

  it('does NOT call onPlayCard when not my turn', async () => {
    const user = userEvent.setup();
    const onPlayCard = vi.fn();
    render(<CardGameTable {...defaultProps} isMyTurn={false} onPlayCard={onPlayCard} />);

    await user.click(screen.getByLabelText(/card: a of ♠/i));

    expect(onPlayCard).not.toHaveBeenCalled();
  });

  it('dims off-suit cards when must follow lead suit', () => {
    render(
      <CardGameTable
        {...defaultProps}
        leadSuit="♠"
        currentTrick={[{ userId: 'opp', card: mkCard('♠', '2') }]}
      />,
    );

    const heartCard = screen.getByLabelText(/card: k of ♥/i);
    expect(heartCard).toHaveAttribute('aria-disabled', 'true');

    const spadeCard = screen.getByLabelText(/card: a of ♠/i);
    expect(spadeCard).toHaveAttribute('aria-disabled', 'false');
  });

  it('shows trick counter', () => {
    render(<CardGameTable {...defaultProps} />);
    expect(screen.getByText(/trick 1\/13/i)).toBeInTheDocument();
  });

  it('shows lead suit indicator when leadSuit is set', () => {
    render(<CardGameTable {...defaultProps} leadSuit="♥" currentTrick={[{ userId: 'opp', card: mkCard('♥', '3') }]} />);
    expect(screen.getAllByText('♥').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/lead:/i)).toBeInTheDocument();
  });

  it('shows opponent player info', () => {
    render(<CardGameTable {...defaultProps} />);
    expect(screen.getAllByText('Opponent').length).toBeGreaterThanOrEqual(1);
  });
});
