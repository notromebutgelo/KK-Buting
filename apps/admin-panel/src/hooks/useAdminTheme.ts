'use client';

import { useCallback, useEffect, useState } from 'react';

type AdminTheme = 'light' | 'dark';

const THEME_KEY = 'kk-admin-theme';
const THEME_EVENT = 'kk-admin-theme-change';

function systemTheme(): AdminTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredTheme(): AdminTheme {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem(THEME_KEY);
  return stored === 'dark' || stored === 'light' ? stored : systemTheme();
}

export function applyAdminTheme(theme: AdminTheme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}

export function useAdminTheme() {
  const [theme, setThemeState] = useState<AdminTheme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const current = getStoredTheme();
    applyAdminTheme(current);
    setThemeState(current);
    setMounted(true);

    const onChange = () => {
      const next = getStoredTheme();
      applyAdminTheme(next);
      setThemeState(next);
    };

    window.addEventListener(THEME_EVENT, onChange);
    return () => window.removeEventListener(THEME_EVENT, onChange);
  }, []);

  const setTheme = useCallback((next: AdminTheme) => {
    window.localStorage.setItem(THEME_KEY, next);
    applyAdminTheme(next);
    setThemeState(next);
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  return { theme, setTheme, mounted };
}

export { THEME_KEY };
