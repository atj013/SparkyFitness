import { useQueries } from '@tanstack/react-query';
import type { ExerciseSessionResponse } from '@workspace/shared';
import {
  addDays,
  compareDays,
  dayOfWeek,
  isPassiveEntry,
  weekStartOf,
} from '@workspace/shared';

import { loadDailySummaryRawData } from '../services/dailySummaryService';
import type { WorkoutPlanTemplate } from '../types/workoutPlans';
import { getTodayDate } from '../utils/dateUtils';
import { dailySummaryQueryKey } from './queryKeys';

export interface PlanWeekDay {
  day: string;
  /** 0 = Sunday ... 6 = Saturday. */
  weekday: number;
  /** The diary holds a workout that day, from the plan or not. */
  workedOut: boolean;
  isToday: boolean;
}

/**
 * The seven days of the week holding `date`, each marked when its diary holds
 * a workout. Reads the same daily summaries the Diary shows, so swiping
 * between days of the week costs no extra requests and anything that
 * refreshes a day refreshes its bubble. `date`'s own entries come from the
 * caller, which has already merged workouts waiting offline.
 */
export function usePlanWeekProgress(
  date: string,
  firstDayOfWeek: number,
  plans: readonly WorkoutPlanTemplate[],
  dateEntries: readonly ExerciseSessionResponse[]
): PlanWeekDay[] {
  const today = getTodayDate();
  const start = weekStartOf(date, firstDayOfWeek);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const enabled = plans.length > 0;

  return useQueries({
    queries: days.map((day) => ({
      queryKey: dailySummaryQueryKey(day),
      queryFn: () => loadDailySummaryRawData(day),
      select: (raw: { exerciseEntries: ExerciseSessionResponse[] }) =>
        raw.exerciseEntries,
      // The selected day is passed in; future days cannot hold a workout.
      enabled: enabled && day !== date && compareDays(day, today) <= 0,
    })),
    combine: (results) =>
      days.map((day, i) => ({
        day,
        weekday: dayOfWeek(day),
        workedOut: (day === date ? dateEntries : (results[i]?.data ?? [])).some(
          isWorkout
        ),
        isToday: day === today,
      })),
  });
}

/**
 * A logged workout, not a synced daily rollup such as "Steps" or "Active
 * calories". A single exercise with sets counts even without a duration, as
 * a hand-logged strength exercise often has none.
 */
function isWorkout(session: ExerciseSessionResponse): boolean {
  if (session.type === 'preset') return true;
  if (session.sets.length > 0) return true;
  const name = session.name ?? session.exercise_snapshot?.name ?? null;
  return !isPassiveEntry({ name, durationMinutes: session.duration_minutes });
}
