import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SettingsScreen from '../../src/screens/SettingsScreen';
import {
  usePreferences,
  useServerConfigs,
  useServerConnection,
} from '../../src/hooks';

type ScreenProps = React.ComponentProps<typeof SettingsScreen>;

const navigation = {
  navigate: jest.fn(),
} as unknown as ScreenProps['navigation'];
const route = {
  key: 'Settings-1',
  name: 'Settings',
  params: undefined,
} as unknown as ScreenProps['route'];

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return { ...actual, useFocusEffect: (callback: () => void) => callback() };
});

jest.mock('../../src/hooks', () => ({
  useServerConnection: jest.fn(),
  useServerConfigs: jest.fn(),
  usePreferences: jest.fn(),
  queryClient: { getQueryCache: () => ({ getAll: () => [] }) },
}));

jest.mock('../../src/hooks/useNfcSupport', () => ({
  useNfcSupport: () => ({
    supported: false,
    enabled: false,
    isLoading: false,
    refetch: jest.fn(),
  }),
}));
jest.mock('../../src/hooks/useDiscreetMode', () => ({
  useDiscreetMode: () => ({ discreetMode: false }),
}));

jest.mock('../../src/components/ActiveWorkoutBar', () => ({
  useActiveWorkoutBarPadding: () => 0,
}));

jest.mock('../../src/services/nativeTabBarPreference', () => ({
  useNativeIOSTabsActive: () => false,
}));

jest.mock('../../src/services/storage', () => ({
  loadLastSyncedTime: jest.fn().mockResolvedValue(null),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => (key === 'familyDiary.title' ? 'Family Diaries' : key),
    i18n: { language: 'en-US' },
  }),
}));

const mockUseServerConnection = useServerConnection as jest.MockedFunction<
  typeof useServerConnection
>;
const mockUseServerConfigs = useServerConfigs as jest.MockedFunction<
  typeof useServerConfigs
>;
const mockUsePreferences = usePreferences as jest.MockedFunction<
  typeof usePreferences
>;

describe('SettingsScreen family diary entry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseServerConnection.mockReturnValue({ isConnected: true } as ReturnType<
      typeof useServerConnection
    >);
    mockUseServerConfigs.mockReturnValue({ activeConfig: null } as ReturnType<
      typeof useServerConfigs
    >);
    mockUsePreferences.mockReturnValue({ preferences: null } as ReturnType<
      typeof usePreferences
    >);
  });

  test('opens family diaries when connected', () => {
    const { getByText } = render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, bottom: 0, left: 0, right: 0 },
        }}
      >
        <SettingsScreen navigation={navigation} route={route} />
      </SafeAreaProvider>
    );

    fireEvent.press(getByText('Family Diaries'));

    expect(navigation.navigate).toHaveBeenCalledWith('FamilyMembers');
  });

  test('hides family diaries while disconnected', () => {
    mockUseServerConnection.mockReturnValue({
      isConnected: false,
    } as ReturnType<typeof useServerConnection>);

    const { queryByText } = render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, bottom: 0, left: 0, right: 0 },
        }}
      >
        <SettingsScreen navigation={navigation} route={route} />
      </SafeAreaProvider>
    );

    expect(queryByText('Family Diaries')).toBeNull();
  });

  test('groups the rows, opens Notifications and has no Dashboard row', () => {
    const { getByText, queryByText } = render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, bottom: 0, left: 0, right: 0 },
        }}
      >
        <SettingsScreen navigation={navigation} route={route} />
      </SafeAreaProvider>
    );

    for (const section of [
      'settings.sections.connection',
      'settings.sections.you',
      'settings.sections.tracking',
      'settings.sections.layout',
      'settings.sections.appDevices',
      'settings.sections.help',
    ]) {
      expect(getByText(section)).toBeTruthy();
    }
    // The Dashboard tab is hidden on this fork, so its settings are not offered.
    expect(queryByText('settings.rows.dashboard')).toBeNull();

    fireEvent.press(getByText('settings.rows.notifications'));
    expect(navigation.navigate).toHaveBeenCalledWith('NotificationSettings');
  });

  test('leaves out the You section while disconnected', () => {
    mockUseServerConnection.mockReturnValue({
      isConnected: false,
    } as ReturnType<typeof useServerConnection>);

    const { getByText, queryByText } = render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, bottom: 0, left: 0, right: 0 },
        }}
      >
        <SettingsScreen navigation={navigation} route={route} />
      </SafeAreaProvider>
    );

    expect(queryByText('settings.sections.you')).toBeNull();
    expect(getByText('settings.rows.workout')).toBeTruthy();
  });
});
