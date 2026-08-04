import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, type Theme } from '@react-navigation/native';
import { NotesProvider } from './src/hooks/NotesContext';
import { FlopProvider } from './src/hooks/FlopContext';
import { AudioPlayerProvider } from './src/hooks/AudioPlayerContext';
import { ThemeProvider, useTheme } from './src/hooks/ThemeContext';
import RootTabs from './src/navigation/RootTabs';
import BootSplash from './src/components/BootSplash';
import { initDb } from './src/db';
import { sweepExpiredNotes } from './src/lib/expirySweep';
import { seedIfEmpty } from './src/db/seed';

// Before first render: keep the native splash up until BootSplash has painted,
// so there is no bare window between the two.
void SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden — harmless, and not worth failing a launch over.
});

// Inside ThemeProvider so navigation chrome and the status bar follow the mode.
function ThemedApp() {
  const { colors, mode } = useTheme();

  const navTheme: Theme = {
    ...DefaultTheme,
    dark: mode === 'dark',
    colors: {
      ...DefaultTheme.colors,
      background: colors.bg,
      card: colors.surface,
      text: colors.text,
      border: colors.divider,
      primary: colors.accent,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <RootTabs />
    </NavigationContainer>
  );
}

export default function App() {
  const [booted, setBooted] = useState(false);
  const [bootDone, setBootDone] = useState(false);

  useEffect(() => {
    (async () => {
      await initDb();
      // Clear expired notes BEFORE the app tree mounts, so a note that outlived
      // its 11:59 PM while the app was closed is never briefly visible.
      await sweepExpiredNotes();
      // Dev convenience: populate a few notes on first run only.
      if (__DEV__) await seedIfEmpty();
      setBooted(true);
    })();
  }, []);

  const onBootDone = useCallback(() => setBootDone(true), []);

  // The app tree mounts as soon as the database is open, while BootSplash is
  // still fully opaque — so the mount is invisible, and the Feed is laid out
  // behind the cover by the time it opens onto it.
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        {booted && (
          <NotesProvider>
            <FlopProvider>
              <AudioPlayerProvider>
                <ThemedApp />
              </AudioPlayerProvider>
            </FlopProvider>
          </NotesProvider>
        )}
        {!bootDone && <BootSplash ready={booted} onDone={onBootDone} />}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
