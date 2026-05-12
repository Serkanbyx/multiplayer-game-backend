import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import LeaderboardPage from '../LeaderboardPage';

const mockGetLeaderboard = vi.fn();

vi.mock('../../api/leaderboardService', () => ({
  getLeaderboard: (...args: unknown[]) => mockGetLeaderboard(...args),
}));

vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

const mkEntry = (id: string, displayName: string, wins = 10, losses = 5) => ({
  id,
  username: displayName.toLowerCase().replace(/\s/g, '_'),
  displayName,
  avatarUrl: '',
  stats: { wins, losses, draws: 2, gamesPlayed: wins + losses + 2 },
});

const renderLeaderboard = () =>
  render(
    <MemoryRouter>
      <LeaderboardPage />
    </MemoryRouter>,
  );

describe('LeaderboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows spinner while loading', () => {
    mockGetLeaderboard.mockReturnValue(new Promise(() => {}));
    renderLeaderboard();

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders leaderboard rows', async () => {
    mockGetLeaderboard.mockResolvedValueOnce({
      leaderboard: [
        mkEntry('1', 'Alice', 20, 5),
        mkEntry('2', 'Bob', 15, 10),
        mkEntry('3', 'Charlie', 10, 15),
      ],
      pagination: { page: 1, limit: 25, total: 3, totalPages: 1, hasNext: false, hasPrev: false },
    });
    renderLeaderboard();

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    expect(screen.getAllByText('Alice').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Bob').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Charlie').length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty state when no entries', async () => {
    mockGetLeaderboard.mockResolvedValueOnce({
      leaderboard: [],
      pagination: { page: 1, limit: 25, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
    });
    renderLeaderboard();

    await waitFor(() => {
      expect(screen.getByText(/no players yet/i)).toBeInTheDocument();
    });
  });

  it('fetches with gameType filter when changed', async () => {
    const user = userEvent.setup();
    mockGetLeaderboard.mockResolvedValue({
      leaderboard: [mkEntry('1', 'Alice')],
      pagination: { page: 1, limit: 25, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
    });
    renderLeaderboard();

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    const select = screen.getByLabelText(/game type/i);
    await user.selectOptions(select, 'tictactoe');

    await waitFor(() => {
      expect(mockGetLeaderboard).toHaveBeenCalledWith(
        expect.objectContaining({ gameType: 'tictactoe' }),
      );
    });
  });

  it('renders pagination buttons when multiple pages', async () => {
    mockGetLeaderboard.mockResolvedValueOnce({
      leaderboard: [mkEntry('1', 'Alice')],
      pagination: { page: 1, limit: 25, total: 50, totalPages: 2, hasNext: true, hasPrev: false },
    });
    renderLeaderboard();

    await waitFor(() => {
      expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled();
  });

  it('navigates to next page on Next click', async () => {
    const user = userEvent.setup();
    mockGetLeaderboard
      .mockResolvedValueOnce({
        leaderboard: [mkEntry('1', 'Alice')],
        pagination: { page: 1, limit: 25, total: 50, totalPages: 2, hasNext: true, hasPrev: false },
      })
      .mockResolvedValueOnce({
        leaderboard: [mkEntry('2', 'Bob')],
        pagination: { page: 2, limit: 25, total: 50, totalPages: 2, hasNext: false, hasPrev: true },
      });
    renderLeaderboard();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled();
    });

    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(mockGetLeaderboard).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 }),
      );
    });
  });

  it('shows error toast on fetch failure', async () => {
    const toast = await import('react-hot-toast');
    mockGetLeaderboard.mockRejectedValueOnce(new Error('Server Error'));
    renderLeaderboard();

    await waitFor(() => {
      expect(toast.default.error).toHaveBeenCalledWith('Failed to load leaderboard.');
    });
  });
});
