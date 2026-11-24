import React, { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useCSSVariable } from 'uniwind';
import Icon, { type IconName } from '../Icon';
import { formatLocalizedNumber } from '../../localization';
import type { HabitKey, HabitState } from '../../hooks/useDailyHabits';

interface DiaryHabitsCardProps {
  habits: Record<HabitKey, HabitState>;
  /** Drawn under the habits in the same card (the Diary puts Meds here). */
  children?: ReactNode;
}

const CIRCLE = 34;

const HABITS: {
  key: HabitKey;
  icon: IconName;
  colorVar: string;
}[] = [
  { key: 'brush', icon: 'oral-care', colorVar: '--color-diary-water' },
  { key: 'meditate', icon: 'meditation', colorVar: '--color-diary-sleep' },
  { key: 'skincare', icon: 'skincare', colorVar: '--color-diary-meds' },
];

/**
 * A thin row of habit circles at the foot of the Diary's first screen. A tap logs the habit:
 * Brush + Floss fills half for the morning and whole for the night, the others
 * fill at once, and a full circle tapped again empties. Each shows its streak.
 */
const DiaryHabitsCard: React.FC<DiaryHabitsCardProps> = ({
  habits,
  children,
}) => {
  const { t } = useTranslation();
  const colors = useCSSVariable(
    HABITS.map((h) => h.colorVar).concat('--color-diary-on')
  ) as string[];
  const onColor = colors[HABITS.length]!;

  const labels: Record<HabitKey, string> = {
    brush: t('diary.habits.brush', { defaultValue: 'Brush + Floss' }),
    meditate: t('diary.habits.meditate', { defaultValue: 'Meditate' }),
    skincare: t('diary.habits.skincare', { defaultValue: 'Skincare' }),
  };
  const stateLabel = (key: HabitKey, level: 0 | 1 | 2) =>
    level === 2
      ? t('diary.habits.done', { defaultValue: 'done' })
      : level === 1 && key === 'brush'
        ? t('diary.habits.morningDone', {
            defaultValue: 'morning done, tap again for the night',
          })
        : t('diary.habits.notDone', { defaultValue: 'not done' });

  return (
    <View
      className="bg-surface rounded-xl shadow-sm px-3 py-2 gap-2"
      testID="diary-habits-card"
    >
      <View className="flex-row gap-2">
        {HABITS.map(({ key, icon }, index) => {
          const habit = habits[key];
          const color = colors[index]!;
          const streakLabel =
            habit.streak == null
              ? null
              : t('diary.habits.streakA11y', {
                  count: habit.streak,
                  defaultValue: '{{count}} day streak',
                  defaultValue_one: '{{count}} day streak',
                  defaultValue_other: '{{count}} day streak',
                });
          return (
            <Pressable
              key={key}
              testID={`diary-habit-${key}`}
              className="flex-1 flex-row items-center gap-2 active:opacity-80"
              onPress={() => void habit.toggle()}
              disabled={habit.busy}
              accessibilityRole="button"
              accessibilityState={{ busy: habit.busy }}
              accessibilityLabel={[
                labels[key],
                stateLabel(key, habit.level),
                streakLabel,
              ]
                .filter(Boolean)
                .join(', ')}
            >
              <View
                testID={`diary-habit-${key}-level-${habit.level}`}
                className="items-center justify-center rounded-full overflow-hidden"
                style={{
                  width: CIRCLE,
                  height: CIRCLE,
                  borderWidth: 2,
                  borderColor: color,
                }}
              >
                {habit.level > 0 ? (
                  <View
                    className="absolute left-0 right-0 bottom-0"
                    style={{
                      height: habit.level === 2 ? '100%' : '50%',
                      backgroundColor: color,
                    }}
                  />
                ) : null}
                {habit.busy ? (
                  <ActivityIndicator
                    size="small"
                    color={habit.level === 2 ? onColor : color}
                  />
                ) : (
                  <Icon
                    name={icon}
                    size={18}
                    color={habit.level === 2 ? onColor : color}
                  />
                )}
              </View>
              <View className="flex-1">
                <Text
                  className="text-xs font-semibold text-text-primary"
                  numberOfLines={1}
                >
                  {labels[key]}
                </Text>
                <View className="flex-row items-center gap-0.5">
                  <Icon name="flame" size={11} color={color} />
                  <Text className="text-[11px] text-text-secondary">
                    {habit.streak == null
                      ? '–'
                      : formatLocalizedNumber(habit.streak)}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
      {children}
    </View>
  );
};

export default DiaryHabitsCard;
