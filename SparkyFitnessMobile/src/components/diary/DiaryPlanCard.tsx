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
  getLoggedAssignmentIds,
  getUncompletedActivePlans,
} from '../../utils/workoutPlanSchedule';

interface DiaryPlanCardProps {
  plans: WorkoutPlanTemplate[];
  exerciseEntries: ExerciseSessionResponse[];
  onStart: (
    plan: WorkoutPlanTemplate,
    assignment: WorkoutPlanAssignment
  ) => void;
}

/**
 * One line per active workout plan with a session still to do today: where in
 * the plan you are, today's session, and Start. Renders nothing once today's
 * session is logged, so the Food list above gets the room back.
 */
const DiaryPlanCard: React.FC<DiaryPlanCardProps> = ({
  plans,
  exerciseEntries,
  onStart,
}) => {
  const { t } = useTranslation();
  const accentPrimary = useCSSVariable('--color-accent-primary') as string;

  const pending = useMemo(
    () =>
      getUncompletedActivePlans(plans, getLoggedAssignmentIds(exerciseEntries)),
    [plans, exerciseEntries]
  );

  const rows = pending.flatMap((plan) => {
    const assignment =
      plan.next_assignment ??
      plan.next_assignments?.[0] ??
      plan.assignments?.[0];
    return assignment ? [{ plan, assignment }] : [];
  });

  if (rows.length === 0) return null;

  return (
    <View className="bg-surface rounded-xl shadow-sm px-3 py-2 gap-2">
      {rows.map(({ plan, assignment }) => {
        const sequential = plan.schedule_type === 'sequential';
        const position = sequential
          ? t(
              'exerciseSummary.sessionNumber',
              'Session {{current}} of {{total}}',
              {
                current: plan.sequence_position?.current ?? 1,
                total:
                  plan.sequence_position?.total ??
                  plan.assignments?.length ??
                  1,
              }
            )
          : t('exerciseSummary.scheduledToday', 'Scheduled Today');
        const sessionTitle =
          assignment.session_name ||
          plan.sequence_position?.session_name ||
          assignment.workout_preset_name ||
          assignment.exercise_name ||
          t('exerciseSummary.title', 'Exercise');
        return (
          <View
            key={plan.id}
            className="flex-row items-center gap-3"
            testID="diary-plan-row"
          >
            <View className="flex-1 gap-0.5">
              <View className="flex-row items-center gap-1.5">
                <Icon
                  name={sequential ? 'repeat' : 'calendar'}
                  size={13}
                  color={accentPrimary}
                />
                <Text
                  className="text-xs font-semibold text-text-secondary flex-1"
                  numberOfLines={1}
                >
                  {t('diary.plan.position', {
                    defaultValue: '{{plan}} • {{position}}',
                    plan: plan.plan_name,
                    position,
                  })}
                </Text>
              </View>
              <Text
                className="text-base font-bold text-text-primary"
                numberOfLines={1}
              >
                {sessionTitle}
              </Text>
            </View>
            <Pressable
              onPress={() => onStart(plan, assignment)}
              accessibilityRole="button"
              accessibilityLabel={t('diary.plan.startA11y', {
                defaultValue: 'Start {{session}}',
                session: sessionTitle,
              })}
              className="h-10 px-3.5 rounded-lg flex-row items-center gap-1.5 active:opacity-80"
              style={{ backgroundColor: accentPrimary }}
            >
              <Icon name="play" size={13} color="#ffffff" />
              <Text className="text-white text-sm font-bold">
                {t('exerciseSummary.startWorkout', { defaultValue: 'Start' })}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
};

export default DiaryPlanCard;
