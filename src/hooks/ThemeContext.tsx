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
  accentOrder,
  makePalette,
  makeRelationStyle,
  type AccentId,
  type ColorPalette,
  type RelationStyleMap,
} from '../theme';

export type ThemeMode = 'light' | 'dark';

const THEME_KEY = 'themeMode';
const ACCENT_KEY = 'themeAccent';

function isAccentId(v: string | null): v is AccentId {
  return !!v && (accentOrder as string[]).includes(v);
}

interface ThemeValue {
  mode: ThemeMode;
  accentId: AccentId;
  colors: ColorPalette;
  relationStyle: RelationStyleMap;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
  setAccentId: (id: AccentId) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');
  const [accentId, setAccentIdState] = useState<AccentId>('bronze');

  // Restore the persisted choices; defaults stay light/bronze until the read
  // lands (a one-frame flash at worst — the app boots behind a spinner anyway).
  useEffect(() => {
    getSetting(THEME_KEY).then((v) => {
      if (v === 'dark') setMode('dark');
    });
    getSetting(ACCENT_KEY).then((v) => {
      if (isAccentId(v)) setAccentIdState(v);
    });
  }, []);

  const toggleMode = useCallback(() => {
    setMode((m) => {
      const next: ThemeMode = m === 'light' ? 'dark' : 'light';
      void setSetting(THEME_KEY, next);
      return next;
    });
  }, []);

  const setModeAndSave = useCallback((next: ThemeMode) => {
    setMode(next);
    void setSetting(THEME_KEY, next);
  }, []);

  const setAccentId = useCallback((id: AccentId) => {
    setAccentIdState(id);
    void setSetting(ACCENT_KEY, id);
  }, []);

  const value = useMemo<ThemeValue>(
    () => ({
      mode,
      accentId,
      colors: makePalette(mode, accentId),
      relationStyle: makeRelationStyle(mode, accentId),
      toggleMode,
      setMode: setModeAndSave,
      setAccentId,
    }),
    [mode, accentId, toggleMode, setModeAndSave, setAccentId],
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
