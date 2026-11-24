import {
  addDays,
  getDueDosesForDate,
  type MedicationDetail,
  type MedicationEntry,
} from '@workspace/shared';
import { doseSlotStatus, entryMatchesDose, type DueDose } from './medications';

/**
 * The Diary's Meds tile shows at most three circles, filled from the user's own
 * schedules with nothing to set up: everything scheduled before noon, everything
 * scheduled from noon on, and the as-needed medication.
 */
export type DiaryMedsSlotKey = 'morning' | 'evening' | 'asNeeded';

interface ScheduledSlot {
  key: 'morning' | 'evening';
  doses: DueDose[];
  /** Every dose in the slot is taken or skipped, and at least one is taken. */
  taken: boolean;
}

interface AsNeededSlot {
  key: 'asNeeded';
  medication: MedicationDetail;
  /** Today's as-needed logs, newest first. */
  entries: MedicationEntry[];
  taken: boolean;
}

export type DiaryMedsSlot = ScheduledSlot | AsNeededSlot;

const NOON = '12:00';

/** A dose with no time of day counts as a morning dose. */
export function isMorningDose(due: DueDose): boolean {
  const time = due.schedule.time_of_day;
  return !time || time < NOON;
}

function scheduledSlot(
  key: 'morning' | 'evening',
  doses: DueDose[],
  entries: MedicationEntry[]
): ScheduledSlot {
  const statuses = doses.map((due) =>
    doseSlotStatus(
      entries.find((e) =>
        entryMatchesDose(e, due.medication.id, due.schedule.id)
      )
    )
  );
  return {
    key,
    doses,
    taken:
      statuses.length > 0 &&
      !statuses.includes('pending') &&
      statuses.includes('taken'),
  };
}

/**
 * Builds the tile's circles for one day. A circle with nothing behind it is left
 * out, so a user with no evening doses sees two circles, not an empty one.
 */
export function buildDiaryMedsSlots(
  dueDoses: DueDose[],
  prnMedications: MedicationDetail[],
  entries: MedicationEntry[],
  date: string
): DiaryMedsSlot[] {
  const slots: DiaryMedsSlot[] = [];
  const morning = dueDoses.filter(isMorningDose);
  const evening = dueDoses.filter((due) => !isMorningDose(due));
  if (morning.length > 0)
    slots.push(scheduledSlot('morning', morning, entries));
  if (evening.length > 0)
    slots.push(scheduledSlot('evening', evening, entries));

  const prn = prnMedications[0];
  if (prn) {
    const prnEntries = entries
      .filter(
        (e) =>
          e.medication_id === prn.id &&
          e.status === 'prn_taken' &&
          e.entry_date === date
      )
      .sort((a, b) =>
        String(b.taken_at ?? '').localeCompare(String(a.taken_at ?? ''))
      );
    slots.push({
      key: 'asNeeded',
      medication: prn,
      entries: prnEntries,
      taken: prnEntries.length > 0,
    });
  }
  return slots;
}

/**
 * Days in a row each scheduled circle (morning, evening) was filled, by the
 * same rule that fills it on the Diary. Today does not break a streak while it
 * is still open, and a day with nothing due in that circle neither counts nor
 * breaks it. `entries` covers the days from `windowStart` to `today`; the
 * as-needed circle has no schedule to keep, so no streak.
 */
export function diaryMedsSlotStreaks(
  medications: MedicationDetail[],
  entries: MedicationEntry[],
  today: string,
  windowStart: string,
  timezone: string
): Partial<Record<'morning' | 'evening', number>> {
  const byDay = new Map<string, MedicationEntry[]>();
  for (const entry of entries) {
    const list = byDay.get(entry.entry_date) ?? [];
    list.push(entry);
    byDay.set(entry.entry_date, list);
  }
  const slotsByDay = new Map<string, DiaryMedsSlot[]>();
  const slotsOn = (day: string) => {
    let slots = slotsByDay.get(day);
    if (!slots) {
      slots = buildDiaryMedsSlots(
        getDueDosesForDate(medications, day, timezone),
        [],
        byDay.get(day) ?? [],
        day
      );
      slotsByDay.set(day, slots);
    }
    return slots;
  };

  const streaks: Partial<Record<'morning' | 'evening', number>> = {};
  for (const key of ['morning', 'evening'] as const) {
    let streak = 0;
    for (let day = today; day >= windowStart; day = addDays(day, -1)) {
      const slot = slotsOn(day).find((s) => s.key === key);
      if (!slot) continue;
      if (slot.taken) streak += 1;
      else if (day !== today) break;
    }
    streaks[key] = streak;
  }
  return streaks;
}
