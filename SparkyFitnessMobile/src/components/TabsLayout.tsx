import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useCSSVariable } from 'uniwind';
import { createIOSNativeHeaderOptions } from '../utils/nativeHeaderItems';
import DashboardScreen from '../screens/DashboardScreen';
import DiaryScreen from '../screens/DiaryScreen';
import LibraryScreen from '../screens/LibraryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import type { TabParamList } from '../types/navigation';
import {
  useBottomTabBarHeight,
  type AppleIcon,
} from 'react-native-bottom-tabs';
import { withErrorBoundary } from './ScreenErrorBoundary';
import ActiveWorkoutBar, {
  setActiveWorkoutBarTabBarHeight,
} from './ActiveWorkoutBar';
import CustomTabBar from './CustomTabBar';
import WhatsNewBanner, {
  WhatsNewBannerContent,
  useWhatsNewBannerState,
} from './WhatsNewBanner';
import { AnnouncementModal } from './AnnouncementModal';
import { useNativeIOSTabsActive } from '../services/nativeTabBarPreference';
import { useHeaderActionColors } from '../hooks/useHeaderActionColors';
import { useTranslation } from 'react-i18next';

// Dashboard is not a visible tab on this fork: it stays mounted out of sight
// (lazy: false) so the jobs it hosts keep running — widget updates, fasting
// and hydration reminders, background water sync.
export const NON_ADD_TABS = ['Diary', 'Library', 'Settings'] as const;
export type NonAddTabName = (typeof NON_ADD_TABS)[number];

type TabTrackingProps = {
  rememberActiveTab: (routeName: string) => void;
  getLastActiveTab: () => NonAddTabName;
};

function resolveColor(value: string, fallback: string) {
  return value && value !== 'unset' ? value : fallback;
}

// Tab screens — no Go Back (tab bar provides navigation)
const SafeDashboard = withErrorBoundary(DashboardScreen, 'Dashboard');
const SafeDiary = withErrorBoundary(DiaryScreen, 'Diary');
const SafeLibrary = withErrorBoundary(LibraryScreen, 'Library');
const SafeSettings = withErrorBoundary(SettingsScreen, 'Settings');

// Native iOS Tab Navigator (iOS 26+ Liquid Glass)
const NativeTab = createNativeBottomTabNavigator<TabParamList>();

// Fallback Tab Navigator (Android / iOS < 26)
const FallbackTab = createBottomTabNavigator<TabParamList>();

type DashboardStackParamList = {
  DashboardRoot: undefined;
};
type DiaryStackParamList = {
  DiaryRoot: { selectedDate?: string } | undefined;
};
type LibraryStackParamList = { LibraryRoot: undefined };
type SettingsStackParamList = { SettingsRoot: undefined };

/**
 * Keeps a tab screen's content clear of the vertical bar iPhone Duo presents on
 * one side. Left and right only: the native header and tab bar own the top and
 * bottom. A plain padded View, not a native SafeAreaView: wrapping the screen
 * in the native one stops UIKit seeing the scroll view's top edge, which drops
 * the large title and its collapse-on-scroll.
 */
const ScreenSideInsets = ({ children }: { children: React.ReactNode }) => {
  const { left, right } = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, paddingLeft: left, paddingRight: right }}>
      {children}
    </View>
  );
};
const sideInsetsLayout = ({ children }: { children: React.ReactNode }) => (
  <ScreenSideInsets>{children}</ScreenSideInsets>
);

const DashboardStack = createNativeStackNavigator<DashboardStackParamList>();
const DiaryStack = createNativeStackNavigator<DiaryStackParamList>();
const LibraryStack = createNativeStackNavigator<LibraryStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

const NativeTabsOverlayContext = React.createContext<ReturnType<
  typeof useWhatsNewBannerState
> | null>(null);

/**
 * iOS native tabs don't expose a `tabBar` render prop, so banners are
 * rendered inside each native tab scene. The library's measured tab-bar
 * height keeps the overlay directly above the native bar on every device.
 */
function NativeTabsBannerOverlay() {
  const whatsNewState = React.useContext(NativeTabsOverlayContext);
  const tabBarHeight = useBottomTabBarHeight();
  React.useEffect(() => {
    setActiveWorkoutBarTabBarHeight(tabBarHeight);
  }, [tabBarHeight]);

  if (!whatsNewState) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        bottom: tabBarHeight,
        left: 0,
        right: 0,
        zIndex: 50,
      }}
    >
      <WhatsNewBannerContent presentation="glass" state={whatsNewState} />
    </View>
  );
}

