import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { MedicationEntry } from '@workspace/shared';

import { MedsTile } from '../../../src/components/diary/DiaryTiles';
import {
  useDeleteMedicationEntry,
  useLogDose,
  useMedicationEntries,
  useMedications,
} from '../../../src/hooks/useMedications';
import { entryMatchesDose, type DueDose } from '../../../src/utils/medications';
import {
  buildEntry,
  buildMedication,
  buildSchedule,
} from '../../helpers/medicationFixtures';

jest.mock('../../../src/hooks/useMedications', () => ({
  useMedications: jest.fn(),
  useMedicationEntries: jest.fn(),
  useLogDose: jest.fn(),
  useDeleteMedicationEntry: jest.fn(),
}));

// The other tiles' data hooks are not used by MedsTile.
jest.mock('../../../src/hooks/useMeasurements', () => ({
  useLatestMeasurementsOnOrBefore: jest.fn(),
}));
jest.mock('../../../src/hooks/useMeasurementsRange', () => ({
  useMeasurementsRange: jest.fn(),
}));
jest.mock('../../../src/hooks/useHydrationRange', () => ({
  useHydrationRange: jest.fn(),
}));

jest.mock('../../../src/utils/dateUtils', () => ({
  ...jest.requireActual('../../../src/utils/dateUtils'),
  getDeviceTimezone: () => 'UTC',
  getTodayDate: () => '2026-10-14',
}));

jest.mock('../../../src/components/Icon', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ name }: { name: string }) => <View testID={`icon-${name}`} />,
  };
});

jest.mock('uniwind', () => ({
  useCSSVariable: (keys: string | string[]) =>
    Array.isArray(keys) ? keys.map(() => '#111827') : '#111827',
}));

const DAY = '2026-10-14';

const vitamin = buildMedication({
  id: 'vit',
  schedules: [buildSchedule({ id: 'vit-am', medication_id: 'vit' })],
});
const thyroid = buildMedication({
  id: 'thy',
  schedules: [buildSchedule({ id: 'thy-am', medication_id: 'thy' })],
});
const evening = buildMedication({
  id: 'eve',
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

const mockLogDose = jest.fn();
const mockToggleTaken = jest.fn();
const mockLogPrn = jest.fn();
const mockDelete = jest.fn();

function setup(entries: MedicationEntry[]) {
  (useMedications as jest.Mock).mockReturnValue({
    data: [vitamin, thyroid, evening, anxiety],
    isLoading: false,
  });
  (useMedicationEntries as jest.Mock).mockReturnValue({
    data: entries,
    isLoading: false,
  });
  (useLogDose as jest.Mock).mockReturnValue({
    entryForDue: (due: DueDose) =>
      entries.find((e) =>
        entryMatchesDose(e, due.medication.id, due.schedule.id)
      ),
    logDose: mockLogDose,
    toggleTaken: mockToggleTaken,
    logPrn: mockLogPrn,
  });
  (useDeleteMedicationEntry as jest.Mock).mockReturnValue({
    mutate: mockDelete,
  });
  return render(<MedsTile date={DAY} enabled onPressTitle={jest.fn()} />);
}

describe('MedsTile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the morning, evening and as-needed circles, none taken', () => {
    const { getByTestId } = setup([]);
    for (const key of ['morning', 'evening', 'asNeeded']) {
      expect(getByTestId(`diary-meds-${key}`).props.accessibilityState).toEqual(
        { selected: false }
      );
    }
  });

  it('logs every pending morning dose with one tap', () => {
    const { getByTestId } = setup([]);
    fireEvent.press(getByTestId('diary-meds-morning'));

    expect(mockLogDose).toHaveBeenCalledTimes(2);
    expect(
      mockLogDose.mock.calls.map(([due, status]) => [due.schedule.id, status])
    ).toEqual([
      ['vit-am', 'taken'],
      ['thy-am', 'taken'],
    ]);
  });

  it('logs only the doses still pending when some were already taken', () => {
    const { getByTestId } = setup([
      buildEntry({ medication_id: 'vit', schedule_id: 'vit-am' }),
    ]);
    fireEvent.press(getByTestId('diary-meds-morning'));

    expect(mockLogDose).toHaveBeenCalledTimes(1);
    expect(mockLogDose.mock.calls[0][0].schedule.id).toBe('thy-am');
  });

  it('fills a circle once its doses are taken, and a tap then undoes them', () => {
    const { getByTestId } = setup([
      buildEntry({ id: 'e1', medication_id: 'vit', schedule_id: 'vit-am' }),
      buildEntry({ id: 'e2', medication_id: 'thy', schedule_id: 'thy-am' }),
    ]);
    const morning = getByTestId('diary-meds-morning');
    expect(morning.props.accessibilityState).toEqual({ selected: true });

    fireEvent.press(morning);

    expect(mockToggleTaken).toHaveBeenCalledTimes(2);
    expect(mockLogDose).not.toHaveBeenCalled();
  });

  it('logs the as-needed pill, and a tap on a filled circle removes the latest log', () => {
    const first = setup([]);
    fireEvent.press(first.getByTestId('diary-meds-asNeeded'));
    expect(mockLogPrn).toHaveBeenCalledWith(anxiety);
    first.unmount();

    const { getByTestId } = setup([
      buildEntry({
        id: 'prn-1',
        medication_id: 'anx',
        schedule_id: null,
        status: 'prn_taken',
        entry_date: DAY,
      }),
    ]);
    fireEvent.press(getByTestId('diary-meds-asNeeded'));
    expect(mockDelete).toHaveBeenCalledWith('prn-1');
  });

  it('renders nothing for someone with no medications', () => {
    (useMedications as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
    });
    (useMedicationEntries as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
    });
    (useLogDose as jest.Mock).mockReturnValue({
      entryForDue: jest.fn(),
      logDose: mockLogDose,
      toggleTaken: mockToggleTaken,
      logPrn: mockLogPrn,
    });
    (useDeleteMedicationEntry as jest.Mock).mockReturnValue({
      mutate: mockDelete,
    });
    const { toJSON } = render(
      <MedsTile date={DAY} enabled onPressTitle={jest.fn()} />
    );
    expect(toJSON()).toBeNull();
  });
});

describe('MedsTile inline', () => {
  beforeEach(() => jest.clearAllMocks());

  it('draws circles with streaks and opens medications on a long press', () => {
    // Both morning doses taken yesterday; nothing yet today.
    const yesterday = [
      buildEntry({
        id: 'a',
        medication_id: 'vit',
        schedule_id: 'vit-am',
        entry_date: '2026-10-13',
      }),
      buildEntry({
        id: 'b',
        medication_id: 'thy',
        schedule_id: 'thy-am',
        entry_date: '2026-10-13',
      }),
    ];
    setup([]);
    (useMedicationEntries as jest.Mock).mockImplementation(
      ({ fromDate, toDate }: { fromDate: string; toDate: string }) => ({
        data: fromDate === toDate ? [] : yesterday,
        isLoading: false,
      })
    );
    const onPressTitle = jest.fn();
    const { getByTestId, queryByText } = render(
      <MedsTile date={DAY} enabled inline onPressTitle={onPressTitle} />
    );

    expect(getByTestId('diary-meds-morning').props.accessibilityLabel).toMatch(
      /not taken, 1 day streak$/
    );
    expect(
      getByTestId('diary-meds-asNeeded').props.accessibilityLabel
    ).not.toMatch(/streak/);
    expect(queryByText('Meds')).toBeNull();

    fireEvent(getByTestId('diary-meds-evening'), 'longPress');
    expect(onPressTitle).toHaveBeenCalled();
  });
});
