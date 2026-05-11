import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  User,
  KeyRound,
  Palette,
  Bell,
  ChevronDown,
  Settings,
} from 'lucide-react';
import { cn } from '../../utils/cn';

const settingsLinks = [
  { to: '/settings', label: 'Profile', icon: User, end: true },
  { to: '/settings/account', label: 'Account', icon: KeyRound },
  { to: '/settings/appearance', label: 'Appearance', icon: Palette },
  { to: '/settings/notifications', label: 'Notifications', icon: Bell },
] as const;

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-primary/10 text-primary'
      : 'text-fg-muted hover:text-fg hover:bg-white/5',
  );

export const SettingsLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex flex-1">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-border bg-surface/50 p-4 gap-1">
        <div className="flex items-center gap-2 px-3 py-2 mb-2">
          <Settings className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold text-fg">Settings</span>
        </div>
        {settingsLinks.map(({ to, label, icon: Icon, ...rest }) => (
          <NavLink key={to} to={to} className={linkClass} {...rest}>
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </aside>

      {/* Mobile dropdown */}
      <div className="md:hidden w-full">
        <button
          onClick={() => setMobileOpen((p) => !p)}
          className="flex w-full items-center justify-between border-b border-border bg-surface/50 px-4 py-3 text-sm font-medium text-fg"
        >
          <span className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            Settings
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-fg-muted transition-transform',
              mobileOpen && 'rotate-180',
            )}
          />
        </button>
        {mobileOpen && (
          <div className="border-b border-border bg-surface/80 px-2 py-2 space-y-0.5 animate-in slide-in-from-top-1">
            {settingsLinks.map(({ to, label, icon: Icon, ...rest }) => (
              <NavLink
                key={to}
                to={to}
                className={linkClass}
                onClick={() => setMobileOpen(false)}
                {...rest}
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </div>
    </div>
  );
};