function DashboardStackScreen() {
  const { t } = useTranslation();
  const { defaultColor } = useHeaderActionColors();
  const textPrimary = useCSSVariable('--color-text-primary') as string;
  const screenOptions = React.useMemo(
    () => createIOSNativeHeaderOptions(defaultColor, textPrimary),
    [defaultColor, textPrimary]
  );

  return (
    <View className="flex-1">
      <DashboardStack.Navigator
        screenOptions={screenOptions}
        screenLayout={sideInsetsLayout}
      >
        <DashboardStack.Screen
          name="DashboardRoot"
          component={SafeDashboard as React.ComponentType}
          options={{
            title: t('navigation.dashboard', { defaultValue: 'Dashboard' }),
            headerBackTitle: t('navigation.dashboard', {
              defaultValue: 'Dashboard',
            }),
          }}
        />
      </DashboardStack.Navigator>
      <NativeTabsBannerOverlay />
    </View>
  );
}

function DiaryStackScreen() {
  const { t } = useTranslation();
  const { defaultColor } = useHeaderActionColors();
  const textPrimary = useCSSVariable('--color-text-primary') as string;
  const screenOptions = React.useMemo(
    () => createIOSNativeHeaderOptions(defaultColor, textPrimary),
    [defaultColor, textPrimary]
  );

  return (
    <View className="flex-1">
      <DiaryStack.Navigator
        screenOptions={screenOptions}
        screenLayout={sideInsetsLayout}
      >
        <DiaryStack.Screen
          name="DiaryRoot"
          component={SafeDiary as React.ComponentType}
          options={{
            title: t('navigation.diary', { defaultValue: 'Diary' }),
            headerBackTitle: t('navigation.diary', { defaultValue: 'Diary' }),
          }}
        />
      </DiaryStack.Navigator>
      <NativeTabsBannerOverlay />
    </View>
  );
}

function LibraryStackScreen() {
  const { t } = useTranslation();
  const { defaultColor } = useHeaderActionColors();
  const textPrimary = useCSSVariable('--color-text-primary') as string;
  const screenOptions = React.useMemo(
    () => createIOSNativeHeaderOptions(defaultColor, textPrimary),
    [defaultColor, textPrimary]
  );

  return (
    <View className="flex-1">
      <LibraryStack.Navigator
        screenOptions={screenOptions}
        screenLayout={sideInsetsLayout}
      >
        <LibraryStack.Screen
          name="LibraryRoot"
          component={SafeLibrary as React.ComponentType}
          options={{
            title: t('navigation.library', { defaultValue: 'Library' }),
            headerBackTitle: t('navigation.library', {
              defaultValue: 'Library',
            }),
          }}
        />
      </LibraryStack.Navigator>
      <NativeTabsBannerOverlay />
    </View>
  );
}

function SettingsStackScreen() {
  const { t } = useTranslation();
  const { defaultColor } = useHeaderActionColors();
  const textPrimary = useCSSVariable('--color-text-primary') as string;
  const screenOptions = React.useMemo(
    () => createIOSNativeHeaderOptions(defaultColor, textPrimary),
    [defaultColor, textPrimary]
  );

  return (
    <View className="flex-1">
      <SettingsStack.Navigator
        screenOptions={screenOptions}
        screenLayout={sideInsetsLayout}
      >
        <SettingsStack.Screen
          name="SettingsRoot"
          component={SafeSettings as React.ComponentType}
          options={{
            title: t('navigation.settings', { defaultValue: 'Settings' }),
            headerBackTitle: t('navigation.settings', {
              defaultValue: 'Settings',
            }),
          }}
        />
      </SettingsStack.Navigator>
      <NativeTabsBannerOverlay />
    </View>
  );
}

