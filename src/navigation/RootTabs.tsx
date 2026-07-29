import React from 'react';
import { View } from 'react-native';
import {
  createBottomTabNavigator,
  BottomTabBar,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import FeedScreen from '../screens/FeedScreen';
import FlipScreen from '../screens/FlipScreen';
import AllNotesScreen from '../screens/AllNotesScreen';
import AgendaScreen from '../screens/AgendaScreen';
import FlopStack from './FlopStack';
import VaultScreen from '../screens/VaultScreen';
import type { RootTabParamList } from './types';
import { useTheme } from '../hooks/ThemeContext';
import TabSwipeBar from '../components/TabSwipeBar';
import {
  BookStackIcon,
  CalendarIcon,
  CardStackIcon,
  LockIcon,
  OpenBookIcon,
  SpeechBubbleIcon,
  type IconProps,
} from '../components/Icons';
import { fonts } from '../theme';

const Tab = createBottomTabNavigator<RootTabParamList>();

const icon =
  (Glyph: (p: IconProps) => React.JSX.Element) =>
  ({ color }: { color: string }) => <Glyph color={color} size={22} />;

// Feed, Flip, and Flop are the three stops in a note's life — capture,
// review, organize — so they're what the swipe bar steps between. Agenda and
// View All are lookups, not part of that flow, so the bar hides on them.
const SWIPE_ORDER: Array<keyof RootTabParamList> = ['Feed', 'Flip', 'Flop'];

// Wraps the default tab bar with a swipe strip sitting just above it.
function TabBarWithSwipe(props: BottomTabBarProps) {
  const { state, navigation } = props;
  const activeName = state.routes[state.index].name as (typeof SWIPE_ORDER)[number];
  const swipeIndex = SWIPE_ORDER.indexOf(activeName);

  return (
    <View>
      {swipeIndex !== -1 && (
        <TabSwipeBar
          activeIndex={swipeIndex}
          count={SWIPE_ORDER.length}
          onNavigate={(index) => navigation.navigate(SWIPE_ORDER[index])}
        />
      )}
      <BottomTabBar {...props} />
    </View>
  );
}

export default function RootTabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBarWithSwipe {...props} />}
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
        options={{ tabBarIcon: icon(SpeechBubbleIcon), tabBarLabel: 'Feed' }}
      />
      <Tab.Screen
        name="Flip"
        component={FlipScreen}
        options={{ tabBarIcon: icon(OpenBookIcon), tabBarLabel: 'Flip' }}
      />
      {/* Flop is its own world: a stack, not a screen, so it can drill in. */}
      <Tab.Screen
        name="Flop"
        component={FlopStack}
        options={{ tabBarIcon: icon(BookStackIcon), tabBarLabel: 'Flop' }}
      />
      <Tab.Screen
        name="Agenda"
        component={AgendaScreen}
        options={{ tabBarIcon: icon(CalendarIcon), tabBarLabel: 'Agenda' }}
      />
      <Tab.Screen
        name="All"
        component={AllNotesScreen}
        options={{ tabBarIcon: icon(CardStackIcon), tabBarLabel: 'View All' }}
      />
      <Tab.Screen
        name="Vault"
        component={VaultScreen}
        options={{ tabBarIcon: icon(LockIcon), tabBarLabel: 'Vault' }}
      />
    </Tab.Navigator>
  );
}
