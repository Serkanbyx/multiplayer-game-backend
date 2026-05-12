import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import RegisterPage from '../RegisterPage';

const mockNavigate = vi.fn();
const mockRegister = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    register: mockRegister,
    user: null,
    token: null,
    loading: false,
    login: vi.fn(),
    loginAsGuest: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
    isAdmin: () => false,
    isGuest: () => false,
  }),
}));

vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

const renderRegister = () =>
  render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all registration fields', () => {
    renderRegister();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('shows username pattern hint', () => {
    renderRegister();
    expect(
      screen.getByText(/lowercase letters, numbers, and underscores/i),
    ).toBeInTheDocument();
  });

  it('calls register and navigates to / on success', async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValueOnce(undefined);
    renderRegister();

    await user.type(screen.getByLabelText(/username/i), 'cool_player');
    await user.type(screen.getByLabelText(/display name/i), 'Cool Player');
    await user.type(screen.getByLabelText(/email/i), 'cool@example.com');
    await user.type(screen.getByLabelText(/password/i), 'secure123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        username: 'cool_player',
        displayName: 'Cool Player',
        email: 'cool@example.com',
        password: 'secure123',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('shows field-level errors from API', async () => {
    const user = userEvent.setup();
    const { AxiosError } = await import('axios');
    const axiosErr = new AxiosError('Validation', '422', undefined, undefined, {
      data: {
        success: false,
        message: 'Validation failed',
        errors: [
          { field: 'username', message: 'Username already taken' },
          { field: 'email', message: 'Email already registered' },
        ],
      },
      status: 422,
      statusText: 'Unprocessable Entity',
      headers: {},
      config: { headers: {} as any },
    } as any);
    mockRegister.mockRejectedValueOnce(axiosErr);
    renderRegister();

    await user.type(screen.getByLabelText(/username/i), 'taken_user');
    await user.type(screen.getByLabelText(/display name/i), 'Name');
    await user.type(screen.getByLabelText(/email/i), 'dup@example.com');
    await user.type(screen.getByLabelText(/password/i), 'secure123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText('Username already taken')).toBeInTheDocument();
      expect(screen.getByText('Email already registered')).toBeInTheDocument();
    });
  });

  it('shows generic error toast when no field errors', async () => {
    const user = userEvent.setup();
    const toast = await import('react-hot-toast');
    mockRegister.mockRejectedValueOnce(new Error('Server Error'));
    renderRegister();

    await user.type(screen.getByLabelText(/username/i), 'cool_player');
    await user.type(screen.getByLabelText(/display name/i), 'Cool');
    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'secure123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(toast.default.error).toHaveBeenCalledWith('Registration failed');
    });
  });

  it('has links to login and guest pages', () => {
    renderRegister();
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: /play as guest/i })).toHaveAttribute('href', '/guest');
  });
});
