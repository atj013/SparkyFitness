import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Features this phone can hide, beyond the server-backed ones in the shared
 * optional-features registry. These are kept on the device only, so they work
 * with any server version, and only change what the app shows: no data is
 * touched and turning one back on restores every entry point.
 */
export const APP_FEATURE_TOGGLE_KEYS = [
  'mealPlans',
  'fasting',
  'routes',
  'familyDiary',
] as const;

export type AppFeatureToggleKey = (typeof APP_FEATURE_TOGGLE_KEYS)[number];

interface AppFeatureTogglesState {
  /** Only features switched off are stored; a missing key means on. */
  off: Partial<Record<AppFeatureToggleKey, true>>;
  setOn: (key: AppFeatureToggleKey, on: boolean) => void;
}

export const useAppFeatureTogglesStore = create<AppFeatureTogglesState>()(
  persist(
    (set) => ({
      off: {},
      setOn: (key, on) =>
        set((state) => {
          const off = { ...state.off };
          if (on) delete off[key];
          else off[key] = true;
          return { off };
        }),
    }),
    {
      name: '@SparkyFitness/app-feature-toggles',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: (state) => ({ off: state.off }),
    }
  )
);

/** Whether a phone-only feature shows in the app (on unless switched off). */
export function useAppFeatureOn(key: AppFeatureToggleKey): boolean {
  return useAppFeatureTogglesStore((state) => !state.off[key]);
}
