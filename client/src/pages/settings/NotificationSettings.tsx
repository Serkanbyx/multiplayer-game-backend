import { Bell } from 'lucide-react';
import { usePreferences } from '../../context/PreferencesContext';
import { ToggleSwitch } from '../../components/ui';

const NotificationSettings = () => {
  const { preferences, setPreferences } = usePreferences();

  const handleMatchInviteChange = (matchInvite: boolean) => {
    setPreferences({
      notifications: { ...preferences.notifications, matchInvite },
    });
  };

  const handleRematchChange = (rematch: boolean) => {
    setPreferences({
      notifications: { ...preferences.notifications, rematch },
    });
  };

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h1 tabIndex={-1} className="text-2xl font-bold text-fg focus:outline-none">Notifications</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Choose which notifications you'd like to receive.
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-medium text-fg">Game Notifications</h2>
        </div>

        <div className="space-y-4 rounded-lg border border-border bg-surface/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-fg">Match Invites</p>
              <p className="text-xs text-fg-muted">
                Receive notifications when someone invites you to a match
              </p>
            </div>
            <ToggleSwitch
              checked={preferences.notifications.matchInvite}
              onChange={handleMatchInviteChange}
            />
          </div>

          <div className="border-t border-border" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-fg">Rematch Requests</p>
              <p className="text-xs text-fg-muted">
                Receive notifications when an opponent requests a rematch
              </p>
            </div>
            <ToggleSwitch
              checked={preferences.notifications.rematch}
              onChange={handleRematchChange}
            />
          </div>
        </div>
      </section>
    </div>
  );
};

export default NotificationSettings;
