import { Shield } from 'lucide-react';
import { usePreferences } from '../../context/PreferencesContext';
import { ToggleSwitch } from '../../components/ui';

const PrivacySettings = () => {
  const { preferences, setPreferences } = usePreferences();

  const handleShowStatsChange = (showStats: boolean) => {
    setPreferences({
      privacy: { ...preferences.privacy, showStats },
    });
  };

  const handleShowOnLeaderboardChange = (showOnLeaderboard: boolean) => {
    setPreferences({
      privacy: { ...preferences.privacy, showOnLeaderboard },
    });
  };

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">Privacy</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Control what others can see about your profile.
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-medium text-fg">Visibility</h2>
        </div>

        <div className="space-y-4 rounded-lg border border-border bg-surface/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-fg">Show Stats on Profile</p>
              <p className="text-xs text-fg-muted">
                Allow other players to see your win/loss statistics
              </p>
            </div>
            <ToggleSwitch
              checked={preferences.privacy.showStats}
              onChange={handleShowStatsChange}
            />
          </div>

          <div className="border-t border-border" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-fg">Show on Leaderboard</p>
              <p className="text-xs text-fg-muted">
                Allow your name to appear on the public leaderboard
              </p>
            </div>
            <ToggleSwitch
              checked={preferences.privacy.showOnLeaderboard}
              onChange={handleShowOnLeaderboardChange}
            />
          </div>
        </div>
      </section>
    </div>
  );
};

export default PrivacySettings;
