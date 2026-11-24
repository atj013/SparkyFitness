import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useDailyHabits } from '../../src/hooks/useDailyHabits';
import {
  createOralCareSession,
  deleteOralCareSession,
  fetchOralCareDaySummary,
} from '../../src/services/api/oralCareApi';
import {
  createMindfulnessSession,
  deleteMindfulnessSession,
  fetchMindfulnessDaySummary,
  fetchMindfulnessSessionsRange,
} from '../../src/services/api/mindfulnessApi';
import {
  createCustomCategory,
  deleteCustomMeasurement,
  fetchCustomCategories,
  fetchCustomMeasurementsByDate,
  fetchCustomMeasurementsRange,
  saveCustomMeasurement,
} from '../../src/services/api/measurementsApi';
import Toast from 'react-native-toast-message';
import { createQueryWrapper, createTestQueryClient } from './queryTestUtils';

jest.mock('../../src/services/api/oralCareApi', () => ({
  fetchOralCareDaySummary: jest.fn(),
  fetchOralCareHistory: jest.fn(),
  createOralCareSession: jest.fn(),
  updateOralCareSession: jest.fn(),
  deleteOralCareSession: jest.fn(),
  saveOralCareSettings: jest.fn(),
}));
jest.mock('../../src/services/api/mindfulnessApi', () => ({
  fetchMindfulnessDaySummary: jest.fn(),
  fetchMindfulnessSessionsRange: jest.fn(),
  createMindfulnessSession: jest.fn(),
  updateMindfulnessSession: jest.fn(),
  deleteMindfulnessSession: jest.fn(),
}));
jest.mock('../../src/services/api/measurementsApi', () => ({
  fetchCustomCategories: jest.fn(),
  fetchCustomMeasurementsByDate: jest.fn(),
  fetchCustomMeasurementsRange: jest.fn(),
  fetchLatestManualCustomEntriesOnOrBefore: jest.fn(),
  saveCustomMeasurement: jest.fn(),
  deleteCustomMeasurement: jest.fn(),
  createCustomCategory: jest.fn(),
  updateCustomCategory: jest.fn(),
  deleteCustomCategory: jest.fn(),
}));
jest.mock('../../src/hooks/useRefetchOnFocus', () => ({
  useRefetchOnFocus: jest.fn(),
}));
jest.mock('../../src/hooks/refreshHealthSyncCache', () => ({
  refreshHealthSyncCache: jest.fn(),
}));
jest.mock('../../src/utils/dateUtils', () => ({
  ...jest.requireActual('../../src/utils/dateUtils'),
  getTodayDate: () => '2026-11-23',
}));

const DAY = '2026-11-23';

const oralSession = (id: string, care_type: string, provider = 'manual') => ({
  id,
  care_type,
  provider,
  entry_date: DAY,
});

const oralDay = (brushing_count: number, sessions: unknown[] = []) => ({
  entry_date: DAY,
  brushing_count,
  streak: 4,
  sessions,
});

const mindfulDay = (sessions: unknown[] = []) => ({
  entry_date: DAY,
  session_count: sessions.length,
  total_mindful_minutes: 0,
  total_duration_seconds: 0,
  sessions,
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(fetchOralCareDaySummary).mockResolvedValue(oralDay(0) as never);
  jest
    .mocked(fetchMindfulnessDaySummary)
    .mockResolvedValue(mindfulDay() as never);
  jest
    .mocked(fetchMindfulnessSessionsRange)
    .mockResolvedValue([
      { entry_date: '2026-11-22' },
      { entry_date: '2026-11-21' },
      { entry_date: '2026-11-19' },
    ] as never);
  jest.mocked(fetchCustomCategories).mockResolvedValue([]);
  jest.mocked(fetchCustomMeasurementsByDate).mockResolvedValue([]);
  jest.mocked(fetchCustomMeasurementsRange).mockResolvedValue([]);
  jest.mocked(createOralCareSession).mockResolvedValue({} as never);
  jest.mocked(deleteOralCareSession).mockResolvedValue({} as never);
  jest.mocked(createMindfulnessSession).mockResolvedValue({} as never);
  jest.mocked(deleteMindfulnessSession).mockResolvedValue({} as never);
  jest.mocked(createCustomCategory).mockResolvedValue({ id: 'cat-1' } as never);
  jest.mocked(saveCustomMeasurement).mockResolvedValue({} as never);
  jest.mocked(deleteCustomMeasurement).mockResolvedValue(undefined);
});

const renderHabits = () =>
  renderHook(() => useDailyHabits(DAY), {
    wrapper: createQueryWrapper(createTestQueryClient()),
  });

test('a brush tap logs a brushing and a flossing for the day', async () => {
  const { result } = renderHabits();
  await waitFor(() => expect(result.current.brush.streak).toBe(4));
  expect(result.current.brush.level).toBe(0);

  await act(() => result.current.brush.toggle());

  const types = jest
    .mocked(createOralCareSession)
    .mock.calls.map(([body]) => [body.care_type, body.entry_date]);
  expect(types).toEqual([
    ['brushing', DAY],
    ['flossing', DAY],
  ]);
});

