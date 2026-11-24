import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCSSVariable } from 'uniwind';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Icon, { type IconName } from './Icon';

export const TAB_BAR_HEIGHT = 56;

const TAB_ICONS: Record<string, IconName> = {
  Dashboard: 'tab-dashboard',
  Diary: 'book',
  Library: 'tab-library',
  Settings: 'settings',
};

const CustomTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const [chrome, chromeBorder, tabActive, tabInactive] = useCSSVariable([
    '--color-chrome',
    '--color-chrome-border',
    '--color-tab-active',
    '--color-tab-inactive',
  ]) as [string, string, string, string];

  return (
    <View
      className="flex-row items-end overflow-visible"
      style={{
        backgroundColor: chrome,
        borderTopColor: chromeBorder,
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingBottom: Math.max(insets.bottom, 4),
      }}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        // A tab hidden the standard React Navigation way gets no button.
        if (StyleSheet.flatten(options.tabBarItemStyle)?.display === 'none') {
          return null;
        }
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!event.defaultPrevented && !isFocused) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        const label =
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : (options.title ?? route.name);
        const iconName = TAB_ICONS[route.name];
        const tintColor = isFocused ? tabActive : tabInactive;

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : undefined}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            onPress={onPress}
            onLongPress={onLongPress}
            className="flex-1 items-center justify-center pt-2 pb-1 gap-0.5"
          >
            {iconName && (
              <Icon
                name={iconName}
                size={24}
                color={tintColor}
                weight={isFocused ? 'bold' : 'regular'}
              />
            )}
            <Text
              className={`text-xs ${isFocused ? 'font-semibold' : 'font-medium'}`}
              style={{ color: tintColor }}
              numberOfLines={1}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default CustomTabBar;
