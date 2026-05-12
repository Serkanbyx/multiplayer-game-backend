import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Focuses the page's <h1> element on route change so screen readers
 * announce the new page context. The target <h1> should have
 * `tabindex="-1"` to receive programmatic focus without adding it
 * to the natural tab order.
 */
export const usePageFocus = () => {
  const { pathname } = useLocation();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timer = requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>('h1[tabindex="-1"]');
      heading?.focus({ preventScroll: false });
    });

    return () => cancelAnimationFrame(timer);
  }, [pathname]);
};
