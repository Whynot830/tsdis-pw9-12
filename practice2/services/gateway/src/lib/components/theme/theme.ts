import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Theme = 'light' | 'dark' | 'system';
const STORAGE_KEY = 'theme';

function getInitial(): Theme {
  if (!browser) return 'system';
  const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  return 'system';
}

function apply(theme: Theme) {
  if (!browser) return;
  const root = document.documentElement;
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

function createThemeStore() {
  const { subscribe, set, update } = writable<Theme>(getInitial());

  if (browser) {
    subscribe((theme) => {
      localStorage.setItem(STORAGE_KEY, theme);
      apply(theme);
    });

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      const currentTheme = getInitial();
      if (currentTheme === 'system') {
        apply('system');
      }
    };
    mediaQuery.addEventListener('change', listener);
  }

  return {
    subscribe,
    set,
    toggle: () => update((t) => (t === 'light' ? 'dark' : t === 'dark' ? 'system' : 'light')),
    useSystem: () => set('system')
  };
}

export const theme = createThemeStore();
