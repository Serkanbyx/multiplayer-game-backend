import { Sun, Moon, Monitor, Type, Volume2 } from 'lucide-react';
import { usePreferences } from '../../context/PreferencesContext';
import { SelectableCard, ToggleSwitch } from '../../components/ui';
import type { UserPreferences } from '@mpg/shared/types/user';

type ThemeOption = UserPreferences['theme'];
type FontSizeOption = UserPreferences['fontSize'];

const themeOptions: { value: ThemeOption; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

const fontSizeOptions: { value: FontSizeOption; label: string; sample: string }[] = [
  { value: 'small', label: 'Small', sample: 'Aa' },
  { value: 'medium', label: 'Medium', sample: 'Aa' },
  { value: 'large', label: 'Large', sample: 'Aa' },
];

const fontSizeClasses: Record<FontSizeOption, string> = {
  small: 'text-sm',
  medium: 'text-base',
  large: 'text-lg',
};

const AppearanceSettings = () => {
  const { preferences, setPreferences } = usePreferences();

  const handleThemeChange = (theme: ThemeOption) => {
    setPreferences({ theme });
  };

  const handleFontSizeChange = (fontSize: FontSizeOption) => {
    setPreferences({ fontSize });
  };

  const handleAnimationsChange = (animations: boolean) => {
    setPreferences({ animations });
  };

  const handleSoundsChange = (sounds: boolean) => {
    setPreferences({ sounds });
  };

  const handleSoundVolumeChange = (soundVolume: number) => {
    setPreferences({ soundVolume });
  };

  return (
    <div className="max-w-lg space-y-10">
      <div>
        <h1 tabIndex={-1} className="text-2xl font-bold text-fg focus:outline-none">Appearance</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Customize how the app looks and feels.
        </p>
      </div>

      {/* Theme */}
      <section className="space-y-3">
        <label className="text-sm font-medium text-fg">Theme</label>
        <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label="Theme selection">
          {themeOptions.map(({ value, label, icon: Icon }) => (
            <SelectableCard
              key={value}
              selected={preferences.theme === value}
              onSelect={() => handleThemeChange(value)}
            >
              <Icon className="h-6 w-6" />
              <span className="text-sm font-medium">{label}</span>
            </SelectableCard>
          ))}
        </div>
      </section>

      {/* Font Size */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Type className="h-4 w-4 text-fg-muted" />
          <label className="text-sm font-medium text-fg">Font Size</label>
        </div>
        <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label="Font size selection">
          {fontSizeOptions.map(({ value, label, sample }) => (
            <SelectableCard
              key={value}
              selected={preferences.fontSize === value}
              onSelect={() => handleFontSizeChange(value)}
            >
              <span className={`font-bold ${fontSizeClasses[value]}`}>{sample}</span>
              <span className="text-sm font-medium">{label}</span>
            </SelectableCard>
          ))}
        </div>
      </section>

      {/* Toggles */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-fg">Preferences</h2>
        <div className="space-y-4 rounded-lg border border-border bg-surface/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-fg">Animations</p>
              <p className="text-xs text-fg-muted">Enable or disable UI animations</p>
            </div>
            <ToggleSwitch
              checked={preferences.animations}
              onChange={handleAnimationsChange}
            />
          </div>

          <div className="border-t border-border" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-fg">Sounds</p>
              <p className="text-xs text-fg-muted">Play sound effects for game events</p>
            </div>
            <ToggleSwitch
              checked={preferences.sounds}
              onChange={handleSoundsChange}
            />
          </div>

          {preferences.sounds && (
            <>
              <div className="border-t border-border" />

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-fg-muted" />
                  <label className="text-sm font-medium text-fg">
                    Sound Volume
                  </label>
                  <span className="ml-auto text-xs text-fg-muted tabular-nums">
                    {Math.round((preferences.soundVolume ?? 0.7) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={preferences.soundVolume ?? 0.7}
                  onChange={(e) => handleSoundVolumeChange(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                  aria-label="Sound volume"
                />
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default AppearanceSettings;
