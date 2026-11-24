import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { useCSSVariable } from 'uniwind';
import type { ExerciseSessionResponse } from '@workspace/shared';

import Icon from '../Icon';
import type {
  WorkoutPlanAssignment,
  WorkoutPlanTemplate,
} from '../../types/workoutPlans';
import {
  findLoggedSessionForPlan,
  getLoggedAssignmentIds,
  isPlanLogged,
} from '../../utils/workoutPlanSchedule';

interface DiaryPlanCardProps {
  plans: WorkoutPlanTemplate[];
  exerciseEntries: ExerciseSessionResponse[];
  onStart: (
    plan: WorkoutPlanTemplate,
    assignment: WorkoutPlanAssignment
  ) => void;
  /** Opens the day's logged session from a plan line that is done. */
  onOpenWorkout?: (session: ExerciseSessionResponse) => void;
}

/**
 * The day's planned workout as a half-width tile beside the sleep tile: one
 * line per active plan with just the session's name ("Legs") and a round
 * Start button, a tick once it is logged (the line then opens that workout),
 * or "Rest day" when the plan has nothing on.
 */
const DiaryPlanCard: React.FC<DiaryPlanCardProps> = ({
  plans,
  exerciseEntries,
  onStart,
  onOpenWorkout,
}) => {
  const { t } = useTranslation();
  const [planColor, onPlanColor] = useCSSVariable([
    '--color-diary-plan',
    '--color-diary-on',
  ]) as string[];
  const logged = useMemo(
    () => getLoggedAssignmentIds(exerciseEntries),
    [exerciseEntries]
  );

  if (plans.length === 0) return null;

  return (
    <View
      className="flex-1 bg-surface rounded-xl shadow-sm px-3 py-2.5 gap-1 justify-center"
      testID="diary-plan-card"
    >
      <View className="flex-row items-center gap-1.5">
        <Icon
          name={plans[0].schedule_type === 'sequential' ? 'repeat' : 'calendar'}
          size={16}
          color={planColor}
        />
        <Text className="text-sm font-semibold text-diary-plan flex-1">
          {t('diary.plan.title', { defaultValue: 'Workout' })}
        </Text>
      </View>
      {plans.map((plan) => {
        const assignment =
          plan.next_assignment ??
          plan.next_assignments?.[0] ??
          plan.assignments?.[0];
        const done = isPlanLogged(plan, logged);
        const due = !done && plan.next_assignment != null && assignment;
        const sessionTitle = due
          ? assignment.session_name ||
            plan.sequence_position?.session_name ||
            assignment.workout_preset_name ||
            assignment.exercise_name ||
            t('exerciseSummary.title', 'Exercise')
          : done
            ? t('diary.plan.doneToday', 'Done today')
            : t('diary.plan.restDay', 'Rest day');
        const loggedSession =
          done && onOpenWorkout
            ? findLoggedSessionForPlan(plan, exerciseEntries)
            : null;
        return (
          <Pressable
            key={plan.id}
            className="flex-row items-center gap-2 active:opacity-80"
            testID="diary-plan-row"
            disabled={loggedSession == null}
            onPress={
              loggedSession && onOpenWorkout
                ? () => onOpenWorkout(loggedSession)
                : undefined
            }
            accessible={loggedSession != null}
            accessibilityRole={loggedSession ? 'button' : undefined}
            accessibilityLabel={
              loggedSession
                ? t('diary.plan.openA11y', {
                    defaultValue: '{{plan}}, done today. Open the workout',
                    plan: plan.plan_name,
                  })
                : undefined
            }
          >
            <Text
              className={`flex-1 ${
                due || done
                  ? 'text-[19px] font-bold text-text-primary'
                  : 'text-[15px] text-text-secondary'
              }`}
              numberOfLines={1}
            >
              {sessionTitle}
            </Text>
            {due ? (
              <Pressable
                onPress={() => onStart(plan, assignment)}
                accessibilityRole="button"
                accessibilityLabel={t('diary.plan.startA11y', {
                  defaultValue: 'Start {{session}}',
                  session: sessionTitle,
                })}
                hitSlop={4}
                className="w-9 h-9 rounded-full items-center justify-center active:opacity-80"
                style={{ backgroundColor: planColor }}
              >
                <Icon name="play" size={16} color={onPlanColor} />
              </Pressable>
            ) : done ? (
              <View
                className="w-9 h-9 rounded-full items-center justify-center"
                style={{ backgroundColor: planColor }}
              >
                <Icon name="checkmark" size={18} color={onPlanColor} />
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
};

export default DiaryPlanCard;
