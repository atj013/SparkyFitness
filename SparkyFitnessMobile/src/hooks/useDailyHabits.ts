import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { addDays, computeOralCareStreak } from '@workspace/shared';
import { useOralCareDay, useOralCareMutations } from './useOralCare';
import { useMindfulnessDay, useMindfulnessMutations } from './useMindfulness';
import {
  useCreateCustomCategory,
  useCustomCategories,
  useCustomMeasurementsByDate,
  useDeleteCustomMeasurement,
  useSaveCustomMeasurement,
} from './useCustomMeasurements';
import { customMeasurementsRootQueryKey } from './queryKeys';
import { useRefetchOnFocus } from './useRefetchOnFocus';
import { fetchMindfulnessSessionsRange } from '../services/api/mindfulnessApi';
import { fetchCustomMeasurementsRange } from '../services/api/measurementsApi';
import { getTodayDate } from '../utils/dateUtils';
import { addLog } from '../services/LogService';

/** Days looked back for the meditation and skincare streaks (the server allows 366). */
export const HABIT_STREAK_DAYS = 365;
/** What one tap on Meditate saves. */
export const MEDITATION_TAP_SECONDS = 15 * 60;
/** The custom measurement skincare is kept in, made on the first tap. */
export const SKINCARE_CATEGORY_NAME = 'Skincare';
/** Brushes a day that fill the Brush + Floss circle: morning and night. */
const BRUSHES_PER_DAY = 2;

export type HabitKey = 'brush' | 'meditate' | 'skincare';

export interface HabitState {
  /** 0 empty, 1 half (Brush + Floss only: the morning), 2 full. */
  level: 0 | 1 | 2;
  /** Days in a row up to today; null until known. */
  streak: number | null;
  busy: boolean;
  /** One step on: empty to half to full for Brush + Floss, and full to empty. */
  toggle: () => Promise<void>;
}

const mindfulnessRangeKey = (start: string, end: string) =>
  ['mindfulness', 'range', start, end] as const;
const skincareRangeKey = (categoryId: string, start: string, end: string) =>
  [...customMeasurementsRootQueryKey, 'range', categoryId, start, end] as const;

const countByDay = (days: readonly string[]) => {
  const counts = new Map<string, number>();
  for (const day of days) counts.set(day, (counts.get(day) ?? 0) + 1);
  return counts;
};

/** Days in a row with at least one entry, ending today (today stays open). */
const streakOf = (days: readonly string[], today: string) =>
  computeOralCareStreak(countByDay(days), 1, today).current;

/**
 * The Diary's habit circles for one day: Brush + Floss and Meditate log into
 * the existing oral care and mindfulness records, skincare into a daily custom
 * measurement. A full circle tapped again removes that day's entries the person
 * made by hand; synced ones are left alone.
 */
