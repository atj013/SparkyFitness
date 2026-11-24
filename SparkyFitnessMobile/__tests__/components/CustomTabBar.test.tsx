import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import CustomTabBar from '../../src/components/CustomTabBar';

describe('CustomTabBar', () => {
  const insets = { top: 0, bottom: 0, left: 0, right: 0 };
  const frame = { x: 0, y: 0, width: 390, height: 844 };

  const createProps = (): BottomTabBarProps => {
    const routes = [
      { key: 'Dashboard-key', name: 'Dashboard' as const, params: undefined },
      { key: 'Diary-key', name: 'Diary' as const, params: undefined },
      { key: 'Library-key', name: 'Library' as const, params: undefined },
      { key: 'Settings-key', name: 'Settings' as const, params: undefined },
    ];

    const emit = jest.fn(() => ({ defaultPrevented: false }));

    return {
      state: {
        stale: false,
        type: 'tab',
        key: 'tab-state',
        index: 0,
        routeNames: routes.map((route) => route.name),
        history: [],
        routes,
      },
      descriptors: Object.fromEntries(
        routes.map((route) => [
          route.key,
          {
            navigation: {} as never,
            route,
            options: { title: route.name },
            render: jest.fn(),
          },
        ])
      ) as BottomTabBarProps['descriptors'],
      navigation: {
        emit,
        navigate: jest.fn(),
      } as unknown as BottomTabBarProps['navigation'],
      insets,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('emits the tab press and navigates to a tab that is not focused', () => {
    const props = createProps();
    const screen = render(
      <SafeAreaProvider initialMetrics={{ insets, frame }}>
        <CustomTabBar {...props} />
      </SafeAreaProvider>
    );

    expect(screen.queryByLabelText('Add')).toBeNull();
    fireEvent.press(screen.getByLabelText('Diary'));

    expect(props.navigation.emit).toHaveBeenCalledWith({
      type: 'tabPress',
      target: 'Diary-key',
      canPreventDefault: true,
    });
    expect(props.navigation.navigate).toHaveBeenCalledWith('Diary', undefined);
  });

  it('draws no button for a tab hidden with display none', () => {
    const props = createProps();
    props.descriptors['Dashboard-key'].options = {
      title: 'Dashboard',
      tabBarItemStyle: { display: 'none' },
    };
    const screen = render(
      <SafeAreaProvider initialMetrics={{ insets, frame }}>
        <CustomTabBar {...props} />
      </SafeAreaProvider>
    );

    expect(screen.queryByLabelText('Dashboard')).toBeNull();
    expect(screen.getByLabelText('Diary')).toBeTruthy();
  });
});
