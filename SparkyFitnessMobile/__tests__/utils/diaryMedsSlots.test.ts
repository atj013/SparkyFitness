import { getDueDosesForDate } from '@workspace/shared';
import {
  buildDiaryMedsSlots,
  isMorningDose,
} from '../../src/utils/diaryMedsSlots';
import {
  buildEntry,
  buildMedication,
  buildSchedule,
} from '../helpers/medicationFixtures';

const DAY = '2026-10-14';

const vitamin = buildMedication({
  id: 'vit',
  name: 'Vitamin D',
  schedules: [
    buildSchedule({ id: 'vit-am', medication_id: 'vit', time_of_day: '08:00' }),
  ],
});
const thyroid = buildMedication({
  id: 'thy',
  name: 'Levothyroxine',
  schedules: [
    buildSchedule({ id: 'thy-am', medication_id: 'thy', time_of_day: '08:00' }),
  ],
});
const evening = buildMedication({
  id: 'eve',
  name: 'Evening pill',
  schedules: [
    buildSchedule({ id: 'eve-pm', medication_id: 'eve', time_of_day: '18:00' }),
  ],
});
const anxiety = buildMedication({
  id: 'anx',
  name: 'Hydroxyzine',
  schedules: [
    buildSchedule({
      id: 'anx-prn',
      medication_id: 'anx',
      schedule_type_id: 'prn',
      time_of_day: null,
    }),
  ],
});

const due = getDueDosesForDate([vitamin, thyroid, evening], DAY, 'UTC');

describe('isMorningDose', () => {
  it('puts doses before noon and doses with no time in the morning', () => {
    const at = (time: string | null) => ({
      medication: vitamin,
      schedule: { ...buildSchedule({ time_of_day: time }), id: 's' },
    });
    expect(isMorningDose(at('08:00'))).toBe(true);
    expect(isMorningDose(at('11:59'))).toBe(true);
    expect(isMorningDose(at(null))).toBe(true);
    expect(isMorningDose(at('12:00'))).toBe(false);
    expect(isMorningDose(at('18:00:00'))).toBe(false);
  });
});

describe('buildDiaryMedsSlots', () => {
  it('groups the 8 AM doses, the 6 PM dose and the as-needed medication', () => {
    const slots = buildDiaryMedsSlots(due, [anxiety], [], DAY);
    expect(slots.map((s) => s.key)).toEqual(['morning', 'evening', 'asNeeded']);
    const morning = slots[0];
    expect(morning?.key === 'morning' && morning.doses).toHaveLength(2);
    expect(slots.every((s) => !s.taken)).toBe(true);
  });

  it('fills the morning circle only once every morning dose is taken', () => {
    const oneTaken = [
      buildEntry({ medication_id: 'vit', schedule_id: 'vit-am' }),
    ];
    expect(buildDiaryMedsSlots(due, [], oneTaken, DAY)[0]?.taken).toBe(false);

    const bothTaken = [
      ...oneTaken,
      buildEntry({ id: 'e2', medication_id: 'thy', schedule_id: 'thy-am' }),
    ];
    expect(buildDiaryMedsSlots(due, [], bothTaken, DAY)[0]?.taken).toBe(true);
  });

  it('counts a skipped dose as handled but needs at least one taken', () => {
    const takenAndSkipped = [
      buildEntry({ medication_id: 'vit', schedule_id: 'vit-am' }),
      buildEntry({
        id: 'e2',
        medication_id: 'thy',
        schedule_id: 'thy-am',
        status: 'skipped',
      }),
    ];
    expect(buildDiaryMedsSlots(due, [], takenAndSkipped, DAY)[0]?.taken).toBe(
      true
    );

    const allSkipped = takenAndSkipped.map((e) => ({
      ...e,
      status: 'skipped' as const,
    }));
    expect(buildDiaryMedsSlots(due, [], allSkipped, DAY)[0]?.taken).toBe(false);
  });

  it('fills the as-needed circle from that day’s logs, newest first', () => {
    const entries = [
      buildEntry({
        id: 'early',
        medication_id: 'anx',
        schedule_id: null,
        status: 'prn_taken',
        taken_at: '2026-10-14T09:00:00.000Z',
      }),
      buildEntry({
        id: 'late',
        medication_id: 'anx',
        schedule_id: null,
        status: 'prn_taken',
        taken_at: '2026-10-14T15:00:00.000Z',
      }),
      buildEntry({
        id: 'yesterday',
        medication_id: 'anx',
        schedule_id: null,
        status: 'prn_taken',
        entry_date: '2026-10-13',
      }),
    ];
    const slot = buildDiaryMedsSlots([], [anxiety], entries, DAY)[0];
    expect(slot?.key).toBe('asNeeded');
    expect(slot?.taken).toBe(true);
    expect(slot?.key === 'asNeeded' && slot.entries.map((e) => e.id)).toEqual([
      'late',
      'early',
    ]);
  });

  it('leaves out circles with nothing behind them', () => {
    const morningOnly = getDueDosesForDate([vitamin], DAY, 'UTC');
    expect(
      buildDiaryMedsSlots(morningOnly, [], [], DAY).map((s) => s.key)
    ).toEqual(['morning']);
    expect(buildDiaryMedsSlots([], [], [], DAY)).toEqual([]);
  });
});
