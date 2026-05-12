import { useState, useEffect, useMemo } from 'react';
import { usePreferences } from '../context/PreferencesContext';

/**
 * Returns `true` only when BOTH user preference allows animations
 * AND the system does NOT prefer reduced motion.
 * Also manages the `no-animations` CSS class on `<html>`.
 */
export const useAnimations = (): boolean => {
  const { preferences } = usePreferences();
  const [prefersReduced, setPrefersReduced] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const enabled = useMemo(
    () => preferences.animations && !prefersReduced,
    [preferences.animations, prefersReduced],
  );

  useEffect(() => {
    document.documentElement.classList.toggle('no-animations', !enabled);
  }, [enabled]);

  return enabled;
};
