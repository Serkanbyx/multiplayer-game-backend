import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type { UserPreferences } from '@mpg/shared/types/user';
import { updatePreferences as apiUpdatePreferences } from '../api/userService';
import { useAuth } from './AuthContext';

interface PreferencesContextValue {
  preferences: UserPreferences;
  setPreferences: (patch: Partial<UserPreferences>) => Promise<void>;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  fontSize: 'medium',
  animations: true,
  sounds: true,
  soundVolume: 0.7,
  language: 'en',
  notifications: { matchInvite: true, rematch: true },
  privacy: { showStats: true, showOnLeaderboard: true },
};

const STORAGE_KEY = 'guest_preferences';

const readGuestPrefs = (): UserPreferences => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) } : { ...DEFAULT_PREFERENCES };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export const PreferencesProvider = ({ children }: { children: ReactNode }) => {
  const { user, isGuest } = useAuth();
  const [preferences, _setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);

  /* Hydrate from getMe (registered) or localStorage (guest) */
  useEffect(() => {
    if (!user) {
      _setPreferences({ ...DEFAULT_PREFERENCES });
      return;
    }

    if (isGuest()) {
      _setPreferences(readGuestPrefs());
    }
  }, [user, isGuest]);

  /**
   * Hydrate registered-user preferences after AuthContext
   * resolves getMe (the full OwnUser with preferences).
   */
  useEffect(() => {
    if (!user || isGuest()) return;

    const fetchPrefs = async () => {
      try {
        const { getMe } = await import('../api/authService');
        const me = await getMe();
        _setPreferences({ ...DEFAULT_PREFERENCES, ...me.preferences });
      } catch {
        /* fallback to defaults if network fails */
      }
    };
    fetchPrefs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  const setPreferences = useCallback(
    async (patch: Partial<UserPreferences>) => {
      _setPreferences((prev) => {
        const next = { ...prev, ...patch };

        if (isGuest()) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          } catch {
            /* quota exceeded */
          }
        }

        return next;
      });

      if (user && !isGuest()) {
        await apiUpdatePreferences(patch);
      }
    },
    [user, isGuest],
  );

  /* Apply theme class to <html> */
  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = (theme: 'light' | 'dark') => {
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
    };

    if (preferences.theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mq.matches ? 'dark' : 'light');

      const onChange = (e: MediaQueryListEvent) =>
        applyTheme(e.matches ? 'dark' : 'light');
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }

    applyTheme(preferences.theme);
  }, [preferences.theme]);

  /* Apply font-size class on <html> */
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('font-small', 'font-medium', 'font-large');
    root.classList.add(`font-${preferences.fontSize}`);
  }, [preferences.fontSize]);

  /* Apply animations toggle via CSS variable */
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--animations-enabled',
      preferences.animations ? '1' : '0',
    );
  }, [preferences.animations]);

  const value = useMemo<PreferencesContextValue>(
    () => ({ preferences, setPreferences }),
    [preferences, setPreferences],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = (): PreferencesContextValue => {
  const ctx = useContext(PreferencesContext);
  if (!ctx)
    throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
};
