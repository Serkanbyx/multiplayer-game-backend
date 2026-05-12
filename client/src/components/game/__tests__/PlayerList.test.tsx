import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PlayerList } from '../PlayerList';
import type { RoomPlayer } from '@mpg/shared/types/room';

const mkPlayer = (overrides: Partial<RoomPlayer> = {}): RoomPlayer => ({
  userId: 'user-1',
  displayName: 'Alice',
  isGuest: false,
  avatarUrl: null,
  position: 0,
  isConnected: true,
  ...overrides,
});

describe('PlayerList', () => {
  it('renders all players', () => {
    const players = [
      mkPlayer({ userId: 'u1', displayName: 'Alice' }),
      mkPlayer({ userId: 'u2', displayName: 'Bob', position: 1 }),
    ];
    render(
      <PlayerList
        players={players}
        currentTurnUserId="u1"
        mySelfUserId="u1"
      />,
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('shows connected dot with "Online" label for connected players', () => {
    render(
      <PlayerList
        players={[mkPlayer({ isConnected: true })]}
        currentTurnUserId={null}
        mySelfUserId="me"
      />,
    );

    expect(screen.getByLabelText('Online')).toBeInTheDocument();
  });

  it('shows disconnected dot with "Offline" label for disconnected players', () => {
    render(
      <PlayerList
        players={[mkPlayer({ isConnected: false })]}
        currentTurnUserId={null}
        mySelfUserId="me"
      />,
    );

    expect(screen.getByLabelText('Offline')).toBeInTheDocument();
  });

  it('shows "(you)" label for self', () => {
    render(
      <PlayerList
        players={[mkPlayer({ userId: 'me', displayName: 'Me' })]}
        currentTurnUserId={null}
        mySelfUserId="me"
      />,
    );

    expect(screen.getByText('(you)')).toBeInTheDocument();
  });

  it('does NOT show "(you)" for other players', () => {
    render(
      <PlayerList
        players={[mkPlayer({ userId: 'other', displayName: 'Other' })]}
        currentTurnUserId={null}
        mySelfUserId="me"
      />,
    );

    expect(screen.queryByText('(you)')).not.toBeInTheDocument();
  });

  it('shows forfeit countdown for disconnected opponents', () => {
    const disconnectedOpponents = new Map([
      ['user-1', { displayName: 'Alice', secondsLeft: 15 }],
    ]);
    render(
      <PlayerList
        players={[mkPlayer({ isConnected: false })]}
        currentTurnUserId={null}
        mySelfUserId="me"
        disconnectedOpponents={disconnectedOpponents}
      />,
    );

    expect(screen.getByText(/forfeits in 15s/i)).toBeInTheDocument();
  });

  it('shows "Reconnecting…" for disconnected players without countdown', () => {
    render(
      <PlayerList
        players={[mkPlayer({ isConnected: false })]}
        currentTurnUserId={null}
        mySelfUserId="me"
      />,
    );

    expect(screen.getByText(/reconnecting/i)).toBeInTheDocument();
  });

  it('shows position labels', () => {
    render(
      <PlayerList
        players={[
          mkPlayer({ userId: 'u1', position: 0 }),
          mkPlayer({ userId: 'u2', position: 1 }),
        ]}
        currentTurnUserId={null}
        mySelfUserId="me"
      />,
    );

    expect(screen.getByText('P1')).toBeInTheDocument();
    expect(screen.getByText('P2')).toBeInTheDocument();
  });
});
