'use client';

import { useEffect } from 'react';
import { applyAdminTheme, THEME_KEY } from '@/hooks/useAdminTheme';

export default function ThemeBootstrap() {
  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_KEY);
    const theme =
      stored === 'dark' || stored === 'light'
        ? stored
        : window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';

    applyAdminTheme(theme);
  }, []);

  return null;
}
