import type { ExerciseSessionResponse } from '@workspace/shared';
import { walksAndRuns } from '../../src/utils/diaryWalksRuns';

const individual = (
  id: string,
  name: string,
  overrides: Record<string, unknown> = {}
) =>
  ({
    type: 'individual',
    id,
    name,
    exercise_snapshot: null,
    category: null,
    notes: null,
    duration_minutes: 30,
    distance: 3.2,
    entry_time: '08:00:00',
    activity_details: [],
    sets: [],
    ...overrides,
  }) as unknown as ExerciseSessionResponse;

test('picks out the walks and runs, earliest first', () => {
  const moves = walksAndRuns([
    individual('r', 'Running', { entry_time: '18:00:00', distance: 5 }),
    individual('w', 'Walking', { entry_time: '07:30:00' }),
    individual('h', 'Hiking', { entry_time: '12:00:00' }),
    individual('b', 'Biking'),
  ]);

  expect(moves.map((m) => [m.session.id, m.kind])).toEqual([
    ['w', 'walk'],
    ['h', 'walk'],
    ['r', 'run'],
  ]);
  expect(moves[2]?.distanceKm).toBe(5);
});

test('leaves out workouts, device summaries and rollups', () => {
  const moves = walksAndRuns([
    {
      type: 'preset',
      id: 'p',
      exercises: [],
    } as unknown as ExerciseSessionResponse,
    individual('cal', 'Active Calories'),
    individual('day', 'Walking', { duration_minutes: 1440 }),
    individual('zero', 'Walking', { duration_minutes: 0 }),
  ]);

  expect(moves).toEqual([]);
});

test('a walk with no distance keeps its time', () => {
  const [move] = walksAndRuns([
    individual('w', 'Walking', { distance: null, duration_minutes: 42 }),
  ]);
  expect(move).toEqual(
    expect.objectContaining({ kind: 'walk', distanceKm: null, minutes: 42 })
  );
});
