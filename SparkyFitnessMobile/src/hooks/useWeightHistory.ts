import { useQuery } from '@tanstack/react-query';
import { fetchMeasurementsRange } from '../services/api/measurementsApi';
import { getTodayDate } from '../utils/dateUtils';
import type { WeightPoint } from '../utils/weightChanges';
import { measurementsRangeQueryKey } from './queryKeys';
import { useRefetchOnFocus } from './useRefetchOnFocus';

/** Earlier than any weigh-in the app can hold, so the range is everything. */
const HISTORY_START = '2000-01-01';

/**
 * Every weigh-in up to today, one per day (the newest that day), oldest first.
 * Shares the `measurementsRange` key family, so a check-in or health sync that
 * refreshes the other ranges refreshes this one too.
 */
export function useWeightHistory({
  enabled = true,
}: { enabled?: boolean } = {}) {
  const today = getTodayDate();
  const query = useQuery({
    queryKey: measurementsRangeQueryKey(HISTORY_START, today),
    queryFn: () => fetchMeasurementsRange(HISTORY_START, today),
    enabled,
    select: (rows): WeightPoint[] => {
      // The API returns rows newest-updated first, so the first row per day wins.
      const byDay = new Map<string, number>();
      for (const row of rows) {
        if (
          row.weight != null &&
          row.weight > 0 &&
          !byDay.has(row.entry_date)
        ) {
          byDay.set(row.entry_date, row.weight);
        }
      }
      return [...byDay.entries()]
        .map(([day, weight]) => ({ day, weight }))
        .sort((a, b) => a.day.localeCompare(b.day));
    },
  });
  useRefetchOnFocus(query.refetch, enabled);
  return { weights: query.data ?? [], isLoading: query.isLoading };
}
