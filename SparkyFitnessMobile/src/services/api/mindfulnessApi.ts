import { apiFetch } from './apiClient';
import type {
  CreateMindfulnessSessionBody,
  MindfulnessSessionResponse,
  MindfulnessDaySummaryResponse,
} from '@workspace/shared';

export const fetchMindfulnessDaySummary = (
  date: string,
  userId?: string
): Promise<MindfulnessDaySummaryResponse> => {
  const params = new URLSearchParams({ date });
  if (userId) params.set('userId', userId);

  return apiFetch<MindfulnessDaySummaryResponse>({
    endpoint: `/api/v2/mindfulness/day-summary?${params.toString()}`,
    serviceName: 'Mindfulness API',
    operation: 'fetch day summary',
  });
};

/** The person's sessions between two days, both included. */
export const fetchMindfulnessSessionsRange = (
  startDate: string,
  endDate: string
): Promise<MindfulnessSessionResponse[]> => {
  const params = new URLSearchParams({ startDate, endDate });
  return apiFetch<MindfulnessSessionResponse[]>({
    endpoint: `/api/v2/mindfulness/entries?${params.toString()}`,
    serviceName: 'Mindfulness API',
    operation: 'fetch sessions range',
  });
};

export const updateMindfulnessSession = (
  id: string,
  data: Partial<CreateMindfulnessSessionBody>
): Promise<MindfulnessSessionResponse> => {
  return apiFetch<MindfulnessSessionResponse>({
    endpoint: `/api/v2/mindfulness/entries/${id}`,
    method: 'PUT',
    body: data,
    serviceName: 'Mindfulness API',
    operation: 'update mindfulness session',
  });
};

export const createMindfulnessSession = (
  data: CreateMindfulnessSessionBody
): Promise<MindfulnessSessionResponse> => {
  return apiFetch<MindfulnessSessionResponse>({
    endpoint: '/api/v2/mindfulness/entries',
    method: 'POST',
    body: data,
    serviceName: 'Mindfulness API',
    operation: 'create mindfulness session',
  });
};

export const deleteMindfulnessSession = (
  id: string
): Promise<{ success: boolean }> => {
  return apiFetch<{ success: boolean }>({
    endpoint: `/api/v2/mindfulness/entries/${id}`,
    method: 'DELETE',
    serviceName: 'Mindfulness API',
    operation: 'delete mindfulness session',
  });
};
