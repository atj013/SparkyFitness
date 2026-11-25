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
  /** Opens the day's logged session from a plan line that is done. */
  onOpenWorkout?: (session: ExerciseSessionResponse) => void;
  /** Opens the training calendar; a tap anywhere on the tile but its buttons. */
  onOpenCalendar?: () => void;
}

/**
 * The day's planned workout as a half-width tile beside the sleep tile: one
 * line per active plan with just the session's name ("Legs") and a round
 * Start button, a tick once it is logged (the line then opens that workout),
 * or "Rest day" when the plan has nothing on. Under it, the week's days as
 * small bubbles, filled on each day a workout was logged, from the plan or
 * not (synced daily rollups such as steps do not count).
 */
const DiaryPlanCard: React.FC<DiaryPlanCardProps> = ({
  date,
  plans,
  exerciseEntries,
  onStart,
  onOpenWorkout,
  onOpenCalendar,
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
  const daysDone = week.filter((d) => d.workedOut).length;

  return (
    // The tile is one big tap target for the calendar, but a screen reader
    // reaches it through the title row so the buttons inside stay reachable.
    <Pressable
      className="flex-1 bg-surface rounded-xl shadow-sm px-3 py-2.5 gap-1 justify-center"
      testID="diary-plan-card"
      onPress={onOpenCalendar}
      disabled={!onOpenCalendar}
      accessible={false}
    >
      <Pressable
        className="flex-row items-center gap-1.5"
        onPress={onOpenCalendar}
        disabled={!onOpenCalendar}
        accessibilityRole={onOpenCalendar ? 'button' : undefined}
        accessibilityLabel={
          onOpenCalendar
            ? t('diary.plan.calendarA11y', {
                defaultValue: 'Workout. Open the training calendar',
              })
            : undefined
        }
        testID="diary-plan-header"
      >
        <Icon
          name={plans[0].schedule_type === 'sequential' ? 'repeat' : 'calendar'}
          size={16}
          color={planColor}
        />
        <Text className="text-sm font-semibold text-diary-plan flex-1">
          {t('diary.plan.title', { defaultValue: 'Workout' })}
        </Text>
        {onOpenCalendar ? (
          <Icon name="chevron-forward" size={14} color={planColor} />
        ) : null}
      </Pressable>
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
          <View key={plan.id} className="gap-1.5">
            <Pressable
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
            <View
              className="flex-row justify-between"
              accessible
              accessibilityLabel={t('diary.plan.weekA11y', {
                count: daysDone,
                defaultValue: '{{count}} workout days this week',
                defaultValue_one: '{{count}} workout day this week',
                defaultValue_other: '{{count}} workout days this week',
              })}
              testID="diary-plan-week"
            >
              {week.map(({ day, weekday, workedOut: dayDone, isToday }) => {
                return (
                  <View
                    key={day}
                    testID={dayDone ? 'diary-plan-day-done' : 'diary-plan-day'}
                    className={`size-4 rounded-full items-center justify-center ${
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
                      className={`text-[8px] font-bold ${
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
        );
      })}
    </Pressable>
  );
};

export default DiaryPlanCard;
