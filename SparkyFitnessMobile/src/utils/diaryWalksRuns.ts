import {
  classifyActivitySport,
  isPassiveEntry,
  type ExerciseSessionResponse,
  type IndividualSessionResponse,
} from '@workspace/shared';

export type DiaryMoveKind = 'run' | 'walk';

export interface DiaryMove {
  session: IndividualSessionResponse;
  kind: DiaryMoveKind;
  /** Null when the workout carries no distance. */
  distanceKm: number | null;
  minutes: number;
}

/**
 * The day's walks and runs, for the Diary's Steps card: single workouts (a
 * watch session, a phone recording) the shared classifier calls running,
 * walking or hiking, earliest first. Daily rollups and device summaries are
 * left out by the same rule the training calendar uses.
 */
export function walksAndRuns(
  sessions: readonly ExerciseSessionResponse[]
): DiaryMove[] {
  const moves: DiaryMove[] = [];
  for (const session of sessions) {
    if (session.type !== 'individual') continue;
    const name = session.name ?? session.exercise_snapshot?.name ?? null;
    if (isPassiveEntry({ name, durationMinutes: session.duration_minutes })) {
      continue;
    }
    const detail = session.activity_details[0];
    const { sport } = classifyActivitySport({
      exerciseName: name,
      category: session.category ?? session.exercise_snapshot?.category,
      notes: session.notes,
      providerName: detail?.provider_name,
      detailData: detail?.detail_data,
    });
    const kind: DiaryMoveKind | null =
      sport === 'running'
        ? 'run'
        : sport === 'walking' || sport === 'hiking'
          ? 'walk'
          : null;
    if (!kind) continue;
    moves.push({
      session,
      kind,
      distanceKm:
        session.distance != null && session.distance > 0
          ? session.distance
          : null,
      minutes: session.duration_minutes,
    });
  }
  return moves.sort((a, b) =>
    String(a.session.entry_time ?? '').localeCompare(
      String(b.session.entry_time ?? '')
    )
  );
}
