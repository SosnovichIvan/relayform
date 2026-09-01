'use client';

import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('relayformTheme', theme);
  }, [theme]);
  return <button className="rounded-lg border border-[var(--color-border-default)] px-3 py-2 text-sm" type="button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}</button>;
}
