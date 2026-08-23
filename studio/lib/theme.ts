import { useCallback, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'lenticard-theme';

function systemTheme(): Theme {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
}

function stored(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    // Private windows and blocked site data both throw here.
    return null;
  }
}

/**
 * Swaps the theme behind a lenticular wipe.
 *
 * The View Transitions API screenshots the old and new pages for us, so the
 * flip is done by masking the incoming snapshot with a repeating gradient whose
 * lit band widens from nothing to the full pitch — which is exactly what you
 * see when a lenticular card rotates past its switch angle. Browsers without
 * the API just get the swap.
 */
export function useTheme(): {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
} {
  const [theme, setThemeState] = useState<Theme>(() => stored() ?? systemTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* Nothing to do — the theme still applies for this session. */
    }
  }, [theme]);

  // Follow the OS only while the user has not made a choice of their own.
  useEffect(() => {
    if (stored() || typeof matchMedia !== 'function') return;
    const query = matchMedia('(prefers-color-scheme: light)');
    const onChange = () => setThemeState(query.matches ? 'light' : 'dark');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    const reduced =
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Firefox has no View Transitions yet, and a reduced-motion reader has
    // asked not to be swept at — both just get the swap.
    if (typeof document.startViewTransition !== 'function' || reduced) {
      setThemeState(next);
      return;
    }

    document.documentElement.dataset.flipping = 'true';
    const transition = document.startViewTransition(() => {
      // React batches by default, but the transition snapshots the DOM as soon
      // as this callback returns — so the update has to land synchronously.
      flushSync(() => setThemeState(next));
      document.documentElement.dataset.theme = next;
    });
    void transition.finished.finally(() => {
      delete document.documentElement.dataset.flipping;
    });
  }, []);

  const toggle = useCallback(
    () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    [theme, setTheme],
  );

  return { theme, setTheme, toggle };
}
