import React from 'react';
import { render, within } from '@testing-library/react-native';

import { WeightTile } from '../../../src/components/diary/DiaryTiles';
import { useLatestMeasurementsOnOrBefore } from '../../../src/hooks/useMeasurements';
import { useWeightHistory } from '../../../src/hooks/useWeightHistory';

jest.mock('../../../src/hooks/useMeasurements', () => ({
  useLatestMeasurementsOnOrBefore: jest.fn(),
}));
jest.mock('../../../src/hooks/useWeightHistory', () => ({
  useWeightHistory: jest.fn(),
}));
// The other tiles' hooks are not used by WeightTile.
jest.mock('../../../src/hooks/useMeasurementsRange', () => ({
  useMeasurementsRange: jest.fn(),
}));
jest.mock('../../../src/hooks/useHydrationRange', () => ({
  useHydrationRange: jest.fn(),
}));
jest.mock('../../../src/hooks/useMedications', () => ({
  useMedications: jest.fn(),
  useMedicationEntries: jest.fn(),
  useLogDose: jest.fn(),
  useDeleteMedicationEntry: jest.fn(),
}));

jest.mock('../../../src/components/Icon', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: () => <View /> };
});

jest.mock('uniwind', () => ({
  useCSSVariable: (keys: string | string[]) =>
    Array.isArray(keys) ? keys.map(() => '#111827') : '#111827',
}));

const LB = 0.45359237;

describe('WeightTile', () => {
  it('shows the 7-day, 30-day and all-time change in pounds', () => {
    (useLatestMeasurementsOnOrBefore as jest.Mock).mockReturnValue({
      latestMeasurements: { weight: 200 * LB },
    });
    (useWeightHistory as jest.Mock).mockReturnValue({
      weights: [
        { day: '2026-01-05', weight: 215 * LB },
        { day: '2026-10-20', weight: 204 * LB },
        { day: '2026-11-15', weight: 201.4 * LB },
        { day: '2026-11-22', weight: 200 * LB },
      ],
    });

    const screen = render(
      <WeightTile
        date="2026-11-22"
        weightMode="lbs"
        enabled
        onPress={jest.fn()}
      />
    );

    expect(
      within(screen.getByTestId('diary-weight-change-week')).getByText(
        '−1.4 lb'
      )
    ).toBeTruthy();
    expect(
      within(screen.getByTestId('diary-weight-change-month')).getByText('−4 lb')
    ).toBeTruthy();
    expect(
      within(screen.getByTestId('diary-weight-change-allTime')).getByText(
        '−15 lb'
      )
    ).toBeTruthy();
  });

  it('shows a dash for a window with no weigh-in that far back', () => {
    (useLatestMeasurementsOnOrBefore as jest.Mock).mockReturnValue({
      latestMeasurements: { weight: 90 },
    });
    (useWeightHistory as jest.Mock).mockReturnValue({
      weights: [
        { day: '2026-11-20', weight: 91 },
        { day: '2026-11-22', weight: 90 },
      ],
    });

    const screen = render(
      <WeightTile
        date="2026-11-22"
        weightMode="kg"
        enabled
        onPress={jest.fn()}
      />
    );

    expect(
      within(screen.getByTestId('diary-weight-change-week')).getByText('—')
    ).toBeTruthy();
    expect(
      within(screen.getByTestId('diary-weight-change-allTime')).getByText(
        '−1 kg'
      )
    ).toBeTruthy();
  });
});
