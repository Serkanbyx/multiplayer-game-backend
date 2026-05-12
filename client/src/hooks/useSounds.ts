import { useCallback, useEffect } from 'react';
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

/* Module-scoped cache: single Audio instance per sound, shared across every
   useSounds() consumer. Previously each component instantiated its own
   HTMLAudioElement, causing N parallel network fetches for the same file. */
const audioCache: Map<SoundName, HTMLAudioElement> = new Map();
let preloaded = false;

const preloadAll = (): void => {
  if (preloaded || typeof window === 'undefined') return;
  preloaded = true;
  for (const name of Object.keys(SOUND_PATHS) as SoundName[]) {
    if (!audioCache.has(name)) {
      const audio = new Audio(SOUND_PATHS[name]);
      audio.preload = 'auto';
      audioCache.set(name, audio);
    }
  }
};

const getAudio = (name: SoundName): HTMLAudioElement => {
  let audio = audioCache.get(name);
  if (!audio) {
    audio = new Audio(SOUND_PATHS[name]);
    audio.preload = 'auto';
    audioCache.set(name, audio);
  }
  return audio;
};

export const useSounds = () => {
  const { preferences } = usePreferences();

  useEffect(() => {
    preloadAll();
  }, []);

  const play = useCallback(
    (name: SoundName, volumeOverride?: number): void => {
      if (!preferences.sounds) return;

      const audio = getAudio(name);
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
