import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StepsTile } from '../../../src/components/diary/DiaryTiles';
import type { DiaryMove } from '../../../src/utils/diaryWalksRuns';
import { initializeI18n } from '../../../src/localization/i18n';

let mockStepsData: { day: string; steps: number }[] = [];
jest.mock('../../../src/hooks/useMeasurementsRange', () => ({
  useMeasurementsRange: () => ({ stepsData: mockStepsData }),
}));
jest.mock('../../../src/hooks/useMeasurements', () => ({
  useLatestMeasurementsOnOrBefore: jest.fn(),
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

const move = (
  id: string,
  kind: 'run' | 'walk',
  distanceKm: number | null,
  minutes: number
): DiaryMove => ({
  session: { id } as DiaryMove['session'],
  kind,
  distanceKm,
  minutes,
});

const renderTile = (props: Partial<React.ComponentProps<typeof StepsTile>>) =>
  render(
    <StepsTile
      date="2026-11-23"
      steps={8400}
      goal={10000}
      enabled
      onPress={jest.fn()}
      {...props}
    />
  );

beforeAll(async () => {
  await initializeI18n('en');
});

test('a day with no walk or run shows the count against the goal', () => {
  renderTile({});
  expect(screen.getByText('8,400')).toBeTruthy();
  expect(screen.getByText('of 10,000')).toBeTruthy();
  expect(screen.queryByText(/%/)).toBeNull();
  expect(screen.queryByTestId('diary-steps-moves')).toBeNull();
});

test('lists each walk and run, and a tap opens it', () => {
  const onOpenMove = jest.fn();
  const walk = move('w1', 'walk', 3.14, 42);
  renderTile({
    moves: [walk, move('r1', 'run', null, 27)],
    onOpenMove,
  });

  expect(screen.getByText('3.1 km · 42 min')).toBeTruthy();
  expect(screen.getByText('27 min')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Walk, 3.1 km · 42 min. Open it'));
  expect(onOpenMove).toHaveBeenCalledWith(walk.session);
});

test('shows miles when that is the distance unit', () => {
  renderTile({ moves: [move('w1', 'walk', 5, 50)], distanceUnit: 'miles' });
  expect(screen.getByText('3.1 mi · 50 min')).toBeTruthy();
});

test('more than two become one summary that opens the day', () => {
  const onOpenMoves = jest.fn();
  renderTile({
    moves: [
      move('a', 'walk', 2, 20),
      move('b', 'walk', 1.5, 15),
      move('c', 'run', 3, 18),
    ],
    onOpenMoves,
  });

  expect(screen.getByText('3 walks and runs · 6.5 km')).toBeTruthy();
  fireEvent.press(screen.getByTestId('diary-steps-moves-summary'));
  expect(onOpenMoves).toHaveBeenCalled();
});

test('the last 7 days run across the middle with a day letter each', () => {
  mockStepsData = [
    { day: '2026-11-17', steps: 6000 },
    { day: '2026-11-18', steps: 9000 },
    { day: '2026-11-19', steps: 4000 },
    { day: '2026-11-20', steps: 11000 },
    { day: '2026-11-21', steps: 7000 },
    { day: '2026-11-22', steps: 8000 },
    { day: '2026-11-23', steps: 8400 },
  ];
  renderTile({});
  // Tuesday the 17th to Monday the 23rd.
  const week = screen.getByTestId('diary-steps-week');
  expect(week.children).toHaveLength(7);
  expect(screen.getAllByText('M')).toHaveLength(1);
  expect(screen.getAllByText('T')).toHaveLength(2);
  expect(screen.getAllByText('S')).toHaveLength(2);
  mockStepsData = [];
});
