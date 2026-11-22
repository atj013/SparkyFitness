import { computeWeightChanges } from '../../src/utils/weightChanges';

const points = [
  { day: '2026-01-05', weight: 90 },
  { day: '2026-10-20', weight: 86 },
  { day: '2026-11-08', weight: 85.2 },
  { day: '2026-11-15', weight: 84.6 },
  { day: '2026-11-22', weight: 84 },
];

describe('computeWeightChanges', () => {
  it('compares the newest weigh-in with 7 days, 30 days and the first one', () => {
    const changes = computeWeightChanges(points, '2026-11-22');
    expect(changes.week).toBeCloseTo(-0.6); // vs Nov 15
    expect(changes.month).toBeCloseTo(-2); // vs Oct 20, the newest at least 30 days older
    expect(changes.allTime).toBeCloseTo(-6); // vs Jan 5
  });

  it('uses the newest weigh-in on or before the day viewed', () => {
    const changes = computeWeightChanges(points, '2026-11-15');
    expect(changes.week).toBeCloseTo(-0.6); // Nov 15 vs Nov 8
    expect(changes.allTime).toBeCloseTo(-5.4);
  });

  it('accepts points in any order', () => {
    const shuffled = [
      points[3]!,
      points[0]!,
      points[4]!,
      points[1]!,
      points[2]!,
    ];
    expect(computeWeightChanges(shuffled, '2026-11-22')).toEqual(
      computeWeightChanges(points, '2026-11-22')
    );
  });

  it('leaves a window empty when there is no weigh-in that far back', () => {
    const recent = [
      { day: '2026-11-18', weight: 85 },
      { day: '2026-11-22', weight: 84 },
    ];
    const changes = computeWeightChanges(recent, '2026-11-22');
    expect(changes.week).toBeNull();
    expect(changes.month).toBeNull();
    expect(changes.allTime).toBeCloseTo(-1);
  });

  it('returns nothing without weigh-ins, and no all-time change with only one', () => {
    expect(computeWeightChanges([], '2026-11-22')).toEqual({
      week: null,
      month: null,
      allTime: null,
    });
    expect(
      computeWeightChanges([{ day: '2026-11-22', weight: 84 }], '2026-11-22')
        .allTime
    ).toBeNull();
  });
});
