import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { StyleSheet } from 'react-native';
import { getSetting, setSetting } from '../db/settings';
import {
  darkColors,
  lightColors,
  relationStyleDark,
  relationStyleLight,
  type ColorPalette,
  type RelationStyleMap,
} from '../theme';

export type ThemeMode = 'light' | 'dark';

const THEME_KEY = 'themeMode';

interface ThemeValue {
  mode: ThemeMode;
  colors: ColorPalette;
  relationStyle: RelationStyleMap;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');

  // Restore the persisted choice; default stays light until the read lands
  // (a one-frame flash at worst — the app boots behind a spinner anyway).
  useEffect(() => {
    getSetting(THEME_KEY).then((v) => {
      if (v === 'dark') setMode('dark');
    });
  }, []);

  const toggleMode = useCallback(() => {
    setMode((m) => {
      const next: ThemeMode = m === 'light' ? 'dark' : 'light';
      void setSetting(THEME_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo<ThemeValue>(
    () => ({
      mode,
      colors: mode === 'dark' ? darkColors : lightColors,
      relationStyle: mode === 'dark' ? relationStyleDark : relationStyleLight,
      toggleMode,
    }),
    [mode, toggleMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}

/**
 * Themed replacement for module-scope StyleSheet.create: pass a factory over the
 * active palette; the sheet is rebuilt only when the theme flips.
 *
 *   const styles = useStyles(makeStyles);            // component body
 *   const makeStyles = (colors: ColorPalette) => StyleSheet.create({ ... });
 */
export function useStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (colors: ColorPalette) => T,
): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [factory, colors]);
}
