import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from 'react-native-svg';
import { useCSSVariable } from 'uniwind';
import { getDueDosesForDate } from '@workspace/shared';

import Icon from '../Icon';
import { formatLocalizedNumber } from '../../localization';
import { useLatestMeasurementsOnOrBefore } from '../../hooks/useMeasurements';
import { useMeasurementsRange } from '../../hooks/useMeasurementsRange';
import { useWeightHistory } from '../../hooks/useWeightHistory';
import { useHydrationRange } from '../../hooks/useHydrationRange';
import {
  useDeleteMedicationEntry,
  useLogDose,
  useMedicationEntries,
  useMedications,
} from '../../hooks/useMedications';
import { getDeviceTimezone } from '../../utils/dateUtils';
import { computeWeightChanges } from '../../utils/weightChanges';
import { doseSlotStatus } from '../../utils/medications';
import { selectPrnMedications } from '../../utils/medicationAdherence';
import {
  buildDiaryMedsSlots,
  type DiaryMedsSlot,
} from '../../utils/diaryMedsSlots';
import {
  WATER_UNIT_LABELS,
  formatVolumeForUnit,
  formatWeightDisplay,
  volumeFromMl,
  weightFromKg,
  type WeightDisplayMode,
} from '../../utils/unitConversions';

const TILE_CLASS = 'flex-1 bg-surface rounded-xl shadow-sm px-3 py-3';
// Steps and Meds share the last row in a shorter form, leaving the room to
// the summary's macros at the top of the Diary.
const COMPACT_TILE_CLASS = 'flex-1 bg-surface rounded-xl shadow-sm px-3 py-2';
const STEP_BAR_MAX_HEIGHT = 16;

// Each tile's title is in its own Diary card color. Pass the whole class
// name (never build it from parts) so Tailwind can see it.
type TileTitleColor =
  | 'text-diary-weight'
  | 'text-diary-steps'
  | 'text-diary-water'
  | 'text-diary-meds';

const TileTitle: React.FC<{
  title: string;
  colorClass: TileTitleColor;
  chevron?: boolean;
}> = ({ title, colorClass, chevron = true }) => {
  const textSecondary = useCSSVariable('--color-text-secondary') as string;
  return (
    <View className="flex-row items-center justify-between">
      <Text className={`text-sm font-semibold ${colorClass}`}>{title}</Text>
      {chevron ? (
        <Icon name="chevron-forward" size={16} color={textSecondary} />
      ) : null}
    </View>
  );
};

/* ------------------------------------------------------------------ Weight */

interface WeightTileProps {
  date: string;
  weightMode: WeightDisplayMode;
  enabled: boolean;
  onPress: () => void;
}

