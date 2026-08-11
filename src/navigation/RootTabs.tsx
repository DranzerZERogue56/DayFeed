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
import FlyScreen from '../screens/FlyScreen';
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
  QuillIcon,
  SpeechBubbleIcon,
  type IconProps,
} from '../components/Icons';
import { fonts } from '../theme';

const Tab = createBottomTabNavigator<RootTabParamList>();

const icon =
  (Glyph: (p: IconProps) => React.JSX.Element) =>
  ({ color }: { color: string }) => <Glyph color={color} size={22} />;

// Feed, Flip, Flop and Fly are the four stops in a note's life — capture,
// review, organize, and write the day down — so they're what the swipe bar
// steps between. Agenda and View All are lookups, not part of that flow, so
// the bar hides on them.
const SWIPE_ORDER: Array<keyof RootTabParamList> = ['Feed', 'Flip', 'Flop', 'Fly'];

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
        name="Fly"
        component={FlyScreen}
        options={{ tabBarIcon: icon(QuillIcon), tabBarLabel: 'Fly' }}
      />
      <Tab.Screen
        name="Agenda"
        component={AgendaScreen}
        options={{ tabBarIcon: icon(CalendarIcon), tabBarLabel: 'Agenda' }}
      />
      <Tab.Screen
        name="All"
        component={AllNotesScreen}
        // 'All', not 'View All': the Fly tab makes seven, and at that width
        // Android truncated the longer label to "View ...".
        options={{ tabBarIcon: icon(CardStackIcon), tabBarLabel: 'All' }}
      />
      <Tab.Screen
        name="Vault"
        component={VaultScreen}
        options={{ tabBarIcon: icon(LockIcon), tabBarLabel: 'Vault' }}
      />
    </Tab.Navigator>
  );
}
