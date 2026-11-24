import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { useCSSVariable } from 'uniwind';

import Icon from '../Icon';
import { useEntryClockTime } from '../SleepCards';
import type { SleepEntry } from '../../types/sleep';
import { formatSleepDuration } from '../../utils/sleepDay';

interface DiarySleepCardProps {
  /** The day's main sleep: the night that ended this morning. */
  entry: SleepEntry | null;
  onPress: (entry: SleepEntry) => void;
  /** Where a tap goes on a day with no night (the sleep report). */
  onPressEmpty: () => void;
  /** The sleep query is still loading: hold the space without saying "none". */
  loading?: boolean;
}

const STAGE_FIELDS = [
  'deep_sleep_seconds',
  'light_sleep_seconds',
  'rem_sleep_seconds',
  'awake_sleep_seconds',
] as const;

const TILE_CLASS =
  'flex-1 bg-surface rounded-xl shadow-sm px-3 py-2.5 gap-1 justify-center';

const SleepTitle: React.FC<{ accent: string; chevron: string }> = ({
  accent,
  chevron,
}) => {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center gap-1.5">
      <Icon name="sleep-bedtime" size={16} color={accent} />
      <Text className="text-sm font-semibold text-diary-sleep flex-1">
        {t('diary.sleep.title', { defaultValue: 'Sleep' })}
      </Text>
      <Icon name="chevron-forward" size={16} color={chevron} />
    </View>
  );
};

/**
 * Last night as a half-width tile beside the workout tile: how long you slept,
 * the score when the source has one, when you went to bed and woke up, and a
 * thin bar of the stages. On a day with no night it shows the same tile saying
 * so, so the layout keeps one shape from day to day.
 */
const DiarySleepCard: React.FC<DiarySleepCardProps> = ({
  entry,
  onPress,
  onPressEmpty,
  loading = false,
}) => {
  const { t } = useTranslation();
  const entryClockTime = useEntryClockTime();
  const [accent, textSecondary, ...stageColors] = useCSSVariable([
    '--color-diary-sleep',
    '--color-text-secondary',
    '--color-cat-teal',
    '--color-cat-blue',
    '--color-cat-violet',
    '--color-cat-orange',
  ]) as string[];

  if (!entry) {
    const empty = t('diary.sleep.empty', { defaultValue: 'No sleep recorded' });
    return (
      <Pressable
        onPress={onPressEmpty}
        accessibilityRole="button"
        accessibilityLabel={t('diary.sleep.emptyA11y', {
          defaultValue: 'No sleep recorded. Open sleep trends',
        })}
        className={TILE_CLASS}
        testID="diary-sleep-card-empty"
      >
        <SleepTitle accent={accent} chevron={textSecondary} />
        <Text className="text-[13px] text-text-secondary" numberOfLines={1}>
          {loading ? ' ' : empty}
        </Text>
      </Pressable>
    );
  }

  // Time asleep when the source separates it from time awake in bed, else the
  // whole span, labelled as such so it is not read as sleep.
  const hasTimeAsleep = entry.time_asleep_in_seconds != null;
  const seconds = hasTimeAsleep
    ? (entry.time_asleep_in_seconds ?? 0)
    : entry.duration_in_seconds;
  const duration = formatSleepDuration(seconds, t);
  const range = t('diary.sleep.range', {
    defaultValue: '{{start}} – {{end}}',
    start: entryClockTime(entry.bedtime, entry),
    end: entryClockTime(entry.wake_time, entry),
  });

  const stages = STAGE_FIELDS.map((field, index) => ({
    field,
    seconds: Math.max(0, entry[field] ?? 0),
    color: stageColors[index],
  })).filter((s) => s.seconds > 0);
  const stageTotal = stages.reduce((sum, s) => sum + s.seconds, 0);

  const aside =
    entry.sleep_score != null
      ? t('diary.sleep.score', {
          defaultValue: 'Score {{score}}',
          score: Math.round(entry.sleep_score),
        })
      : !hasTimeAsleep
        ? t('sleep.timeInBed', { defaultValue: 'Time in bed' })
        : null;

  return (
    <Pressable
      onPress={() => onPress(entry)}
      accessibilityRole="button"
      accessibilityLabel={t('diary.sleep.a11y', {
        defaultValue: 'Sleep {{duration}}, {{range}}. Open sleep details',
        duration,
        range,
      })}
      className={TILE_CLASS}
      testID="diary-sleep-card"
    >
      <SleepTitle accent={accent} chevron={textSecondary} />
      <View className="flex-row items-baseline gap-1.5">
        <Text
          className="text-[19px] font-bold text-text-primary"
          numberOfLines={1}
        >
          {duration}
        </Text>
        {aside ? (
          <Text
            className="text-[12px] text-text-secondary shrink"
            numberOfLines={1}
          >
            {aside}
          </Text>
        ) : null}
      </View>
      <Text className="text-[12px] text-text-secondary" numberOfLines={1}>
        {range}
      </Text>
      {stageTotal > 0 ? (
        <View
          className="flex-row h-1.5 rounded-full overflow-hidden mt-0.5"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {stages.map((s) => (
            <View
              key={s.field}
              style={{ flex: s.seconds / stageTotal, backgroundColor: s.color }}
            />
          ))}
        </View>
      ) : null}
    </Pressable>
  );
};

export default DiarySleepCard;
