import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, type Theme } from '@react-navigation/native';
import { NotesProvider } from './src/hooks/NotesContext';
import { FlopProvider } from './src/hooks/FlopContext';
import { AudioPlayerProvider } from './src/hooks/AudioPlayerContext';
import { ThemeProvider, useTheme } from './src/hooks/ThemeContext';
import RootTabs from './src/navigation/RootTabs';
import { initDb } from './src/db';
import { seedIfEmpty } from './src/db/seed';

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

function Boot() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  );
}

export default function App() {
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    (async () => {
      await initDb();
      // Dev convenience: populate a few notes on first run only.
      if (__DEV__) await seedIfEmpty();
      setBooted(true);
    })();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        {!booted ? (
          <Boot />
        ) : (
          <NotesProvider>
            <FlopProvider>
              <AudioPlayerProvider>
                <ThemedApp />
              </AudioPlayerProvider>
            </FlopProvider>
          </NotesProvider>
        )}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