export function useDailyHabits(date: string, enabled = true) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const today = getTodayDate();
  const streakStart = addDays(today, -(HABIT_STREAK_DAYS - 1));
  // The ref is the lock (two taps in one frame both see the same state); the
  // state only draws the spinner.
  const locks = useRef(new Set<HabitKey>());
  const [busy, setBusy] = useState<Partial<Record<HabitKey, boolean>>>({});

  // Brush + Floss
  const oralCare = useOralCareDay(date, enabled);
  const oralCareWrites = useOralCareMutations();
  const brushCount = oralCare.data?.brushing_count ?? 0;

  // Meditate
  const mindfulness = useMindfulnessDay(date);
  const mindfulnessWrites = useMindfulnessMutations(date);
  const mindfulnessRange = useQuery({
    queryKey: mindfulnessRangeKey(streakStart, today),
    queryFn: () => fetchMindfulnessSessionsRange(streakStart, today),
    enabled,
  });
  useRefetchOnFocus(mindfulnessRange.refetch, enabled);

  // Skincare
  const categories = useCustomCategories();
  const skincareCategory = categories.data?.find(
    (c) => c.name.trim().toLowerCase() === SKINCARE_CATEGORY_NAME.toLowerCase()
  );
  const dayEntries = useCustomMeasurementsByDate(date, { enabled });
  const skincareEntries = (dayEntries.data ?? []).filter(
    (e) => skincareCategory && e.category_id === skincareCategory.id
  );
  const skincareRange = useQuery({
    queryKey: skincareRangeKey(skincareCategory?.id ?? '', streakStart, today),
    queryFn: () =>
      fetchCustomMeasurementsRange(skincareCategory!.id, streakStart, today),
    enabled: enabled && Boolean(skincareCategory),
  });
  useRefetchOnFocus(
    skincareRange.refetch,
    enabled && Boolean(skincareCategory)
  );
  const createCategory = useCreateCustomCategory();
  const saveEntry = useSaveCustomMeasurement();
  const deleteEntry = useDeleteCustomMeasurement();

  /**
   * Runs one tap. Nothing is written until the day has loaded (a day read as
   * empty while still loading would log it twice), nor while the same habit is
   * still saving. A failure says so; whatever did save is refreshed either way.
   */
  const run = async (
    key: HabitKey,
    ready: boolean,
    work: () => Promise<void>,
    after?: () => Promise<unknown>
  ) => {
    if (!ready || locks.current.has(key)) return;
    locks.current.add(key);
    setBusy((b) => ({ ...b, [key]: true }));
    try {
      await work();
    } catch (error) {
      addLog(
        `Habit ${key} failed to save: ${error instanceof Error ? error.message : String(error)}`,
        'ERROR'
      );
      Toast.show({
        type: 'error',
        text1: t('diary.habits.saveFailed', {
          defaultValue: "Couldn't save that. Try again.",
        }),
      });
    } finally {
      try {
        await after?.();
      } finally {
        locks.current.delete(key);
        setBusy((b) => ({ ...b, [key]: false }));
      }
    }
  };

  const nowIfToday = () => (date === today ? new Date().toISOString() : null);

  const brush: HabitState = {
    level: brushCount >= BRUSHES_PER_DAY ? 2 : brushCount > 0 ? 1 : 0,
    streak: oralCare.data?.streak ?? null,
    busy: busy.brush === true,
    toggle: () =>
      run('brush', oralCare.data != null, async () => {
        if (brushCount >= BRUSHES_PER_DAY) {
          const handLogged = (oralCare.data?.sessions ?? []).filter(
            (s) =>
              s.provider === 'manual' &&
              (s.care_type === 'brushing' || s.care_type === 'flossing')
          );
          for (const s of handLogged) await oralCareWrites.deleteSession(s.id);
          return;
        }
        const start_time = nowIfToday();
        await oralCareWrites.createSession({
          entry_date: date,
          care_type: 'brushing',
          start_time,
          provider: 'manual',
        });
        await oralCareWrites.createSession({
          entry_date: date,
          care_type: 'flossing',
          start_time,
          provider: 'manual',
        });
      }),
  };

  const meditate: HabitState = {
    level: mindfulness.sessions.length > 0 ? 2 : 0,
    streak: mindfulnessRange.data
      ? streakOf(
          mindfulnessRange.data.map((s) => s.entry_date),
          today
        )
      : null,
    busy: busy.meditate === true,
    toggle: () =>
      run('meditate', mindfulness.daySummary != null, async () => {
        if (mindfulness.sessions.length > 0) {
          const handLogged = mindfulness.sessions.filter(
            (s) => s.provider === 'manual'
          );
          for (const s of handLogged)
            await mindfulnessWrites.deleteSession(s.id);
          return;
        }
        await mindfulnessWrites.saveSession({
          entry_date: date,
          start_time: nowIfToday(),
          duration_seconds: MEDITATION_TAP_SECONDS,
          session_type: 'meditation',
          provider: 'manual',
        });
      }),
  };

  const skincare: HabitState = {
    level: skincareEntries.length > 0 ? 2 : 0,
    streak: !skincareCategory
      ? categories.data
        ? 0
        : null
      : skincareRange.data
        ? streakOf(
            skincareRange.data.map((e) => e.entry_date),
            today
          )
        : null,
    busy: busy.skincare === true,
    toggle: () =>
      run(
        'skincare',
        categories.data != null && dayEntries.data != null,
        async () => {
          if (skincareEntries.length > 0) {
            for (const e of skincareEntries)
              await deleteEntry.mutateAsync({ id: e.id, entryDate: date });
          } else {
            const category =
              skincareCategory ??
              (await createCategory.mutateAsync({
                name: SKINCARE_CATEGORY_NAME,
                measurement_type: 'times',
                frequency: 'Daily',
                data_type: 'numeric',
              }));
            await saveEntry.mutateAsync({
              category_id: category.id,
              value: 1,
              entry_date: date,
              source: 'manual',
            });
          }
        },
        // The save and delete hooks refresh only the day, so the streak's
        // range is refreshed here, after a failure too.
        () =>
          queryClient.invalidateQueries({
            queryKey: [...customMeasurementsRootQueryKey, 'range'],
          })
      ),
  };

  return { brush, meditate, skincare };
}
