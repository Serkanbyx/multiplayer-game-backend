import { useRef, useCallback, useEffect } from 'react';
import { usePreferences } from '../context/PreferencesContext';

type SoundName = 'turn' | 'win' | 'lose' | 'click';

const SOUND_PATHS: Record<SoundName, string> = {
  turn: '/sounds/turn.mp3',
  win: '/sounds/win.mp3',
  lose: '/sounds/lose.mp3',
  click: '/sounds/click.mp3',
};

export const useSounds = () => {
  const { preferences } = usePreferences();
  const audioCache = useRef<Map<SoundName, HTMLAudioElement>>(new Map());

  /* Preload all sound files */
  useEffect(() => {
    const entries = Object.entries(SOUND_PATHS) as [SoundName, string][];
    for (const [name, path] of entries) {
      if (!audioCache.current.has(name)) {
        const audio = new Audio(path);
        audio.preload = 'auto';
        audioCache.current.set(name, audio);
      }
    }
  }, []);

  const play = useCallback(
    (name: SoundName) => {
      if (!preferences.sounds) return;

      const audio = audioCache.current.get(name);
      if (!audio) return;

      audio.volume = preferences.soundVolume;
      audio.currentTime = 0;
      audio.play().catch(() => {
        /* autoplay blocked by browser — silently ignore */
      });
    },
    [preferences.sounds, preferences.soundVolume],
  );

  return { play };
};
