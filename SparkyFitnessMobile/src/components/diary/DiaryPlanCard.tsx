import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { useCSSVariable } from 'uniwind';
import type { ExerciseSessionResponse } from '@workspace/shared';

import Icon from '../Icon';
import { usePlanWeekProgress } from '../../hooks/usePlanWeekProgress';
import type {
  WorkoutPlanAssignment,
  WorkoutPlanTemplate,
} from '../../types/workoutPlans';
import {
  getCalendarWeekdayShortNames,
  useCalendarPresentation,
} from '../../utils/calendarLocalization';
import {
  findLoggedSessionForPlan,
  getLoggedAssignmentIds,
  isPlanLogged,
} from '../../utils/workoutPlanSchedule';

interface DiaryPlanCardProps {
  /** The Diary's selected day. */
  date: string;
  plans: WorkoutPlanTemplate[];
  exerciseEntries: ExerciseSessionResponse[];
  onStart: (
    plan: WorkoutPlanTemplate,
    assignment: WorkoutPlanAssignment
  ) => void;
  /** Opens the day's logged session from a plan row that is done. */
  onOpenWorkout?: (session: ExerciseSessionResponse) => void;
}

/**
 * One line per active workout plan: today's session with Start, a tick once it
 * is logged (the row then opens that workout), or a note when the plan has
 * nothing on today. Beside the title, the week's days as bubbles, filled on
 * each day that plan's session was logged.
 */
const DiaryPlanCard: React.FC<DiaryPlanCardProps> = ({
  date,
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
  const { appLocale, presentation } = useCalendarPresentation();
  const weekdayLetters = useMemo(
    () => getCalendarWeekdayShortNames(appLocale, 'narrow'),
    [appLocale]
  );
  const week = usePlanWeekProgress(
    date,
    presentation.firstDayOfWeek,
    plans,
    exerciseEntries
  );
  const logged = useMemo(
    () => getLoggedAssignmentIds(exerciseEntries),
    [exerciseEntries]
  );

  if (plans.length === 0) return null;

  return (
    <View className="bg-surface rounded-xl shadow-sm pl-3.5 pr-2.5 py-2.5 gap-2">
      {plans.map((plan) => {
        const assignment =
          plan.next_assignment ??
          plan.next_assignments?.[0] ??
          plan.assignments?.[0];
        const done = isPlanLogged(plan, logged);
        const due = !done && plan.next_assignment != null && assignment;
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
        const sessionTitle = due
          ? assignment.session_name ||
            plan.sequence_position?.session_name ||
            assignment.workout_preset_name ||
            assignment.exercise_name ||
            t('exerciseSummary.title', 'Exercise')
          : done
            ? t('diary.plan.doneToday', 'Done today')
            : t('diary.plan.nothingToday', 'Nothing planned today');
        const loggedSession =
          done && onOpenWorkout
            ? findLoggedSessionForPlan(plan, exerciseEntries)
            : null;
        return (
          <Pressable
            key={plan.id}
            className="flex-row items-center gap-3 active:opacity-80"
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
            <View className="flex-1 gap-0.5">
              <View className="flex-row items-center gap-1.5">
                <Icon
                  name={sequential ? 'repeat' : 'calendar'}
                  size={16}
                  color={planColor}
                />
                <Text
                  className="text-[13px] font-semibold text-text-secondary flex-1"
                  numberOfLines={1}
                >
                  {due
                    ? t('diary.plan.position', {
                        defaultValue: '{{plan}} • {{position}}',
                        plan: plan.plan_name,
                        position,
                      })
                    : plan.plan_name}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Text
                  className="text-lg font-bold text-text-primary shrink"
                  numberOfLines={1}
                >
                  {sessionTitle}
                </Text>
                <View
                  className="flex-row gap-0.5 ml-auto"
                  accessible
                  accessibilityLabel={t('diary.plan.weekA11y', {
                    count: week.filter((d) => d.donePlanIds.has(plan.id))
                      .length,
                    defaultValue: '{{count}} workout days this week',
                    defaultValue_one: '{{count}} workout day this week',
                    defaultValue_other: '{{count}} workout days this week',
                  })}
                  testID="diary-plan-week"
                >
                  {week.map(({ day, weekday, donePlanIds, isToday }) => {
                    const dayDone = donePlanIds.has(plan.id);
                    return (
                      <View
                        key={day}
                        testID={
                          dayDone ? 'diary-plan-day-done' : 'diary-plan-day'
                        }
                        className={`size-[18px] rounded-full items-center justify-center ${
                          dayDone
                            ? ''
                            : isToday
                              ? 'border-2'
                              : 'border border-border-strong'
                        }`}
                        style={
                          dayDone
                            ? { backgroundColor: planColor }
                            : isToday
                              ? { borderColor: planColor }
                              : undefined
                        }
                      >
                        <Text
                          className={`text-[9px] font-bold ${
                            dayDone ? 'text-diary-on' : 'text-text-secondary'
                          }`}
                        >
                          {weekdayLetters[weekday]}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
            {due ? (
              <Pressable
                onPress={() => onStart(plan, assignment)}
                accessibilityRole="button"
                accessibilityLabel={t('diary.plan.startA11y', {
                  defaultValue: 'Start {{session}}',
                  session: sessionTitle,
                })}
                className="h-10 px-4 rounded-xl flex-row items-center gap-2 active:opacity-80"
                style={{ backgroundColor: planColor }}
              >
                <Icon name="play" size={15} color={onPlanColor} />
                <Text className="text-diary-on text-base font-bold">
                  {t('exerciseSummary.startWorkout', { defaultValue: 'Start' })}
                </Text>
              </Pressable>
            ) : done ? (
              <View className="flex-row items-center gap-1">
                <View
                  className="h-10 w-10 rounded-full items-center justify-center"
                  style={{ backgroundColor: planColor }}
                >
                  <Icon name="checkmark" size={18} color={onPlanColor} />
                </View>
                {loggedSession && (
                  <Icon name="chevron-forward" size={16} color={planColor} />
                )}
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
};

export default DiaryPlanCard;
