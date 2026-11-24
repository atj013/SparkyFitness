import { useCallback } from 'react';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ExerciseSessionResponse } from '@workspace/shared';
import { useActiveWorkoutStore } from '../stores/activeWorkoutStore';
import { cardioSessionFromDiaryEntry } from '../utils/cardioSession';
import type { RootStackParamList } from '../types/navigation';
import { usePreferences } from './usePreferences';

type Navigator = Pick<
  NativeStackNavigationProp<RootStackParamList>,
  'navigate'
>;

/**
 * Opens a logged workout on the screen that shows it best: the live workout
 * screen while it is still running, the workout detail for a preset session,
 * the cardio stats for a synced or in-app run, walk or ride, and the activity
 * editor for anything else. The Diary, the Training calendar and an
 * exercise's History all open workouts through this.
 */
export function useOpenWorkout(navigation: Navigator) {
  const { preferences } = usePreferences();
  const distanceUnit =
    (preferences?.default_distance_unit as 'km' | 'miles') ?? 'km';

  return useCallback(
    (session: ExerciseSessionResponse) => {
      if (session.type === 'preset') {
        // The live workout's surface is the active screen; detail is for
        // reviewing past or planned sessions.
        if (useActiveWorkoutStore.getState().sessionId === session.id) {
          navigation.navigate('ActiveWorkout');
          return;
        }
        navigation.navigate('WorkoutDetail', { session });
        return;
      }
      const synced = cardioSessionFromDiaryEntry(session, distanceUnit);
      if (synced) {
        navigation.navigate('CardioSession', { session: synced, distanceUnit });
        return;
      }
      // A run, walk or ride logged in the app (a GPS recording or a watch run
      // is saved as an in-app entry) opens the stats screen too, with an Edit
      // button that hands over to the activity editor. Anything without a
      // distance or heart rate has nothing for that screen to show.
      const inApp =
        (session.distance ?? 0) > 0 || session.avg_heart_rate != null
          ? cardioSessionFromDiaryEntry(session, distanceUnit, {
              allowInApp: true,
            })
          : null;
      if (!inApp) {
        navigation.navigate('ActivityDetail', { session });
        return;
      }
      navigation.navigate('CardioSession', {
        session: inApp,
        distanceUnit,
        diaryEntry: session,
      });
    },
    [navigation, distanceUnit]
  );
}
