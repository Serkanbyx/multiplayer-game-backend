import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AdminRoute } from '../AdminRoute';

const mockUseAuth = vi.fn();

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const renderWithRoute = () =>
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<div>Admin Dashboard</div>} />
        </Route>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/" element={<div>Home Page</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('AdminRoute', () => {
  it('shows spinner while loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      isAdmin: () => false,
    });
    renderWithRoute();

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
  });

  it('redirects to /login when no user', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      isAdmin: () => false,
    });
    renderWithRoute();

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
  });

  it('redirects to / for non-admin user', () => {
    mockUseAuth.mockReturnValue({
      user: { _id: 'u1', displayName: 'Alice', role: 'player', isGuest: false },
      loading: false,
      isAdmin: () => false,
    });
    renderWithRoute();

    expect(screen.getByText('Home Page')).toBeInTheDocument();
    expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
  });

  it('renders outlet for admin user', () => {
    mockUseAuth.mockReturnValue({
      user: { _id: 'u1', displayName: 'Admin', role: 'admin', isGuest: false },
      loading: false,
      isAdmin: () => true,
    });
    renderWithRoute();

    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
  });

  it('redirects guest with admin role (should not happen, but safety check)', () => {
    mockUseAuth.mockReturnValue({
      user: { _id: 'u1', displayName: 'GuestAdmin', role: 'admin', isGuest: true },
      loading: false,
      isAdmin: () => false,
    });
    renderWithRoute();

    expect(screen.getByText('Home Page')).toBeInTheDocument();
    expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
  });
});
