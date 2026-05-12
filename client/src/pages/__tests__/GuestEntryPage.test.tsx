import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import GuestEntryPage from '../GuestEntryPage';

const mockNavigate = vi.fn();
const mockLoginAsGuest = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    loginAsGuest: mockLoginAsGuest,
    user: null,
    token: null,
    loading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
    isAdmin: () => false,
    isGuest: () => false,
  }),
}));

vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

const renderGuest = () =>
  render(
    <MemoryRouter>
      <GuestEntryPage />
    </MemoryRouter>,
  );

describe('GuestEntryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders display name field and submit button', () => {
    renderGuest();
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /play as guest/i })).toBeInTheDocument();
  });

  it('shows guest warning callout', () => {
    renderGuest();
    expect(screen.getByText(/heads up/i)).toBeInTheDocument();
    expect(screen.getByText(/guest progress is not saved/i)).toBeInTheDocument();
  });

  it('has display name validation constraints', () => {
    renderGuest();
    const input = screen.getByLabelText(/display name/i);
    expect(input).toHaveAttribute('minLength', '2');
    expect(input).toHaveAttribute('maxLength', '20');
    expect(input).toBeRequired();
  });

  it('calls loginAsGuest and navigates to / on success', async () => {
    const user = userEvent.setup();
    mockLoginAsGuest.mockResolvedValueOnce(undefined);
    renderGuest();

    await user.type(screen.getByLabelText(/display name/i), 'TestGuest');
    await user.click(screen.getByRole('button', { name: /play as guest/i }));

    await waitFor(() => {
      expect(mockLoginAsGuest).toHaveBeenCalledWith('TestGuest');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('shows error toast on failure', async () => {
    const user = userEvent.setup();
    const toast = await import('react-hot-toast');
    mockLoginAsGuest.mockRejectedValueOnce(new Error('Failed'));
    renderGuest();

    await user.type(screen.getByLabelText(/display name/i), 'TestGuest');
    await user.click(screen.getByRole('button', { name: /play as guest/i }));

    await waitFor(() => {
      expect(toast.default.error).toHaveBeenCalledWith('Could not join as guest');
    });
  });

  it('shows field-level errors from API', async () => {
    const user = userEvent.setup();
    const { AxiosError } = await import('axios');
    const axiosErr = new AxiosError('Validation', '422', undefined, undefined, {
      data: {
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'displayName', message: 'Name too short' }],
      },
      status: 422,
      statusText: 'Unprocessable Entity',
      headers: {},
      config: { headers: {} as any },
    } as any);
    mockLoginAsGuest.mockRejectedValueOnce(axiosErr);
    renderGuest();

    await user.type(screen.getByLabelText(/display name/i), 'A');
    await user.click(screen.getByRole('button', { name: /play as guest/i }));

    await waitFor(() => {
      expect(screen.getByText('Name too short')).toBeInTheDocument();
    });
  });

  it('has links to register and login pages', () => {
    renderGuest();
    expect(screen.getByRole('link', { name: /create an account/i })).toHaveAttribute('href', '/register');
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
  });
});
