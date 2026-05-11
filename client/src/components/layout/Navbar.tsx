import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  ChevronDown,
  LogOut,
  User,
  Settings,
  ShieldCheck,
  Trophy,
  Home,
  Gamepad2,
  UserPlus,
  LogIn,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../ui';
import { cn } from '../../utils/cn';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'text-sm font-medium transition-colors hover:text-primary',
    isActive ? 'text-primary' : 'text-fg-muted',
  );

export const Navbar = () => {
  const { user, logout, isAdmin, isGuest } = useAuth();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    setMobileOpen(false);
    navigate('/');
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 text-lg font-bold text-fg hover:text-primary transition-colors"
          >
            <Gamepad2 className="h-6 w-6 text-primary" />
            <span className="hidden sm:inline">MPG</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-6">
            <NavLink to="/" className={navLinkClass} end>
              <span className="flex items-center gap-1.5">
                <Home className="h-4 w-4" />
                Home
              </span>
            </NavLink>
            <NavLink to="/leaderboard" className={navLinkClass}>
              <span className="flex items-center gap-1.5">
                <Trophy className="h-4 w-4" />
                Leaderboard
              </span>
            </NavLink>
          </div>

          {/* Desktop right side */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-fg hover:bg-white/5 transition-colors"
                >
                  <Avatar
                    src={user.avatarUrl ?? null}
                    name={user.displayName}
                    size="xs"
                  />
                  <span className="max-w-[120px] truncate">{user.displayName}</span>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 text-fg-muted transition-transform',
                      dropdownOpen && 'rotate-180',
                    )}
                  />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-1 w-48 rounded-lg border border-border bg-surface shadow-lg py-1 animate-in fade-in slide-in-from-top-1">
                    {!isGuest() && (
                      <Link
                        to="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-fg-muted hover:text-fg hover:bg-white/5 transition-colors"
                      >
                        <User className="h-4 w-4" />
                        My Profile
                      </Link>
                    )}
                    {!isGuest() && (
                      <Link
                        to="/settings"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-fg-muted hover:text-fg hover:bg-white/5 transition-colors"
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                      </Link>
                    )}
                    {isAdmin() && (
                      <Link
                        to="/admin"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-fg-muted hover:text-fg hover:bg-white/5 transition-colors"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        Admin
                      </Link>
                    )}
                    <div className="my-1 border-t border-border" />
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-white/5 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-fg-muted hover:text-fg transition-colors"
                >
                  <LogIn className="h-4 w-4" />
                  Login
                </Link>
                <Link
                  to="/register"
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
                >
                  <UserPlus className="h-4 w-4" />
                  Register
                </Link>
                <Link
                  to="/guest"
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-fg-muted hover:text-fg hover:border-fg-muted transition-colors"
                >
                  <Gamepad2 className="h-4 w-4" />
                  Play as Guest
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen((prev) => !prev)}
            className="md:hidden p-2 text-fg-muted hover:text-fg transition-colors"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-surface animate-in slide-in-from-top-2">
          <div className="px-4 py-3 space-y-1">
            <NavLink
              to="/"
              end
              onClick={closeMobile}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-fg-muted hover:text-fg hover:bg-white/5',
                )
              }
            >
              <Home className="h-4 w-4" />
              Home
            </NavLink>
            <NavLink
              to="/leaderboard"
              onClick={closeMobile}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-fg-muted hover:text-fg hover:bg-white/5',
                )
              }
            >
              <Trophy className="h-4 w-4" />
              Leaderboard
            </NavLink>

            <div className="my-2 border-t border-border" />

            {user ? (
              <>
                <div className="flex items-center gap-2 px-3 py-2">
                  <Avatar
                    src={user.avatarUrl ?? null}
                    name={user.displayName}
                    size="sm"
                  />
                  <span className="text-sm font-medium text-fg truncate">
                    {user.displayName}
                  </span>
                </div>
                {!isGuest() && (
                  <Link
                    to="/profile"
                    onClick={closeMobile}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg-muted hover:text-fg hover:bg-white/5 transition-colors"
                  >
                    <User className="h-4 w-4" />
                    My Profile
                  </Link>
                )}
                {!isGuest() && (
                  <Link
                    to="/settings"
                    onClick={closeMobile}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg-muted hover:text-fg hover:bg-white/5 transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                )}
                {isAdmin() && (
                  <Link
                    to="/admin"
                    onClick={closeMobile}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg-muted hover:text-fg hover:bg-white/5 transition-colors"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Admin
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger hover:bg-white/5 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={closeMobile}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg-muted hover:text-fg hover:bg-white/5 transition-colors"
                >
                  <LogIn className="h-4 w-4" />
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={closeMobile}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  <UserPlus className="h-4 w-4" />
                  Register
                </Link>
                <Link
                  to="/guest"
                  onClick={closeMobile}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg-muted hover:text-fg hover:bg-white/5 transition-colors"
                >
                  <Gamepad2 className="h-4 w-4" />
                  Play as Guest
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