export function NativeTabsLayout({
  rememberActiveTab,
  getLastActiveTab,
}: TabTrackingProps) {
  const { t } = useTranslation();
  const [primary, tabActive, tabInactive] = useCSSVariable([
    '--color-accent-primary',
    '--color-tab-active',
    '--color-tab-inactive',
  ]) as [string, string, string];
  const activeTintColor = resolveColor(
    tabActive,
    resolveColor(primary, '#0A84FF')
  );
  const inactiveTintColor = resolveColor(tabInactive, '#8E8E93');
  const whatsNewState = useWhatsNewBannerState();

  return (
    <NativeTabsOverlayContext.Provider value={whatsNewState}>
      <NativeTab.Navigator
        // Start on the last active tab so toggling the Liquid Glass tab bar —
        // which swaps and remounts this navigator — keeps the user on the tab
        // they came from. Defaults to Diary on a cold start.
        initialRouteName={getLastActiveTab()}
        tabBarActiveTintColor={activeTintColor}
        tabBarInactiveTintColor={inactiveTintColor}
        screenListeners={{
          state: (event) => {
            const state = event.data?.state;
            if (!state?.routes) return;
            const route = state.routes[state.index ?? 0];
            if (route) rememberActiveTab(route.name);
          },
        }}
      >
        <NativeTab.Screen
          name="Library"
          component={LibraryStackScreen}
          options={{
            tabBarLabel: t('navigation.library', { defaultValue: 'Library' }),
            tabBarIcon: () =>
              ({ sfSymbol: 'books.vertical.fill' }) as unknown as AppleIcon,
          }}
        />
        <NativeTab.Screen
          name="Diary"
          component={DiaryStackScreen}
          options={{
            tabBarLabel: t('navigation.diary', { defaultValue: 'Diary' }),
            tabBarIcon: () =>
              ({ sfSymbol: 'book.fill' }) as unknown as AppleIcon,
          }}
        />
        <NativeTab.Screen
          name="Settings"
          component={SettingsStackScreen}
          options={{
            tabBarLabel: t('navigation.settings', { defaultValue: 'Settings' }),
            tabBarIcon: () =>
              ({ sfSymbol: 'gearshape.fill' }) as unknown as AppleIcon,
          }}
        />
        <NativeTab.Screen
          name="Dashboard"
          component={DashboardStackScreen}
          options={{
            tabBarLabel: t('navigation.dashboard', {
              defaultValue: 'Dashboard',
            }),
            tabBarIcon: () =>
              ({ sfSymbol: 'square.grid.2x2.fill' }) as unknown as AppleIcon,
            tabBarItemHidden: true,
            lazy: false,
          }}
        />
      </NativeTab.Navigator>
    </NativeTabsOverlayContext.Provider>
  );
}

export function FallbackTabsLayout({
  rememberActiveTab,
  getLastActiveTab,
}: TabTrackingProps) {
  const { t } = useTranslation();
  return (
    <FallbackTab.Navigator
      // Start on the last active tab so toggling the Liquid Glass tab bar —
      // which swaps and remounts this navigator — keeps the user on the tab
      // they came from. Defaults to Diary on a cold start.
      initialRouteName={getLastActiveTab()}
      screenListeners={{
        state: (event) => {
          const state = event.data?.state;
          if (!state?.routes) return;
          const route = state.routes[state.index ?? 0];
          if (route) rememberActiveTab(route.name);
        },
      }}
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => (
        <View collapsable={false}>
          <WhatsNewBanner />
          <ActiveWorkoutBar variant="embedded" />
          <CustomTabBar {...props} />
        </View>
      )}
    >
      <FallbackTab.Screen
        name="Library"
        component={SafeLibrary}
        options={{
          tabBarLabel: t('navigation.library', { defaultValue: 'Library' }),
          tabBarAccessibilityLabel: t('navigation.library', {
            defaultValue: 'Library',
          }),
        }}
      />
      <FallbackTab.Screen
        name="Diary"
        component={SafeDiary}
        options={{
          tabBarLabel: t('navigation.diary', { defaultValue: 'Diary' }),
          tabBarAccessibilityLabel: t('navigation.diary', {
            defaultValue: 'Diary',
          }),
        }}
      />
      <FallbackTab.Screen
        name="Settings"
        component={SafeSettings}
        options={{
          tabBarLabel: t('navigation.settings', { defaultValue: 'Settings' }),
          tabBarAccessibilityLabel: t('navigation.settings', {
            defaultValue: 'Settings',
          }),
        }}
      />
      <FallbackTab.Screen
        name="Dashboard"
        component={SafeDashboard}
        options={{
          tabBarLabel: t('navigation.dashboard', { defaultValue: 'Dashboard' }),
          tabBarAccessibilityLabel: t('navigation.dashboard', {
            defaultValue: 'Dashboard',
          }),
          tabBarItemStyle: { display: 'none' },
          lazy: false,
        }}
      />
    </FallbackTab.Navigator>
  );
}

// Native Liquid Glass tabs are only used on iOS 26+. Older iOS releases
// intentionally use the same custom tab bar as Android.
export function TabsLayout({
  rememberActiveTab,
  getLastActiveTab,
}: TabTrackingProps) {
  const tabs = useNativeIOSTabsActive() ? (
    <NativeTabsLayout
      rememberActiveTab={rememberActiveTab}
      getLastActiveTab={getLastActiveTab}
    />
  ) : (
    <FallbackTabsLayout
      rememberActiveTab={rememberActiveTab}
      getLastActiveTab={getLastActiveTab}
    />
  );

  return (
    <>
      {tabs}
      <AnnouncementModal />
    </>
  );
}
