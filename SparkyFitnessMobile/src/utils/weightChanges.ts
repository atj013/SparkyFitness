import { addDays } from './dateUtils';

export interface WeightPoint {
  /** YYYY-MM-DD */
  day: string;
  /** kg */
  weight: number;
}

export interface WeightChanges {
  /** kg; null when there is no weigh-in at least 7 days older. */
  week: number | null;
  /** kg; null when there is no weigh-in at least 30 days older. */
  month: number | null;
  /** kg since the first weigh-in; null with fewer than two weigh-ins. */
  allTime: number | null;
}

/**
 * How much the weight changed by the newest weigh-in on or before `asOf`:
 * against the newest weigh-in at least 7 and 30 days older, and against the
 * very first one. `points` may come in any order.
 */
export function computeWeightChanges(
  points: readonly WeightPoint[],
  asOf: string
): WeightChanges {
  const upTo = points
    .filter((p) => p.day <= asOf && Number.isFinite(p.weight) && p.weight > 0)
    .sort((a, b) => a.day.localeCompare(b.day));
  const latest = upTo[upTo.length - 1];
  if (!latest) return { week: null, month: null, allTime: null };

  const since = (days: number) => {
    const cutoff = addDays(latest.day, -days);
    for (let i = upTo.length - 1; i >= 0; i -= 1) {
      const point = upTo[i]!;
      if (point.day <= cutoff) return latest.weight - point.weight;
    }
    return null;
  };
  const first = upTo[0]!;
  return {
    week: since(7),
    month: since(30),
    allTime: upTo.length > 1 ? latest.weight - first.weight : null,
  };
}
