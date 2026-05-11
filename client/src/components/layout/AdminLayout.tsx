import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  DoorOpen,
  Swords,
  ChevronDown,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '../../utils/cn';

const adminLinks = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/rooms', label: 'Active Rooms', icon: DoorOpen },
  { to: '/admin/matches', label: 'Matches', icon: Swords },
] as const;

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-primary/10 text-primary'
      : 'text-fg-muted hover:text-fg hover:bg-white/5',
  );

export const AdminLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex flex-1">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-border bg-surface/50 p-4 gap-1">
        <div className="flex items-center gap-2 px-3 py-2 mb-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold text-fg">Admin Panel</span>
        </div>
        {adminLinks.map(({ to, label, icon: Icon, ...rest }) => (
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
            <ShieldCheck className="h-4 w-4 text-primary" />
            Admin Panel
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
            {adminLinks.map(({ to, label, icon: Icon, ...rest }) => (
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
