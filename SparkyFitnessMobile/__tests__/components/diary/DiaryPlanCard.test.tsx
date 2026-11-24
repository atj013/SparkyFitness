import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ExerciseSessionResponse } from '@workspace/shared';

import DiaryPlanCard from '../../../src/components/diary/DiaryPlanCard';
import { loadDailySummaryRawData } from '../../../src/services/dailySummaryService';
import type {
  WorkoutPlanAssignment,
  WorkoutPlanTemplate,
} from '../../../src/types/workoutPlans';

jest.mock('../../../src/services/dailySummaryService', () => ({
  loadDailySummaryRawData: jest.fn(),
}));
jest.mock('../../../src/utils/dateUtils', () => ({
  getTodayDate: () => '2026-11-18',
}));
jest.mock('../../../src/utils/calendarLocalization', () => ({
  useCalendarPresentation: () => ({
    appLocale: 'en',
    presentation: { locale: 'en', firstDayOfWeek: 0 },
  }),
  getCalendarWeekdayShortNames: () => ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
}));
jest.mock('../../../src/components/Icon', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: () => <View /> };
});
jest.mock('uniwind', () => ({
  useCSSVariable: () => '#111827',
}));

const monday: WorkoutPlanAssignment = {
  id: 'a-mon',
  template_id: 'plan-1',
  day_of_week: 1,
  sort_order: 0,
  workout_preset_id: 'p1',
  workout_preset_name: 'Upper',
  sets: [],
};
const wednesday: WorkoutPlanAssignment = {
  ...monday,
  id: 'a-wed',
  day_of_week: 3,
  workout_preset_name: 'Lower',
};

function plan(
  overrides: Partial<WorkoutPlanTemplate> = {}
): WorkoutPlanTemplate {
  return {
    id: 'plan-1',
    user_id: 'u1',
    plan_name: 'Strength',
    start_date: '2026-11-01',
    is_active: true,
    schedule_type: 'weekly',
    assignments: [monday, wednesday],
    next_assignment: wednesday,
    ...overrides,
  };
}

const session = (assignmentId: string) =>
  [
    { id: 1, workout_plan_assignment_id: assignmentId },
  ] as unknown as ExerciseSessionResponse[];

function renderCard(
  props: Partial<React.ComponentProps<typeof DiaryPlanCard>> = {}
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <DiaryPlanCard
        date="2026-11-18"
        plans={[plan()]}
        exerciseEntries={[]}
        onStart={jest.fn()}
        {...props}
      />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  (loadDailySummaryRawData as jest.Mock).mockReset();
  (loadDailySummaryRawData as jest.Mock).mockImplementation(
    async (day: string) => ({
      exerciseEntries: day === '2026-11-16' ? session('a-mon') : [],
    })
  );
});

describe('DiaryPlanCard', () => {
  it('shows only the session name with a Start button while it is due', () => {
    const onStart = jest.fn();
    const screen = renderCard({ onStart });

    expect(screen.getByText('Workout')).toBeTruthy();
    expect(screen.getByText('Lower')).toBeTruthy();
    expect(screen.queryByText(/Strength/)).toBeNull();

    fireEvent.press(screen.getByLabelText('Start Lower'));
    expect(onStart).toHaveBeenCalledWith(plan(), wednesday);
  });

  it('opens the logged workout from a line that is done', () => {
    const onOpenWorkout = jest.fn();
    const entries = session('a-wed');
    const screen = renderCard({ exerciseEntries: entries, onOpenWorkout });

    expect(screen.getByText('Done today')).toBeTruthy();
    expect(screen.queryByLabelText('Start Lower')).toBeNull();
    fireEvent.press(
      screen.getByLabelText('Strength, done today. Open the workout')
    );

    expect(onOpenWorkout).toHaveBeenCalledWith(entries[0]);
  });

  it('does not open anything from a line that is still to do', () => {
    const onOpenWorkout = jest.fn();
    const screen = renderCard({ onOpenWorkout });

    fireEvent.press(screen.getByText('Lower'));

    expect(onOpenWorkout).not.toHaveBeenCalled();
    expect(
      screen.queryByLabelText('Strength, done today. Open the workout')
    ).toBeNull();
  });

  it('fills the days of the week a plan session was logged', async () => {
    const screen = renderCard({ exerciseEntries: session('a-wed') });

    // Monday from its own day's diary, Wednesday from the selected day.
    await waitFor(() =>
      expect(screen.getAllByTestId('diary-plan-day-done')).toHaveLength(2)
    );
    expect(screen.getAllByTestId('diary-plan-day')).toHaveLength(5);
    expect(screen.getByLabelText('2 workout days this week')).toBeTruthy();

    // The week runs Sunday to Saturday; days after today are never fetched.
    const fetched = (loadDailySummaryRawData as jest.Mock).mock.calls.map(
      ([day]) => day
    );
    expect(fetched.sort()).toEqual(['2026-11-15', '2026-11-16', '2026-11-17']);
  });

  it('says Rest day on a day the plan has nothing on', () => {
    const screen = renderCard({
      plans: [plan({ next_assignment: null })],
    });
    expect(screen.getByText('Rest day')).toBeTruthy();
  });

  it('renders nothing without an active plan', () => {
    const screen = renderCard({ plans: [] });
    expect(screen.toJSON()).toBeNull();
    expect(loadDailySummaryRawData).not.toHaveBeenCalled();
  });
});
