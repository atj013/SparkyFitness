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
}

const STAGE_FIELDS = [
  'deep_sleep_seconds',
  'light_sleep_seconds',
  'rem_sleep_seconds',
  'awake_sleep_seconds',
] as const;

/**
 * Last night on the Diary's first screen: how long you slept, from when to when,
 * the score when the source has one, and a thin bar of the stages. It shares the
 * Food card's room (a quarter of it) and renders nothing on a day with no night.
 */
const DiarySleepCard: React.FC<DiarySleepCardProps> = ({ entry, onPress }) => {
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

  if (!entry) return null;

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

  return (
    <Pressable
      onPress={() => onPress(entry)}
      accessibilityRole="button"
      accessibilityLabel={t('diary.sleep.a11y', {
        defaultValue: 'Sleep {{duration}}, {{range}}. Open sleep details',
        duration,
        range,
      })}
      className="bg-surface rounded-xl shadow-sm px-3.5 pt-3.5 pb-4 justify-center gap-2"
      style={{ flexGrow: 1, flexBasis: 0, minHeight: 64 }}
      testID="diary-sleep-card"
    >
      <View className="flex-row items-center gap-1.5">
        <Icon name="sleep-bedtime" size={20} color={accent} />
        <Text className="text-[15px] font-semibold text-diary-sleep flex-1">
          {t('diary.sleep.title', { defaultValue: 'Sleep' })}
        </Text>
        {entry.sleep_score != null ? (
          <Text className="text-sm text-text-secondary">
            {t('diary.sleep.score', {
              defaultValue: 'Score {{score}}',
              score: Math.round(entry.sleep_score),
            })}
          </Text>
        ) : null}
        <Icon name="chevron-forward" size={18} color={textSecondary} />
      </View>
      <View className="flex-row items-baseline gap-2">
        <Text className="text-[22px] font-bold text-text-primary">
          {duration}
        </Text>
        {!hasTimeAsleep ? (
          <Text className="text-[13px] text-text-secondary">
            {t('sleep.timeInBed', { defaultValue: 'Time in bed' })}
          </Text>
        ) : null}
        <Text
          className="text-[13px] text-text-secondary flex-1 text-right"
          numberOfLines={1}
        >
          {range}
        </Text>
      </View>
      {stageTotal > 0 ? (
        <View
          className="flex-row h-1.5 rounded-full overflow-hidden"
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
