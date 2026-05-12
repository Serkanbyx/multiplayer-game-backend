import { useRef, useCallback, useEffect } from 'react';
import { usePreferences } from '../context/PreferencesContext';

type SoundName = 'click' | 'turn' | 'move' | 'win' | 'lose' | 'draw' | 'chat' | 'match-found';

const SOUND_PATHS: Record<SoundName, string> = {
  click: '/sounds/click.mp3',
  turn: '/sounds/turn.mp3',
  move: '/sounds/move.mp3',
  win: '/sounds/win.mp3',
  lose: '/sounds/lose.mp3',
  draw: '/sounds/draw.mp3',
  chat: '/sounds/chat.mp3',
  'match-found': '/sounds/match-found.mp3',
};

export const useSounds = () => {
  const { preferences } = usePreferences();
  const cacheRef = useRef<Map<SoundName, HTMLAudioElement>>(new Map());

  useEffect(() => {
    const entries = Object.entries(SOUND_PATHS) as [SoundName, string][];
    for (const [name, path] of entries) {
      if (!cacheRef.current.has(name)) {
        const audio = new Audio(path);
        audio.preload = 'auto';
        cacheRef.current.set(name, audio);
      }
    }
  }, []);

  const play = useCallback(
    (name: SoundName, volumeOverride?: number): void => {
      if (!preferences.sounds) return;

      let audio = cacheRef.current.get(name);
      if (!audio) {
        audio = new Audio(`/sounds/${name}.mp3`);
        audio.preload = 'auto';
        cacheRef.current.set(name, audio);
      }

      audio.currentTime = 0;
      audio.volume = volumeOverride ?? preferences.soundVolume ?? 0.7;
      void audio.play().catch(() => {
        /* autoplay policy may block — silent fail */
      });
    },
    [preferences.sounds, preferences.soundVolume],
  );

  return { play };
};