export const WeightTile: React.FC<WeightTileProps> = ({
  date,
  weightMode,
  enabled,
  onPress,
}) => {
  const { t } = useTranslation();
  const { latestMeasurements } = useLatestMeasurementsOnOrBefore({
    date,
    enabled,
  });
  const { weights } = useWeightHistory({ enabled });

  const latestKg = Number(latestMeasurements?.weight);
  const hasWeight = Number.isFinite(latestKg) && latestKg > 0;
  const chartUnit: 'kg' | 'lbs' = weightMode === 'kg' ? 'kg' : 'lbs';
  const changes = useMemo(
    () => computeWeightChanges(weights, date),
    [weights, date]
  );

  const formatChange = (kg: number | null) => {
    if (kg === null) return t('diary.tiles.noValue', { defaultValue: '—' });
    const value = weightFromKg(kg, chartUnit);
    const rounded = Math.round(value * 10) / 10;
    const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : '';
    return `${sign}${formatLocalizedNumber(Math.abs(rounded), {
      maximumFractionDigits: 1,
    })} ${chartUnit === 'kg' ? 'kg' : 'lb'}`;
  };
  const rows = [
    {
      key: 'week',
      label: t('diary.tiles.weight7Days', { defaultValue: '7 days' }),
      value: formatChange(changes.week),
    },
    {
      key: 'month',
      label: t('diary.tiles.weight30Days', { defaultValue: '30 days' }),
      value: formatChange(changes.month),
    },
    {
      key: 'allTime',
      label: t('diary.tiles.weightAllTime', { defaultValue: 'All time' }),
      value: formatChange(changes.allTime),
    },
  ];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('diary.tiles.weightA11y', {
        defaultValue: 'Weight {{value}}. Open weight trend',
        value: hasWeight ? formatWeightDisplay(latestKg, weightMode) : '',
      })}
      className={`${TILE_CLASS} gap-0.5`}
      testID="diary-weight-tile"
    >
      <TileTitle
        title={t('diary.tiles.weight', { defaultValue: 'Weight' })}
        colorClass="text-diary-weight"
      />
      <Text
        className="text-[21px] font-bold text-text-primary"
        numberOfLines={1}
      >
        {hasWeight
          ? formatWeightDisplay(latestKg, weightMode)
          : t('diary.tiles.noValue', { defaultValue: '—' })}
      </Text>
      <View className="flex-1 justify-end gap-px mt-0.5">
        {rows.map((row) => (
          <View
            key={row.key}
            className="flex-row items-baseline justify-between"
            testID={`diary-weight-change-${row.key}`}
          >
            <Text className="text-[13px] text-text-secondary" numberOfLines={1}>
              {row.label}
            </Text>
            <Text
              className="text-[13px] font-semibold text-diary-weight"
              numberOfLines={1}
            >
              {row.value}
            </Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
};

/* ------------------------------------------------------------------- Steps */

interface StepsTileProps {
  date: string;
  steps: number | null | undefined;
  goal: number;
  enabled: boolean;
  onPress: () => void;
}

export const StepsTile: React.FC<StepsTileProps> = ({
  date,
  steps,
  goal,
  enabled,
  onPress,
}) => {
  const { t } = useTranslation();
  const [accent, trackColor] = useCSSVariable([
    '--color-diary-steps',
    '--color-progress-track',
  ]) as [string, string];
  const { stepsData } = useMeasurementsRange({ range: '30d', enabled });
  const week = stepsData.slice(-7);
  const max = Math.max(1, goal, ...week.map((d) => d.steps));
  const value = Math.max(0, steps ?? 0);
  const percent = goal > 0 ? Math.round((value / goal) * 100) : null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('diary.tiles.stepsA11y', {
        defaultValue: '{{value}} steps. Open this week’s steps',
        value: formatLocalizedNumber(value),
      })}
      className={`${COMPACT_TILE_CLASS} gap-0.5`}
      testID="diary-steps-tile"
    >
      <TileTitle
        title={t('diary.tiles.steps', { defaultValue: 'Steps' })}
        colorClass="text-diary-steps"
      />
      <View className="flex-row items-baseline gap-1.5">
        <Text
          className="text-[17px] font-bold text-text-primary"
          numberOfLines={1}
        >
          {formatLocalizedNumber(value)}
        </Text>
        {percent !== null ? (
          <Text
            className="text-[12px] text-text-secondary shrink"
            numberOfLines={1}
          >
            {t('diary.tiles.stepsOfGoal', {
              defaultValue: '{{percent}}% of {{goal}}',
              percent: formatLocalizedNumber(percent),
              goal: formatLocalizedNumber(goal),
            })}
          </Text>
        ) : null}
      </View>
      <View className="flex-row items-end justify-between min-h-[16px]">
        {week.map((d) => {
          const height =
            d.steps > 0
              ? Math.max(3, Math.round((d.steps / max) * STEP_BAR_MAX_HEIGHT))
              : 2;
          const isDay = d.day === date;
          return (
            <View
              key={d.day}
              style={{
                width: 10,
                height,
                borderRadius: 3,
                backgroundColor: d.steps > 0 ? accent : trackColor,
                opacity: d.steps > 0 && !isDay ? 0.45 : 1,
              }}
            />
          );
        })}
      </View>
    </Pressable>
  );
};

/* ------------------------------------------------------------------- Water */

interface WaterTileProps {
  consumedMl: number;
  goalMl: number;
  unit: string;
  enabled: boolean;
  onPress: () => void;
  onIncrement?: () => void;
  onDecrement?: () => void;
  disableDecrement?: boolean;
}

const CUP_PATH =
  'M5 4 H35 L31.6 47.2 Q31.3 50 28.5 50 H11.5 Q8.7 50 8.4 47.2 Z';

