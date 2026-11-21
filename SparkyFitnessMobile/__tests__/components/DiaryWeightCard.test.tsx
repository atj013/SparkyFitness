import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import DiaryWeightCard from '../../src/components/DiaryWeightCard';
import { useLatestMeasurementsOnOrBefore } from '../../src/hooks/useMeasurements';

jest.mock('../../src/hooks/useMeasurements', () => ({
  useLatestMeasurementsOnOrBefore: jest.fn(),
}));

const mockLatest = useLatestMeasurementsOnOrBefore as jest.MockedFunction<
  typeof useLatestMeasurementsOnOrBefore
>;

const latestWith = (weight: number | null) =>
  ({
    latestMeasurements:
      weight == null ? null : { entry_date: '2026-11-18', weight },
  }) as unknown as ReturnType<typeof useLatestMeasurementsOnOrBefore>;

describe('DiaryWeightCard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the latest weight in the display unit', () => {
    mockLatest.mockReturnValue(latestWith(82.3));
    const { getByTestId } = render(
      <DiaryWeightCard
        date="2026-11-21"
        weightMode="kg"
        enabled
        onPress={jest.fn()}
      />
    );
    expect(getByTestId('diary-weight-value')).toHaveTextContent('82.3 kg');
  });

  it('converts to pounds', () => {
    mockLatest.mockReturnValue(latestWith(100));
    const { getByTestId } = render(
      <DiaryWeightCard
        date="2026-11-21"
        weightMode="lbs"
        enabled
        onPress={jest.fn()}
      />
    );
    expect(getByTestId('diary-weight-value')).toHaveTextContent('220.5 lbs');
  });

  it('says when no weight has been logged, and opens the check-in on tap', () => {
    mockLatest.mockReturnValue(latestWith(null));
    const onPress = jest.fn();
    const { getByText, queryByTestId, getByTestId } = render(
      <DiaryWeightCard
        date="2026-11-21"
        weightMode="kg"
        enabled
        onPress={onPress}
      />
    );
    expect(getByText('No weight logged yet')).toBeTruthy();
    expect(queryByTestId('diary-weight-value')).toBeNull();
    fireEvent.press(getByTestId('diary-weight-card'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
