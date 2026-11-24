import React, { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useCSSVariable } from 'uniwind';
import Icon, { type IconName } from '../Icon';
import { formatLocalizedNumber } from '../../localization';
import type { HabitKey, HabitState } from '../../hooks/useDailyHabits';

interface DiaryHabitsCardProps {
  habits: Record<HabitKey, HabitState>;
  /** More circles in the same row after the habits (the Diary's meds). */
  children?: ReactNode;
}

/** Circle size shared by the habits and the meds in the row. */
export const HABIT_CIRCLE = 36;
/** One circle's column: the circle, then its streak. */
export const HABIT_COLUMN_CLASS = 'flex-1 items-center gap-1';

/**
 * The flame and day count under a circle. With no streak to show (an as-needed
 * dose) it keeps the line's height so every circle stays level.
 */
export const HabitStreak: React.FC<{
  streak: number | null | undefined;
  color: string;
  hidden?: boolean;
}> = ({ streak, color, hidden = false }) => (
  <View
    className="flex-row items-center gap-0.5 h-[14px]"
    importantForAccessibility="no-hide-descendants"
    accessibilityElementsHidden
  >
    {hidden ? null : (
      <>
        <Icon name="flame" size={11} color={color} />
        <Text className="text-[11px] text-text-secondary">
          {streak == null ? '–' : formatLocalizedNumber(streak)}
        </Text>
      </>
    )}
  </View>
);

const HABITS: {
  key: HabitKey;
  icon: IconName;
  colorVar: string;
}[] = [
  { key: 'brush', icon: 'oral-care', colorVar: '--color-diary-water' },
  { key: 'meditate', icon: 'meditation', colorVar: '--color-diary-sleep' },
  { key: 'skincare', icon: 'skincare', colorVar: '--color-diary-weight' },
];

/**
 * One row of circles at the foot of the Diary's first screen, the habits and
 * then whatever is passed in (the meds), each with its streak under it and no
 * words; screen readers get the names. A tap logs the habit: Brush + Floss
 * fills half for the morning and whole for the night, the others fill at once,
 * and a full circle tapped again empties.
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
      className="bg-surface rounded-xl shadow-sm px-2 py-2 flex-row items-start"
      testID="diary-habits-card"
    >
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
            className={`${HABIT_COLUMN_CLASS} active:opacity-80`}
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
                width: HABIT_CIRCLE,
                height: HABIT_CIRCLE,
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
            <HabitStreak streak={habit.streak} color={color} />
          </Pressable>
        );
      })}
      {children}
    </View>
  );
};

export default DiaryHabitsCard;
