import { useCallback, useEffect } from 'react';
import { usePreferences } from '../context/PreferencesContext';
import { playSynthSound, type SynthSoundName } from '../utils/soundSynth';

export type SoundName = SynthSoundName;

const MP3_SOUNDS: Partial<Record<SoundName, string>> = {
  click: '/sounds/click.mp3',
  turn: '/sounds/turn.mp3',
  move: '/sounds/move.mp3',
  win: '/sounds/win.mp3',
  lose: '/sounds/lose.mp3',
  draw: '/sounds/draw.mp3',
  chat: '/sounds/chat.mp3',
  'match-found': '/sounds/match-found.mp3',
};

const SYNTH_ONLY_SOUNDS = new Set<SoundName>(['hit', 'miss', 'sunk', 'deploy']);

const audioCache: Map<string, HTMLAudioElement> = new Map();
let preloaded = false;

const preloadAll = (): void => {
  if (preloaded || typeof window === 'undefined') return;
  preloaded = true;
  for (const path of Object.values(MP3_SOUNDS)) {
    if (!path || audioCache.has(path)) continue;
    const audio = new Audio(path);
    audio.preload = 'auto';
    audioCache.set(path, audio);
  }
};

const getAudio = (path: string): HTMLAudioElement => {
  let audio = audioCache.get(path);
  if (!audio) {
    audio = new Audio(path);
    audio.preload = 'auto';
    audioCache.set(path, audio);
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

      const volume = volumeOverride ?? preferences.soundVolume ?? 0.7;

      if (SYNTH_ONLY_SOUNDS.has(name)) {
        playSynthSound(name, volume);
        return;
      }

      const path = MP3_SOUNDS[name];
      if (!path) {
        playSynthSound(name, volume);
        return;
      }

      const audio = getAudio(path);
      audio.currentTime = 0;
      audio.volume = volume;
      void audio.play().catch(() => {
        playSynthSound(name, volume);
      });
    },
    [preferences.sounds, preferences.soundVolume],
  );

  return { play };
};
