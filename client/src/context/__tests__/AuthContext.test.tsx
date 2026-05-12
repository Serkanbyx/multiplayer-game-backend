import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '../AuthContext';

const mockLogin = vi.fn();
const mockRegister = vi.fn();
const mockLoginAsGuest = vi.fn();
const mockGetMe = vi.fn();

vi.mock('../../api/authService', () => ({
  login: (...args: unknown[]) => mockLogin(...args),
  register: (...args: unknown[]) => mockRegister(...args),
  loginAsGuest: (...args: unknown[]) => mockLoginAsGuest(...args),
  getMe: () => mockGetMe(),
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
  deleteAccount: vi.fn(),
}));

const buildGuestToken = () => {
  const payload = { id: 'guest-1', role: 'player', isGuest: true, displayName: 'GuestUser' };
  return `header.${btoa(JSON.stringify(payload))}.signature`;
};

const buildRegisteredToken = (role: 'player' | 'admin' = 'player') => {
  const payload = { id: 'user-1', role, isGuest: false };
  return `header.${btoa(JSON.stringify(payload))}.signature`;
};

const TestConsumer = () => {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(auth.loading)}</span>
      <span data-testid="user">{auth.user ? auth.user.displayName || auth.user._id : 'null'}</span>
      <span data-testid="token">{auth.token ?? 'null'}</span>
      <span data-testid="isGuest">{String(auth.isGuest())}</span>
      <span data-testid="isAdmin">{String(auth.isAdmin())}</span>
      <button onClick={() => auth.login('test@test.com', 'pass')}>Login</button>
      <button onClick={() => auth.logout()}>Logout</button>
      <button onClick={() => auth.loginAsGuest('Guest')}>GuestLogin</button>
    </div>
  );
};

const renderAuth = () =>
  render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>,
  );

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('starts with loading=true then resolves to null user when no token', async () => {
    renderAuth();

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('null');
    expect(screen.getByTestId('token')).toHaveTextContent('null');
  });

  it('hydrates guest user from stored token without server call', async () => {
    localStorage.setItem('token', buildGuestToken());
    renderAuth();

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('GuestUser');
    expect(screen.getByTestId('isGuest')).toHaveTextContent('true');
    expect(mockGetMe).not.toHaveBeenCalled();
  });

  it('hydrates registered user with server validation', async () => {
    localStorage.setItem('token', buildRegisteredToken());
    mockGetMe.mockResolvedValueOnce({
      id: 'user-1',
      displayName: 'Alice',
      role: 'player',
      isGuest: false,
      avatarUrl: null,
    });
    renderAuth();

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('Alice');
    expect(mockGetMe).toHaveBeenCalled();
  });

  it('clears invalid token when server validation fails', async () => {
    localStorage.setItem('token', buildRegisteredToken());
    mockGetMe.mockRejectedValueOnce(new Error('Unauthorized'));
    renderAuth();

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('null');
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('login persists token and sets user', async () => {
    const token = buildRegisteredToken();
    mockLogin.mockResolvedValueOnce({
      token,
      user: { _id: 'user-1', displayName: 'Alice', role: 'player', isGuest: false },
    });
    renderAuth();

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    await act(async () => {
      screen.getByText('Login').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('Alice');
      expect(localStorage.getItem('token')).toBe(token);
    });
  });

  it('logout clears token and user', async () => {
    const token = buildGuestToken();
    localStorage.setItem('token', token);
    renderAuth();

    await waitFor(() => {
      expect(screen.getByTestId('user')).not.toHaveTextContent('null');
    });

    await act(async () => {
      screen.getByText('Logout').click();
    });

    expect(screen.getByTestId('user')).toHaveTextContent('null');
    expect(screen.getByTestId('token')).toHaveTextContent('null');
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('isGuest returns true for guest user', async () => {
    localStorage.setItem('token', buildGuestToken());
    renderAuth();

    await waitFor(() => {
      expect(screen.getByTestId('isGuest')).toHaveTextContent('true');
    });
  });

  it('isAdmin returns true for admin user', async () => {
    localStorage.setItem('token', buildRegisteredToken('admin'));
    mockGetMe.mockResolvedValueOnce({
      id: 'user-1',
      displayName: 'Admin',
      role: 'admin',
      isGuest: false,
      avatarUrl: null,
    });
    renderAuth();

    await waitFor(() => {
      expect(screen.getByTestId('isAdmin')).toHaveTextContent('true');
    });
  });

  it('isAdmin returns false for non-admin user', async () => {
    localStorage.setItem('token', buildRegisteredToken('player'));
    mockGetMe.mockResolvedValueOnce({
      id: 'user-1',
      displayName: 'Player',
      role: 'player',
      isGuest: false,
      avatarUrl: null,
    });
    renderAuth();

    await waitFor(() => {
      expect(screen.getByTestId('isAdmin')).toHaveTextContent('false');
    });
  });

  it('throws when useAuth is used outside AuthProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      'useAuth must be used within AuthProvider',
    );
    consoleError.mockRestore();
  });
});
