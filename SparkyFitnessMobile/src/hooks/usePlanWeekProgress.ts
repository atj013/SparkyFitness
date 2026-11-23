import { useQueries } from '@tanstack/react-query';
import type { ExerciseSessionResponse } from '@workspace/shared';
import {
  addDays,
  compareDays,
  dayOfWeek,
  weekStartOf,
} from '@workspace/shared';

import { loadDailySummaryRawData } from '../services/dailySummaryService';
import type { WorkoutPlanTemplate } from '../types/workoutPlans';
import { getTodayDate } from '../utils/dateUtils';
import {
  getLoggedAssignmentIds,
  isPlanLogged,
} from '../utils/workoutPlanSchedule';
import { dailySummaryQueryKey } from './queryKeys';

export interface PlanWeekDay {
  day: string;
  /** 0 = Sunday ... 6 = Saturday. */
  weekday: number;
  /** The plans with a session logged that day. */
  donePlanIds: ReadonlySet<string>;
  isToday: boolean;
}

/**
 * The seven days of the week holding `date`, each with the `plans` its diary
 * holds a session from. Reads the same daily summaries the
 * Diary shows, so swiping between days of the week costs no extra requests
 * and anything that refreshes a day refreshes its bubble. `date`'s own entries
 * come from the caller, which has already merged workouts waiting offline.
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
        donePlanIds: plansLoggedIn(
          plans,
          day === date ? dateEntries : (results[i]?.data ?? [])
        ),
        isToday: day === today,
      })),
  });
}

function plansLoggedIn(
  plans: readonly WorkoutPlanTemplate[],
  entries: readonly ExerciseSessionResponse[]
): Set<string> {
  const logged = getLoggedAssignmentIds(entries);
  return new Set(
    plans.filter((plan) => isPlanLogged(plan, logged)).map((plan) => plan.id)
  );
}