export const WaterTile: React.FC<WaterTileProps> = ({
  consumedMl,
  goalMl,
  unit,
  enabled,
  onPress,
  onIncrement,
  onDecrement,
  disableDecrement,
}) => {
  const { t } = useTranslation();
  const [hydration, onHydration, track, border] = useCSSVariable([
    '--color-diary-water',
    '--color-diary-on',
    '--color-progress-track',
    '--color-border-strong',
  ]) as [string, string, string, string];
  const { hydrationData } = useHydrationRange({ range: '7d', enabled });
  const unitLabel = WATER_UNIT_LABELS[unit] ?? unit;
  const show = (ml: number) =>
    formatVolumeForUnit(volumeFromMl(ml, unit), unit);

  const daysWithWater = hydrationData.filter((d) => d.milliliters > 0);
  const averageMl =
    daysWithWater.length > 0
      ? daysWithWater.reduce((sum, d) => sum + d.milliliters, 0) /
        daysWithWater.length
      : null;

  const fraction = goalMl > 0 ? Math.min(1, consumedMl / goalMl) : 0;
  const waterHeight = 46 * fraction;

  return (
    <View className={`${TILE_CLASS} gap-1.5`} testID="diary-water-tile">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t('diary.tiles.waterA11y', {
          defaultValue: 'Water {{value}} {{unit}}. Open this week’s water',
          value: show(consumedMl),
          unit: unitLabel,
        })}
        className="flex-1 flex-row items-center gap-2"
      >
        <View className="flex-1 gap-0.5">
          <TileTitle
            title={t('diary.tiles.water', { defaultValue: 'Water' })}
            colorClass="text-diary-water"
            chevron
          />
          <Text
            className="text-[21px] font-bold text-text-primary"
            numberOfLines={1}
          >
            {show(consumedMl)}
            {goalMl > 0 ? (
              <Text className="text-[13px] font-medium text-text-secondary">
                {t('diary.tiles.waterGoal', {
                  defaultValue: ' / {{goal}} {{unit}}',
                  goal: show(goalMl),
                  unit: unitLabel,
                })}
              </Text>
            ) : null}
          </Text>
          {averageMl !== null ? (
            <Text className="text-[13px] text-text-secondary" numberOfLines={1}>
              {t('diary.tiles.waterAverage', {
                defaultValue: 'Avg: {{value}} {{unit}}',
                value: show(averageMl),
                unit: unitLabel,
              })}
            </Text>
          ) : null}
        </View>
        <Svg width={34} height={44} viewBox="0 0 40 52">
          <Defs>
            <ClipPath id="diaryWaterCup">
              <Path d={CUP_PATH} />
            </ClipPath>
          </Defs>
          <Path d={CUP_PATH} fill={track} />
          {waterHeight > 0 ? (
            <Rect
              x={0}
              y={50 - waterHeight}
              width={40}
              height={waterHeight + 1}
              fill={hydration}
              clipPath="url(#diaryWaterCup)"
            />
          ) : null}
          <Path
            d={CUP_PATH}
            fill="none"
            stroke={border}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </Svg>
      </Pressable>
      {onIncrement || onDecrement ? (
        <View className="flex-row gap-1.5">
          <Pressable
            onPress={onDecrement}
            disabled={!onDecrement || disableDecrement}
            accessibilityRole="button"
            accessibilityLabel={t('diary.tiles.removeWater', {
              defaultValue: 'Remove water',
            })}
            className={`flex-1 h-9 rounded-lg border border-border items-center justify-center ${
              !onDecrement || disableDecrement ? 'opacity-40' : ''
            }`}
            testID="diary-water-decrement"
          >
            <Icon name="remove" size={18} color={hydration} />
          </Pressable>
          <Pressable
            onPress={onIncrement}
            disabled={!onIncrement}
            accessibilityRole="button"
            accessibilityLabel={t('diary.tiles.addWater', {
              defaultValue: 'Add water',
            })}
            className={`flex-1 h-9 rounded-lg items-center justify-center ${
              !onIncrement ? 'opacity-40' : ''
            }`}
            style={{ backgroundColor: hydration }}
            testID="diary-water-increment"
          >
            <Icon name="add" size={18} color={onHydration} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
};

/* -------------------------------------------------------------------- Meds */

const SunIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={4} stroke={color} strokeWidth={2} />
    <Path
      d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

const SunsetIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <G
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M2.5 17.5h19" />
      <Path d="M6.5 17.5a5.5 5.5 0 0 1 11 0" />
      <Path d="M12 4v4.5M9.8 6.6L12 8.8l2.2-2.2" />
      <Path d="M3.8 11.6l1.5 1M20.2 11.6l-1.5 1" />
      <Path d="M7 21h10" />
    </G>
  </Svg>
);

const LeafIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <G
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M5 19C5 10.5 10.5 5 19.5 4.5 19 13.5 13.5 19 5 19z" />
      <Path d="M5 19l8.5-8.5" />
    </G>
  </Svg>
);

