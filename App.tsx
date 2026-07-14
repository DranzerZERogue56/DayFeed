import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, type Theme } from '@react-navigation/native';
import { NotesProvider } from './src/hooks/NotesContext';
import { AudioPlayerProvider } from './src/hooks/AudioPlayerContext';
import RootTabs from './src/navigation/RootTabs';
import { initDb } from './src/db';
import { seedIfEmpty } from './src/db/seed';
import { colors, fonts } from './src/theme';

const navTheme: Theme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.divider,
    primary: colors.accent,
  },
};

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

  if (!booted) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NotesProvider>
        <AudioPlayerProvider>
          <NavigationContainer theme={navTheme}>
            <StatusBar style="dark" />
            <RootTabs />
          </NavigationContainer>
        </AudioPlayerProvider>
      </NotesProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