test('morning and night show as half and full', async () => {
  jest.mocked(fetchOralCareDaySummary).mockResolvedValue(oralDay(1) as never);
  const { result } = renderHabits();
  await waitFor(() => expect(result.current.brush.level).toBe(1));
});

test('a full brush circle tapped again removes only hand-logged entries', async () => {
  jest
    .mocked(fetchOralCareDaySummary)
    .mockResolvedValue(
      oralDay(2, [
        oralSession('b1', 'brushing'),
        oralSession('f1', 'flossing'),
        oralSession('t1', 'brushing', 'timer'),
        oralSession('m1', 'mouthwash'),
      ]) as never
    );
  const { result } = renderHabits();
  await waitFor(() => expect(result.current.brush.level).toBe(2));

  await act(() => result.current.brush.toggle());

  expect(
    jest.mocked(deleteOralCareSession).mock.calls.map(([id]) => id)
  ).toEqual(['b1', 'f1']);
  expect(createOralCareSession).not.toHaveBeenCalled();
});

test('a meditate tap saves a 15 minute session; tapped full it removes it', async () => {
  const { result } = renderHabits();
  await waitFor(() => expect(result.current.meditate.streak).toBe(2));

  // What the day reads after the save refreshes it.
  jest.mocked(fetchMindfulnessDaySummary).mockResolvedValue(
    mindfulDay([
      { id: 's1', provider: 'manual' },
      { id: 's2', provider: 'health_connect' },
    ]) as never
  );
  await act(() => result.current.meditate.toggle());
  expect(createMindfulnessSession).toHaveBeenCalledWith(
    expect.objectContaining({
      entry_date: DAY,
      duration_seconds: 900,
      session_type: 'meditation',
    })
  );

  await waitFor(() => expect(result.current.meditate.level).toBe(2));
  await act(() => result.current.meditate.toggle());
  expect(
    jest.mocked(deleteMindfulnessSession).mock.calls.map(([id]) => id)
  ).toEqual(['s1']);
});

test('the first skincare tap makes the Skincare measurement, then logs it', async () => {
  const { result } = renderHabits();
  await waitFor(() => expect(result.current.skincare.streak).toBe(0));

  await act(() => result.current.skincare.toggle());

  expect(createCustomCategory).toHaveBeenCalledWith(
    expect.objectContaining({ name: 'Skincare', frequency: 'Daily' })
  );
  expect(saveCustomMeasurement).toHaveBeenCalledWith(
    expect.objectContaining({ category_id: 'cat-1', value: 1, entry_date: DAY })
  );
});

test('skincare done today counts a streak and a tap clears the day', async () => {
  jest
    .mocked(fetchCustomCategories)
    .mockResolvedValue([{ id: 'cat-1', name: 'skincare' }] as never);
  jest.mocked(fetchCustomMeasurementsByDate).mockResolvedValue([
    { id: 'e1', category_id: 'cat-1', entry_date: DAY },
    { id: 'x', category_id: 'other', entry_date: DAY },
  ] as never);
  jest
    .mocked(fetchCustomMeasurementsRange)
    .mockResolvedValue([
      { entry_date: '2026-11-22' },
      { entry_date: DAY },
    ] as never);
  const { result } = renderHabits();
  await waitFor(() => expect(result.current.skincare.streak).toBe(2));
  expect(result.current.skincare.level).toBe(2);

  await act(() => result.current.skincare.toggle());

  expect(
    jest.mocked(deleteCustomMeasurement).mock.calls.map(([id]) => id)
  ).toEqual(['e1']);
  expect(createCustomCategory).not.toHaveBeenCalled();
});

test('nothing is logged before the day has loaded', async () => {
  jest
    .mocked(fetchOralCareDaySummary)
    .mockReturnValue(new Promise(() => undefined));
  const { result } = renderHabits();

  await act(() => result.current.brush.toggle());

  expect(createOralCareSession).not.toHaveBeenCalled();
});

test('two quick taps log once', async () => {
  const { result } = renderHabits();
  await waitFor(() => expect(result.current.brush.streak).toBe(4));

  await act(async () => {
    await Promise.all([
      result.current.brush.toggle(),
      result.current.brush.toggle(),
    ]);
  });

  expect(createOralCareSession).toHaveBeenCalledTimes(2); // one brush, one floss
});

test('a failed save says so instead of throwing', async () => {
  jest.mocked(createMindfulnessSession).mockRejectedValue(new Error('offline'));
  const { result } = renderHabits();
  await waitFor(() => expect(result.current.meditate.streak).toBe(2));

  await act(() => result.current.meditate.toggle());

  expect(Toast.show).toHaveBeenCalledWith(
    expect.objectContaining({ text1: "Couldn't save that. Try again." })
  );
  expect(result.current.meditate.busy).toBe(false);
});
