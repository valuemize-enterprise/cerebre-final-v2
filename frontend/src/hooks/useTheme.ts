'use client';
import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeColors {
  text: string;
  textMuted: string;
  grid: string;
  background: string;
  border: string;
}

const LIGHT: ThemeColors = {
  text: '#111827',
  textMuted: '#6b7280',
  grid: 'rgba(0,0,0,0.06)',
  background: '#ffffff',
  border: 'rgba(0,0,0,0.1)',
};

const DARK: ThemeColors = {
  text: '#f9fafb',
  textMuted: '#9ca3af',
  grid: 'rgba(255,255,255,0.06)',
  background: '#111827',
  border: 'rgba(255,255,255,0.1)',
};

/**
 * Returns the current theme and chart-safe color tokens.
 * Use this in Recharts/Chart.js components that cannot read CSS variables.
 *
 * @example
 * const { isDark, colors } = useTheme();
 * <XAxis tick={{ fill: colors.textMuted, fontSize: 11 }} />
 */
export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setTheme(mq.matches ? 'dark' : 'light');

    const handler = (e: MediaQueryListEvent) =>
      setTheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return {
    theme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    colors: theme === 'dark' ? DARK : LIGHT,
  };
};
