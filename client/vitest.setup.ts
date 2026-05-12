import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

/* Stub window.matchMedia for jsdom */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

/* Stub Audio for sound hooks */
vi.stubGlobal(
  'Audio',
  vi.fn().mockImplementation(() => ({
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    preload: '',
    currentTime: 0,
    volume: 1,
  })),
);

/* Stub scrollIntoView */
Element.prototype.scrollIntoView = vi.fn();

/* Global mock for useSounds — Button and game components depend on PreferencesProvider via useSounds */
vi.mock('./src/hooks/useSounds', () => ({
  useSounds: () => ({ play: vi.fn() }),
}));
