import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import FeedScreen from '../screens/FeedScreen';
import FlipScreen from '../screens/FlipScreen';
import AllNotesScreen from '../screens/AllNotesScreen';
import AgendaScreen from '../screens/AgendaScreen';
import FlopStack from './FlopStack';
import type { RootTabParamList } from './types';
import { colors, fonts } from '../theme';

const Tab = createBottomTabNavigator<RootTabParamList>();

const icon = (glyph: string) => ({ color }: { color: string }) =>
  <Text style={{ fontSize: 20, color }}>{glyph}</Text>;

export default function RootTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: {
          fontFamily: fonts.display,
          fontSize: 11,
          letterSpacing: 0.3,
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.divider,
        },
      }}
    >
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{ tabBarIcon: icon('💬'), tabBarLabel: 'Feed' }}
      />
      <Tab.Screen
        name="Flip"
        component={FlipScreen}
        options={{ tabBarIcon: icon('📖'), tabBarLabel: 'Flip' }}
      />
      {/* Flop is its own world: a stack, not a screen, so it can drill in. */}
      <Tab.Screen
        name="Flop"
        component={FlopStack}
        options={{ tabBarIcon: icon('📚'), tabBarLabel: 'Flop' }}
      />
      <Tab.Screen
        name="Agenda"
        component={AgendaScreen}
        options={{ tabBarIcon: icon('🗓'), tabBarLabel: 'Agenda' }}
      />
      <Tab.Screen
        name="All"
        component={AllNotesScreen}
        options={{ tabBarIcon: icon('🗂'), tabBarLabel: 'View All' }}
      />
    </Tab.Navigator>
  );
}
