import type { MedicationDetail, MedicationEntry } from '@workspace/shared';
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
