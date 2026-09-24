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
import { useTheme, withTabAccent } from '../hooks/ThemeContext';
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

// Every tab gets its own color inside its screen as well as on its icon.
const FeedTab = withTabAccent(FeedScreen, 'tabFeed');
const FlipTab = withTabAccent(FlipScreen, 'tabFlip');
const FlopTab = withTabAccent(FlopStack, 'tabFlop');
const FlyTab = withTabAccent(FlyScreen, 'tabFly');
const AgendaTab = withTabAccent(AgendaScreen, 'tabAgenda');
const AllTab = withTabAccent(AllNotesScreen, 'tabAll');
const VaultTab = withTabAccent(VaultScreen, 'tabVault');

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
      {/* Each tab takes its own color from the active theme's scheme, so the
          tab you're on is recognizable without reading it. */}
      <Tab.Screen
        name="Feed"
        component={FeedTab}
        options={{
          tabBarIcon: icon(SpeechBubbleIcon),
          tabBarLabel: 'Feed',
          tabBarActiveTintColor: colors.tabFeed,
        }}
      />
      <Tab.Screen
        name="Flip"
        component={FlipTab}
        options={{
          tabBarIcon: icon(OpenBookIcon),
          tabBarLabel: 'Flip',
          tabBarActiveTintColor: colors.tabFlip,
        }}
      />
      {/* Flop is its own world: a stack, not a screen, so it can drill in. */}
      <Tab.Screen
        name="Flop"
        component={FlopTab}
        options={{
          tabBarIcon: icon(BookStackIcon),
          tabBarLabel: 'Flop',
          tabBarActiveTintColor: colors.tabFlop,
        }}
      />
      <Tab.Screen
        name="Fly"
        component={FlyTab}
        options={{
          tabBarIcon: icon(QuillIcon),
          tabBarLabel: 'Fly',
          tabBarActiveTintColor: colors.tabFly,
        }}
      />
      <Tab.Screen
        name="Agenda"
        component={AgendaTab}
        options={{
          tabBarIcon: icon(CalendarIcon),
          tabBarLabel: 'Agenda',
          tabBarActiveTintColor: colors.tabAgenda,
        }}
      />
      <Tab.Screen
        name="All"
        component={AllTab}
        // 'All', not 'View All': the Fly tab makes seven, and at that width
        // Android truncated the longer label to "View ...".
        options={{
          tabBarIcon: icon(CardStackIcon),
          tabBarLabel: 'All',
          tabBarActiveTintColor: colors.tabAll,
        }}
      />
      <Tab.Screen
        name="Vault"
        component={VaultTab}
        options={{
          tabBarIcon: icon(LockIcon),
          tabBarLabel: 'Vault',
          tabBarActiveTintColor: colors.tabVault,
        }}
      />
    </Tab.Navigator>
  );
}