interface MedsTileProps {
  date: string;
  enabled: boolean;
  onPressTitle: () => void;
}

export const MedsTile: React.FC<MedsTileProps> = ({
  date,
  enabled,
  onPressTitle,
}) => {
  const { t } = useTranslation();
  const [accent, onAccent, ringColor, emptyFill] = useCSSVariable([
    '--color-diary-meds',
    '--color-diary-on',
    '--color-border-strong',
    '--color-background',
  ]) as [string, string, string, string];

  const { data: medications, isLoading: isLoadingMeds } = useMedications({
    activeOnly: true,
    enabled,
  });
  const { data: entries, isLoading: isLoadingEntries } = useMedicationEntries({
    fromDate: date,
    toDate: date,
    enabled,
  });
  const { entryForDue, logDose, toggleTaken, logPrn } = useLogDose(
    date,
    entries
  );
  const deleteEntry = useDeleteMedicationEntry();

  const slots = useMemo(() => {
    if (!medications) return [];
    const due = getDueDosesForDate(medications, date, getDeviceTimezone());
    return buildDiaryMedsSlots(
      due,
      selectPrnMedications(medications, due),
      entries ?? [],
      date
    );
  }, [medications, entries, date]);

  const label = (slot: DiaryMedsSlot) => {
    if (slot.key === 'asNeeded')
      return slot.medication.display_name || slot.medication.name;
    return slot.key === 'morning'
      ? t('diary.tiles.medsMorning', { defaultValue: 'Morning medications' })
      : t('diary.tiles.medsEvening', {
          defaultValue: 'Afternoon and evening medications',
        });
  };

  const press = (slot: DiaryMedsSlot) => {
    if (slot.key === 'asNeeded') {
      const latest = slot.entries[0];
      if (slot.taken && latest) deleteEntry.mutate(latest.id);
      else logPrn(slot.medication);
      return;
    }
    if (slot.taken) {
      // Undo the whole circle: remove every log behind it.
      for (const due of slot.doses) if (entryForDue(due)) toggleTaken(due);
      return;
    }
    for (const due of slot.doses) {
      if (doseSlotStatus(entryForDue(due)) === 'pending') logDose(due, 'taken');
    }
  };

  if (isLoadingMeds || isLoadingEntries) {
    return (
      <View className={`${COMPACT_TILE_CLASS} items-center justify-center`}>
        <ActivityIndicator size="small" color={accent} />
      </View>
    );
  }
  if (slots.length === 0) return null;

  return (
    <View className={`${COMPACT_TILE_CLASS} gap-1`} testID="diary-meds-tile">
      <Pressable
        onPress={onPressTitle}
        accessibilityRole="button"
        accessibilityLabel={t('diary.tiles.medsOpen', {
          defaultValue: 'Open medications',
        })}
      >
        <TileTitle
          title={t('diary.tiles.meds', { defaultValue: 'Meds' })}
          colorClass="text-diary-meds"
        />
      </Pressable>
      <View className="flex-1 flex-row items-center justify-around">
        {slots.map((slot) => {
          const ink = slot.taken ? onAccent : accent;
          return (
            <Pressable
              key={slot.key}
              onPress={() => press(slot)}
              accessibilityRole="button"
              accessibilityState={{ selected: slot.taken }}
              accessibilityLabel={t('diary.tiles.medsSlotA11y', {
                defaultValue: '{{name}}, {{status}}',
                name: label(slot),
                status: slot.taken
                  ? t('diary.tiles.medsTaken', { defaultValue: 'taken' })
                  : t('diary.tiles.medsNotTaken', {
                      defaultValue: 'not taken',
                    }),
              })}
              hitSlop={4}
              className="w-[36px] h-[36px] rounded-full items-center justify-center"
              style={
                slot.taken
                  ? { backgroundColor: accent }
                  : {
                      backgroundColor: emptyFill,
                      borderWidth: 1.5,
                      borderColor: ringColor,
                    }
              }
              testID={`diary-meds-${slot.key}`}
            >
              {slot.key === 'morning' ? (
                <SunIcon color={ink} />
              ) : slot.key === 'evening' ? (
                <SunsetIcon color={ink} />
              ) : (
                <LeafIcon color={ink} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};
