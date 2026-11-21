import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** The serving and amount last logged for one food. */
export interface RememberedServing {
  /** The serving option's own size and unit, e.g. 2 + "slice" or 100 + "g". */
  servingSize: number;
  servingUnit: string;
  /** The amount typed against that serving, e.g. 1 (slice) or 150 (g). */
  quantity: number;
  /** When it was logged (epoch ms); the oldest entries are dropped first. */
  at: number;
}

/** Keeps the store small; the least recently logged foods go first. */
export const MAX_REMEMBERED_FOODS = 500;

interface FoodServingMemoryState {
  servings: Record<string, RememberedServing>;
  remember: (keys: string[], serving: Omit<RememberedServing, 'at'>) => void;
  clear: () => void;
}

/** Drops the oldest entries once there are more than the cap. */
export function trimRememberedServings(
  servings: Record<string, RememberedServing>,
  max: number = MAX_REMEMBERED_FOODS
): Record<string, RememberedServing> {
  const entries = Object.entries(servings);
  if (entries.length <= max) return servings;
  return Object.fromEntries(
    entries.sort(([, a], [, b]) => b.at - a.at).slice(0, max)
  );
}

/**
 * Keys a food is remembered under. A saved food is keyed by its id; a
 * provider result by provider and external id, since it has no saved id
 * until it is first logged (the add screen then remembers both).
 */
export function servingMemoryKeyFor(item: {
  id: string;
  source?: string;
  provider_type?: string;
  provider_external_id?: string;
}): string | null {
  if (item.source === 'local') return item.id ? `food:${item.id}` : null;
  if (item.source === 'meal') return null;
  const provider = item.provider_type ?? item.source;
  const externalId = item.provider_external_id ?? item.id;
  return provider && externalId ? `ext:${provider}:${externalId}` : null;
}

/** Finds the serving option that matches what was remembered, if it still exists. */
export function findRememberedOption<
  T extends { servingSize: number; servingUnit: string },
>(options: T[], remembered: RememberedServing | undefined): T | undefined {
  if (!remembered) return undefined;
  const unit = remembered.servingUnit.trim().toLowerCase();
  return options.find(
    (option) =>
      option.servingSize === remembered.servingSize &&
      option.servingUnit.trim().toLowerCase() === unit
  );
}

/**
 * Device-local memory of the serving and amount last logged per food, so the
 * add screen opens on it next time. It never reaches the server: it is a
 * convenience for this phone, and losing it only means the food opens on its
 * default serving again.
 */
export const useFoodServingMemoryStore = create<FoodServingMemoryState>()(
  persist(
    (set) => ({
      servings: {},
      remember: (keys, serving) =>
        set((state) => {
          const at = Date.now();
          const next = { ...state.servings };
          for (const key of keys) next[key] = { ...serving, at };
          return { servings: trimRememberedServings(next) };
        }),
      clear: () => set({ servings: {} }),
    }),
    {
      name: '@SparkyFitness/food-serving-memory',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: (state) => ({ servings: state.servings }),
    }
  )
);
