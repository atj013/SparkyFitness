import React from 'react';
import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import { View } from 'react-native';
import DiaryHabitsCard from '../../../src/components/diary/DiaryHabitsCard';
import type { HabitState } from '../../../src/hooks/useDailyHabits';
import { initializeI18n } from '../../../src/localization/i18n';

const habit = (overrides: Partial<HabitState> = {}): HabitState => ({
  level: 0,
  streak: 0,
  busy: false,
  toggle: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

beforeAll(async () => {
  await initializeI18n('en');
});

test('shows each circle at its level with its streak', () => {
  render(
    <DiaryHabitsCard
      habits={{
        brush: habit({ level: 1, streak: 4 }),
        meditate: habit({ level: 2, streak: 12 }),
        skincare: habit({ streak: null }),
      }}
    />
  );

  expect(screen.getByTestId('diary-habit-brush-level-1')).toBeTruthy();
  expect(screen.getByTestId('diary-habit-meditate-level-2')).toBeTruthy();
  expect(screen.getByTestId('diary-habit-skincare-level-0')).toBeTruthy();
  expect(
    screen.getByLabelText(
      'Brush + Floss, morning done, tap again for the night, 4 day streak'
    )
  ).toBeTruthy();
  expect(screen.getByLabelText('Meditate, done, 12 day streak')).toBeTruthy();
  // No streak yet: nothing is read out for it.
  expect(screen.getByLabelText('Skincare, not done')).toBeTruthy();
});

test('a tap steps the habit on, but not while it is saving', () => {
  const brush = habit();
  const skincare = habit({ busy: true });
  render(<DiaryHabitsCard habits={{ brush, meditate: habit(), skincare }} />);

  fireEvent.press(screen.getByTestId('diary-habit-brush'));
  fireEvent.press(screen.getByTestId('diary-habit-skincare'));

  expect(brush.toggle).toHaveBeenCalledTimes(1);
  expect(skincare.toggle).not.toHaveBeenCalled();
});

test('draws what it is given (the meds row) inside the same card', () => {
  render(
    <DiaryHabitsCard
      habits={{ brush: habit(), meditate: habit(), skincare: habit() }}
    >
      <View testID="meds-row" />
    </DiaryHabitsCard>
  );

  expect(
    within(screen.getByTestId('diary-habits-card')).getByTestId('meds-row')
  ).toBeTruthy();
});
