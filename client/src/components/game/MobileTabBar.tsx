import { cn } from '../../utils/cn';
import { Users, Gamepad2, MessageSquare } from 'lucide-react';

export type MobileTab = 'players' | 'game' | 'chat';

type MobileTabBarProps = {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  unreadChat?: boolean;
};

const TABS: { id: MobileTab; label: string; icon: typeof Users }[] = [
  { id: 'players', label: 'Players', icon: Users },
  { id: 'game', label: 'Game', icon: Gamepad2 },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
];

export const MobileTabBar = ({ activeTab, onTabChange, unreadChat }: MobileTabBarProps) => (
  <div className="flex lg:hidden border-b border-border bg-surface/80 backdrop-blur-sm">
    {TABS.map(({ id, label, icon: Icon }) => (
      <button
        key={id}
        onClick={() => onTabChange(id)}
        className={cn(
          'relative flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors min-h-[44px]',
          activeTab === id
            ? 'text-primary border-b-2 border-primary'
            : 'text-fg-muted hover:text-fg',
        )}
      >
        <Icon className="h-4 w-4" />
        {label}
        {id === 'chat' && unreadChat && activeTab !== 'chat' && (
          <span className="absolute top-2 right-1/4 h-2 w-2 rounded-full bg-primary" />
        )}
      </button>
    ))}
  </div>
);
