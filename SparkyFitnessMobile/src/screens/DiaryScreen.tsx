import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  hasSupplementNutrition,
  isCardioModality,
  resolveExerciseModality,
  type ExerciseSessionResponse,
  type PresetSessionExerciseRequest,
} from '@workspace/shared';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import {
  Directions,
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCSSVariable } from 'uniwind';
import { useActiveWorkoutBarPadding } from '../components/ActiveWorkoutBar';
import { addSheetRef } from '../components/AddSheet';
import CalendarSheet, {
  type CalendarSheetRef,
} from '../components/CalendarSheet';
import CheckInPhotosSummary from '../components/CheckInPhotosSummary';
import DateNavigator from '../components/DateNavigator';
import DiaryCalorieMacroSummary from '../components/DiaryCalorieMacroSummary';
import ExerciseSummary from '../components/ExerciseSummary';
import DiaryFoodCard from '../components/diary/DiaryFoodCard';
import DiaryPlanCard from '../components/diary/DiaryPlanCard';
import DiarySleepCard from '../components/diary/DiarySleepCard';
import {
  MedsTile,
  StepsTile,
  WaterTile,
  WeightTile,
} from '../components/diary/DiaryTiles';
import { useWaterIntakeMutation } from '../hooks/useWaterIntakeMutation';
import ServingAdjustSheet, {
  type ServingAdjustSheetRef,
} from '../components/ServingAdjustSheet';
import { BedTimeCard, NapsCard } from '../components/SleepCards';
import StatusView from '../components/StatusView';
import { ServerStatusView } from '../components/ServerGate';
import OfflineBanner from '../components/OfflineBanner';
import { useOfflineDiaryDay } from '../hooks/useOfflineDiaryDay';
import { mergeWaitingWorkouts } from '../offline/diaryDay';
import {
  useCustomNutrients,
  useDailySummary,
  useFamilyUsers,
  useMealTypes,
  useNutrientDisplayPreferences,
  useServerConnection,
} from '../hooks';
import { useWorkoutPresets } from '../hooks/useWorkoutPresets';
import { getWorkoutPresetById } from '../services/api/workoutPresetsApi';
import RunProgramBanner from '../components/recording/RunProgramBanner';
import RunEffortPrompt from '../components/recording/RunEffortPrompt';
import ProgramRetestPrompt from '../components/recording/ProgramRetestPrompt';
import { useActiveWorkoutPlans } from '../hooks/useActiveWorkoutPlan';
import { useStartLiveWorkout } from '../hooks/useStartLiveWorkout';
import {
  useCheckInPhotoDates,
  useCheckInPhotosByDate,
} from '../hooks/useCheckInPhotos';
import { useExerciseImageSource } from '../hooks/useExerciseImageSource';
import { useDateColumnCollapsed } from '../hooks/useDateColumnCollapsed';
import { crossfadeHeaderColumn } from '../../modules/side-bar-metrics';
import { useHeaderActionColors } from '../hooks/useHeaderActionColors';
import { useMeasurements } from '../hooks/useMeasurements';
import { usePreferences } from '../hooks/usePreferences';
import { useSleepDay } from '../hooks/useSleepDay';
import { useNativeIOSTabsActive } from '../services/nativeTabBarPreference';
import { useVerticalBar } from '../hooks/useVerticalBar';
import { useActiveWorkoutStore } from '../stores/activeWorkoutStore';
import { useDiaryDateStore } from '../stores/diaryDateStore';
import type { RootStackParamList, TabParamList } from '../types/navigation';
import type {
  WorkoutPlanAssignment,
  WorkoutPlanTemplate,
} from '../types/workoutPlans';
import {
  formatDateLabel,
  getDateRelationToToday,
  toLocalDateString,
} from '../utils/dateUtils';
import { cardioSessionFromDiaryEntry } from '../utils/cardioSession';
import {
  liveExerciseConfigFromPreset,
  makeDefaultStartSet,
} from '../utils/workoutSession';
import type { LiveExerciseConfig } from '../utils/workoutSession';
import {
  setNativeHeaderDatePickerOptions,
  type NativeHeaderDatePickerNavigation,
} from '../utils/nativeHeaderDatePicker';
import { useAppFeatureOn } from '../stores/appFeatureTogglesStore';

type DiaryScreenProps = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Diary'>,
  NativeStackScreenProps<RootStackParamList>
>;

const DiaryScreen: React.FC<DiaryScreenProps> = ({ navigation }) => {
  const { t, i18n: translationI18n } = useTranslation();
  const dateLocale = translationI18n.language.startsWith('pl')
    ? 'pl-PL'
    : 'en-US';
  const insets = useSafeAreaInsets();
  const verticalBar = useVerticalBar();
  // A live activity lengthens the status cluster in a side-bar pose and can
  // push the date buttons onto the Add button; then only the calendar stays.
  const dateColumnCollapsed = useDateColumnCollapsed(verticalBar);
  const lastDateCollapsedRef = useRef<boolean | null>(null);
  const {
    isConnected,
    isLoading: isConnectionLoading,
    status: connectionStatus,
    refetch: recheckConnection,
  } = useServerConnection();
  // Set up but not answering: the diary then shows the day's workouts from
  // this phone (#1983) instead of the blocking message.
  const isOffline = !isConnectionLoading && connectionStatus === 'unreachable';
  const { data: familyUsers = [] } = useFamilyUsers({ enabled: isConnected });
  const familyDiaryOn = useAppFeatureOn('familyDiary');
  const hasFamilyDiaries =
    familyDiaryOn && isConnected && familyUsers.length > 0;
  const selectedDate = useDiaryDateStore((s) => s.selectedDate);
  const offlineDay = useOfflineDiaryDay(selectedDate);
  const waitingSessionIds = useMemo(
    () => new Set(offlineDay.waiting.map((session) => session.id)),
    [offlineDay.waiting]
  );
  const setSelectedDate = useDiaryDateStore((s) => s.setSelectedDate);
  const goToPreviousDay = useDiaryDateStore((s) => s.goToPreviousDay);
  const goToNextDay = useDiaryDateStore((s) => s.goToNextDay);
  const goToToday = useDiaryDateStore((s) => s.goToToday);
  const syncTodayRollover = useDiaryDateStore((s) => s.syncTodayRollover);
  const scrollViewRef = useRef<ScrollView>(null);
  const calendarRef = useRef<CalendarSheetRef>(null);
  const servingSheetRef = useRef<ServingAdjustSheetRef>(null);

  useFocusEffect(
    useCallback(() => {
      syncTodayRollover();
    }, [syncTodayRollover])
  );

  // Re-tapping the active Diary tab acts as a quick return to today's
  // entries and the top of the screen.
  useEffect(() => {
    return navigation.addListener('tabPress', () => {
      if (navigation.isFocused()) {
        goToToday();
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }
    });
  }, [navigation, goToToday]);

  useEffect(() => {
    navigation.setParams({ selectedDate });
  }, [navigation, selectedDate]);

  // The photo-day markers are fetched on first calendar open rather than at
  // mount: a user who never opens the picker should not pay a request for it.
  const [calendarOpened, setCalendarOpened] = useState(false);
  const { dates: photoDates } = useCheckInPhotoDates(calendarOpened);
  const { photos: dayPhotos } = useCheckInPhotosByDate(selectedDate);
  const openCalendar = useCallback(() => {
    setCalendarOpened(true);
    calendarRef.current?.present();
  }, []);
  const openFamilyDiaries = useCallback(
    () => navigation.navigate('FamilyMembers'),
    [navigation]
  );
  const familyDiariesAccessibilityLabel = t('familyDiary.openFamilyDiaries', {
    defaultValue: 'Open family diaries',
  });
  const accentColor = useCSSVariable('--color-accent-primary') as string;
  const datePastColor =
    (useCSSVariable('--color-date-past') as string) || '#f97316';
  const dateFutureColor =
    (useCSSVariable('--color-date-future') as string) || '#0ea5e9';
  const usesNativeTabs = useNativeIOSTabsActive();
  const { defaultColor: nativeHeaderActionColor } = useHeaderActionColors();

  const syncNativeHeaderDatePicker = useCallback(() => {
    if (!usesNativeTabs) return;
    // Beside a vertical bar, wait for the first measurement: setting all three
    // date buttons and collapsing a moment later makes the pill jump.
    if (dateColumnCollapsed === null) return;
    // The system swaps native bar items with no animation: when the group
    // changes under an already-visible pill, dissolve it instead of popping.
    // Only on the screen being looked at: the screen under a pushed one still
    // follows the live activity (so its buttons are right on return), and the
    // column on show then belongs to the screen on top.
    if (
      lastDateCollapsedRef.current !== null &&
      lastDateCollapsedRef.current !== dateColumnCollapsed &&
      navigation.isFocused()
    ) {
      crossfadeHeaderColumn();
    }
    lastDateCollapsedRef.current = dateColumnCollapsed;

    const relation = getDateRelationToToday(selectedDate);
    const dateTintColor =
      relation === 'past'
        ? datePastColor
        : relation === 'future'
          ? dateFutureColor
          : nativeHeaderActionColor;

    setNativeHeaderDatePickerOptions(
      navigation as unknown as NativeHeaderDatePickerNavigation,
      {
        selectedDate,
        onPreviousDate: goToPreviousDay,
        onDatePress: openCalendar,
        onNextDate: goToNextDay,
        tintColor: nativeHeaderActionColor,
        dateTintColor,
        compactCalendarButton: verticalBar,
        collapseToCalendar: dateColumnCollapsed ?? false,
        accessibilityLabel: t('diary.chooseDate', {
          defaultValue: 'Choose diary date',
        }),
        previousDayLabel: t('common.previousDay', {
          defaultValue: ': previous day',
        }),
        nextDayLabel: t('common.nextDay', { defaultValue: ': next day' }),
        dateLabel: `${formatDateLabel(selectedDate, t, dateLocale)} ▾`,
        t,
        locale: dateLocale,
        leadingAction: hasFamilyDiaries
          ? {
              sfSymbol: 'person.2.fill',
              onPress: openFamilyDiaries,
              accessibilityLabel: familyDiariesAccessibilityLabel,
              identifier: 'family-diaries',
            }
          : undefined,
      }
    );
  }, [
    dateFutureColor,
    dateLocale,
    datePastColor,
    familyDiariesAccessibilityLabel,
    goToNextDay,
    goToPreviousDay,
    hasFamilyDiaries,
    nativeHeaderActionColor,
    navigation,
    openCalendar,
    openFamilyDiaries,
    selectedDate,
    t,
    usesNativeTabs,
    verticalBar,
    dateColumnCollapsed,
  ]);

  useLayoutEffect(() => {
    syncNativeHeaderDatePicker();
  }, [syncNativeHeaderDatePicker]);

  useFocusEffect(
    useCallback(() => {
      syncNativeHeaderDatePicker();
    }, [syncNativeHeaderDatePicker])
  );

  const swipeGesture = useMemo(
    () =>
      Gesture.Race(
        Gesture.Fling()
          .direction(Directions.RIGHT)
          .onEnd(goToPreviousDay)
          .runOnJS(true),
        Gesture.Fling()
          .direction(Directions.LEFT)
          .onEnd(goToNextDay)
          .runOnJS(true)
      ),
    [goToPreviousDay, goToNextDay]
  );

  const handleCalendarSelect = useCallback(
    (date: string) => setSelectedDate(date),
    [setSelectedDate]
  );
  const { mealTypes } = useMealTypes();

  const { preferences } = usePreferences();
  const {
    increment: incrementWater,
    decrement: decrementWater,
    unit: waterUnit,
    isContainersLoaded,
    activeContainer: activeWaterContainer,
  } = useWaterIntakeMutation({ date: selectedDate, enabled: isConnected });
  const waterDisplayUnit = waterUnit || preferences?.water_display_unit || 'ml';
  const weightUnit = (preferences?.default_weight_unit as 'kg' | 'lbs') ?? 'kg';
  const distanceUnit =
    (preferences?.default_distance_unit as 'km' | 'miles') ?? 'km';
  const weightMode = preferences?.default_weight_unit ?? 'kg';
  const { getImageSource } = useExerciseImageSource();

  const { summary, isLoading, isError, refetch } = useDailySummary({
    date: selectedDate,
    enabled: isConnected,
  });
  const { measurements, refetch: refetchMeasurements } = useMeasurements({
    date: selectedDate,
    enabled: isConnected,
  });
  const { customNutrients, refetch: refetchCustomNutrients } =
    useCustomNutrients({ enabled: isConnected });
  const { preferences: nutrientPrefs, refetch: refetchNutrientPrefs } =
    useNutrientDisplayPreferences({ enabled: isConnected });

  const {
    wakeUp,
    naps,
    bedTime,
    isLoading: isSleepLoading,
    isForbidden: isSleepForbidden,
    refetch: refetchSleep,
  } = useSleepDay(selectedDate, { enabled: isConnected });

  const diaryNutrientRow = nutrientPrefs.find(
    (p) => p.view_group === 'diary' && p.platform === 'mobile'
  );
  const customNutrientKeys = (diaryNutrientRow?.visible_nutrients ?? []).slice(
    0,
    4
  );
  const { startLiveWorkout } = useStartLiveWorkout(navigation);
  const { plans: activePlans } = useActiveWorkoutPlans(selectedDate);
  const { presets: allPresets } = useWorkoutPresets();

  const handleStartPlanAssignment = useCallback(
    async (
      targetPlan: WorkoutPlanTemplate,
      assignment: WorkoutPlanAssignment
    ) => {
      if (!targetPlan) return;

      const isSequential = targetPlan.schedule_type === 'sequential';
      const sessionAssignments = isSequential
        ? targetPlan.assignments?.filter(
            (a) => (a.session_index ?? 1) === (assignment.session_index ?? 1)
          ) || [assignment]
        : targetPlan.assignments?.filter(
            (a) => a.day_of_week === assignment.day_of_week
          ) || [assignment];

      const startExercises: PresetSessionExerciseRequest[] = [];
      // Positional with startExercises: the preset's progression/ramp
      // settings, which the server session doesn't carry.
      const startConfigs: LiveExerciseConfig[] = [];

      for (let i = 0; i < sessionAssignments.length; i++) {
        const a = sessionAssignments[i]!;
        if (a.workout_preset_id) {
          let preset = allPresets.find(
            (p) => String(p.id) === String(a.workout_preset_id)
          );
          if (!preset) {
            try {
              preset = await getWorkoutPresetById(Number(a.workout_preset_id));
            } catch {
              // Ignore fetch error, fallback gracefully
            }
          }
          if (preset && preset.exercises) {
            preset.exercises.forEach((ex) => {
              const modality = resolveExerciseModality(
                ex.modality,
                ex.category
              );
              startConfigs.push(liveExerciseConfigFromPreset(ex));
              startExercises.push({
                exercise_id: ex.exercise_id,
                sort_order: startExercises.length,
                duration_minutes: 0,
                notes: null,
                superset_group: ex.superset_group ?? null,
                workout_plan_assignment_id: a.id ? Number(a.id) : null,
                sets:
                  ex.sets.length === 0
                    ? [makeDefaultStartSet(1, modality)]
                    : ex.sets.map((set, setIndex) => ({
                        set_number: setIndex + 1,
                        set_type: set.set_type ?? 'normal',
                        reps: set.reps ?? null,
                        weight: set.weight ?? null,
                        duration: set.duration ?? null,
                        distance: isCardioModality(modality)
                          ? (set.distance ?? null)
                          : null,
                        rest_time: isCardioModality(modality)
                          ? 0
                          : (set.rest_time ?? null),
                        notes: set.notes ?? null,
                        rpe: null,
                        completed_at: null,
                      })),
              });
            });
          }
        } else if (a.exercise_id) {
          const modality = resolveExerciseModality(a.modality, a.category);
          startConfigs.push(liveExerciseConfigFromPreset({}));
          startExercises.push({
            exercise_id: a.exercise_id,
            sort_order: startExercises.length,
            duration_minutes: 0,
            notes: null,
            superset_group: null,
            workout_plan_assignment_id: a.id ? Number(a.id) : null,
            sets:
              a.sets.length === 0
                ? [makeDefaultStartSet(1, modality)]
                : a.sets.map((set, setIndex) => ({
                    set_number: setIndex + 1,
                    set_type: set.set_type ?? 'normal',
                    reps: set.reps ?? null,
                    weight: set.weight ?? null,
                    duration: set.duration ?? null,
                    distance: isCardioModality(modality)
                      ? (set.distance ?? null)
                      : null,
                    rest_time: isCardioModality(modality)
                      ? 0
                      : (set.rest_time ?? null),
                    notes: set.notes ?? null,
                    rpe: null,
                    completed_at: null,
                  })),
          });
        }
      }

      if (startExercises.length === 0) return;

      const sessionName =
        assignment.session_name ||
        targetPlan.sequence_position?.session_name ||
        assignment.workout_preset_name ||
        assignment.exercise_name ||
        targetPlan.plan_name;

      const singlePresetId =
        sessionAssignments.length === 1 &&
        sessionAssignments[0]?.workout_preset_id
          ? Number(sessionAssignments[0].workout_preset_id)
          : undefined;

      await startLiveWorkout({
        name: sessionName,
        exercises: startExercises,
        exerciseConfigs: startConfigs,
        sourcePresetId: singlePresetId,
        workoutPlanAssignmentId: assignment.id
          ? Number(assignment.id)
          : undefined,
      });
    },
    [allPresets, startLiveWorkout]
  );

  const [refreshing, setRefreshing] = useState(false);
  const activeWorkoutBarPadding = useActiveWorkoutBarPadding();
  const onRefresh = useCallback(async () => {
    if (!isConnected) return;
    setRefreshing(true);
    // Error-isolated refresh: one failing query must not prevent the others
    // from completing nor produce an unhandled rejection. The spinner is torn
    // down in `finally` regardless of individual query outcomes.
    try {
      await Promise.allSettled([
        refetch(),
        refetchMeasurements(),
        refetchCustomNutrients(),
        refetchNutrientPrefs(),
        refetchSleep(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [
    isConnected,
    refetch,
    refetchMeasurements,
    refetchCustomNutrients,
    refetchNutrientPrefs,
    refetchSleep,
  ]);

  const isRefreshing = refreshing;

  // The first screen (summary, food, plan, tiles) is sized to the visible
  // height so it fits without scrolling; the Food list takes what is left.
  const [viewportHeight, setViewportHeight] = useState(0);
  const firstScreenBottomGap = 12 + activeWorkoutBarPadding;

  const openWorkout = (session: ExerciseSessionResponse) => {
    if (session.type === 'preset') {
      // The live workout's surface is the active screen; detail is
      // for reviewing past or planned sessions.
      if (useActiveWorkoutStore.getState().sessionId === session.id) {
        navigation.navigate('ActiveWorkout');
        return;
      }
      navigation.navigate('WorkoutDetail', { session });
    } else {
      const synced = cardioSessionFromDiaryEntry(session, distanceUnit);
      if (synced) {
        navigation.navigate('CardioSession', {
          session: synced,
          distanceUnit,
        });
        return;
      }
      // A run, walk or ride logged in the app (a GPS recording
      // or a watch run is saved as an in-app entry) opens the
      // stats screen too, with an Edit button that hands over to
      // the activity editor. Anything without a distance or heart
      // rate has nothing for that screen to show.
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
    }
  };

  const renderOfflineDay = () => {
    const sessions = mergeWaitingWorkouts(
      offlineDay.saved ?? [],
      offlineDay.waiting,
      offlineDay.deleted
    );
    return (
      <ScrollView
        className="flex-1 bg-background"
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: usesNativeTabs && verticalBar ? 12 : 8,
          paddingBottom: 80 + activeWorkoutBarPadding,
        }}
        contentInsetAdjustmentBehavior={usesNativeTabs ? 'automatic' : 'never'}
        automaticallyAdjustsScrollIndicatorInsets={usesNativeTabs}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => void recheckConnection()}
            tintColor={accentColor}
          />
        }
      >
        <OfflineBanner />
        <Text
          testID="diary-offline-note"
          className="text-sm text-text-secondary my-3"
        >
          {t('offline.diaryNote', {
            defaultValue:
              'Only workouts are available offline. Food and other entries need a connection.',
          })}
        </Text>
        {offlineDay.saved == null && sessions.length === 0 ? (
          <StatusView
            inline
            icon="cloud-offline"
            iconTone="muted"
            title={t('offline.diaryNothingSaved', {
              defaultValue: 'Nothing saved for this day',
            })}
          />
        ) : (
          <ExerciseSummary
            exerciseEntries={sessions}
            waitingSessionIds={waitingSessionIds}
            entryDate={selectedDate}
            getImageSource={getImageSource}
            weightUnit={weightUnit}
            distanceUnit={distanceUnit}
            onAddExercise={() =>
              addSheetRef.current?.present({ initialMenu: 'exercise' })
            }
            onPressPlanAssignment={handleStartPlanAssignment}
            onPressWorkout={openWorkout}
          />
        )}
      </ScrollView>
    );
  };

  const renderContent = () => {
    if (isOffline) return renderOfflineDay();
    if (!isConnectionLoading && !isConnected) {
      return <ServerStatusView />;
    }

    // Sleep is deliberately not part of this gate: the cards render nothing until their
    // entries arrive, so a slow `/api/sleep` fills them in late instead of holding the
    // food and exercise that already loaded behind "Loading diary...".
    if (isLoading || isConnectionLoading) {
      return (
        <StatusView
          loading
          title={t('diary.loading', { defaultValue: 'Loading diary...' })}
        />
      );
    }

    if (isError) {
      return (
        <StatusView
          icon="alert-circle"
          iconTone="danger"
          iconSize={64}
          title={t('diary.loadFailed', {
            defaultValue: 'Failed to load diary',
          })}
          subtitle={t('diary.checkConnection', {
            defaultValue: 'Please check your connection and try again.',
          })}
          action={{
            label: t('diary.retry', { defaultValue: 'Retry' }),
            onPress: () => refetch(),
            variant: 'primary',
          }}
        />
      );
    }

    if (!summary) {
      return null;
    }

    // Beside a vertical bar the gap under the large title is 12 pt, the same
    // as Dashboard, Library and Settings.
    const contentPaddingTop = usesNativeTabs && verticalBar ? 12 : 8;
    // The 8 is the gap above whatever sits below the first screen.
    const firstScreenMinHeight =
      viewportHeight > 0
        ? viewportHeight - contentPaddingTop - firstScreenBottomGap - 8
        : undefined;
    const showMacroSummary =
      summary.foodEntries.length > 0 ||
      hasSupplementNutrition(summary.supplementTotals) ||
      summary.exerciseEntries.length > 0 ||
      summary.calorieGoal > 0;
    const exerciseEntries = mergeWaitingWorkouts(
      summary.exerciseEntries,
      offlineDay.waiting,
      offlineDay.deleted
    );
    // Without a drink container to press, + opens the container screen so it
    // can be set up, rather than doing nothing.
    const waterIncrement = !isContainersLoaded
      ? undefined
      : activeWaterContainer
        ? incrementWater
        : () => navigation.navigate('WaterContainers');

    return (
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 bg-background"
        style={{ flex: 1 }}
        onLayout={(e) => setViewportHeight(e.nativeEvent.layout.height)}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: contentPaddingTop,
          paddingBottom: firstScreenBottomGap,
        }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        contentInsetAdjustmentBehavior={usesNativeTabs ? 'automatic' : 'never'}
        automaticallyAdjustsScrollIndicatorInsets={usesNativeTabs}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={accentColor}
          />
        }
      >
        {/* The first screen: everything here fits without scrolling. */}
        <View
          className="gap-2"
          style={{ minHeight: firstScreenMinHeight }}
          testID="diary-first-screen"
        >
          {showMacroSummary && (
            <DiaryCalorieMacroSummary
              summary={summary}
              showNetCarbs={preferences?.show_net_carbs === true}
              customNutrientKeys={customNutrientKeys}
              customNutrients={customNutrients}
            />
          )}
          <DiaryFoodCard
            foodEntries={summary.foodEntries}
            mealTypes={mealTypes}
            onAddFood={() =>
              navigation.navigate('FoodSearch', { date: selectedDate })
            }
            onAdjustServing={(entry) => servingSheetRef.current?.present(entry)}
          />
          {/* Without permission to read sleep (a 403) the card stays off. */}
          {!isSleepForbidden && (
            <DiarySleepCard
              entry={wakeUp}
              loading={isSleepLoading}
              onPress={(entry) =>
                navigation.navigate('SleepDetail', {
                  entryId: entry.id,
                  day: selectedDate,
                })
              }
              onPressEmpty={() => navigation.navigate('SleepAnalytics')}
            />
          )}
          <DiaryPlanCard
            date={selectedDate}
            plans={activePlans}
            exerciseEntries={exerciseEntries}
            onStart={handleStartPlanAssignment}
          />
          <View className="flex-row gap-2">
            <WeightTile
              date={selectedDate}
              weightMode={weightMode}
              enabled={isConnected}
              onPress={() => navigation.navigate('MeasurementsReport')}
            />
            <StepsTile
              date={selectedDate}
              steps={measurements?.steps}
              goal={summary.stepsGoal}
              enabled={isConnected}
              onPress={() =>
                navigation.navigate('MeasurementsReport', { range: '7d' })
              }
            />
          </View>
          <View className="flex-row gap-2">
            <WaterTile
              consumedMl={summary.waterConsumed}
              goalMl={summary.waterGoal}
              unit={waterDisplayUnit}
              enabled={isConnected}
              onPress={() =>
                navigation.navigate('HydrationReport', { range: '7d' })
              }
              onIncrement={waterIncrement}
              onDecrement={isContainersLoaded ? decrementWater : undefined}
              disableDecrement={summary.waterConsumed <= 0}
            />
            <MedsTile
              date={selectedDate}
              enabled={isConnected}
              onPressTitle={() => navigation.navigate('MedicationsList')}
            />
          </View>
        </View>

        {/* Below the first screen, only when the day has them: run-program
            prompts, naps, tonight's bedtime and progress photos. Logged
            workouts and measurements stay off the Diary (exercise history and
            the Measurements report have them); last night is the Sleep card. */}
        <View className="pt-2">
          <RunEffortPrompt
            date={selectedDate}
            today={toLocalDateString(new Date())}
          />
          <ProgramRetestPrompt
            date={selectedDate}
            today={toLocalDateString(new Date())}
            onRetest={() => navigation.navigate('FitnessTest')}
          />
          <RunProgramBanner
            date={selectedDate}
            exerciseEntries={summary.exerciseEntries}
            onStart={() =>
              navigation.navigate('RecordActivity', {
                programWorkout: true,
              })
            }
          />
          <NapsCard naps={naps} day={selectedDate} navigation={navigation} />
          <BedTimeCard
            entry={bedTime}
            day={selectedDate}
            navigation={navigation}
          />
          <CheckInPhotosSummary
            date={selectedDate}
            photos={dayPhotos}
            showEmptyPrompt={false}
            onPress={() =>
              navigation.navigate('ProgressPhotos', { date: selectedDate })
            }
          />
        </View>
      </ScrollView>
    );
  };

  const renderedContent = renderContent();

  if (usesNativeTabs) {
    return (
      <>
        <GestureDetector gesture={swipeGesture}>
          <View collapsable={false} className="flex-1">
            {renderedContent ?? <View className="flex-1 bg-background" />}
          </View>
        </GestureDetector>
        <CalendarSheet
          ref={calendarRef}
          selectedDate={selectedDate}
          onSelectDate={handleCalendarSelect}
          markedDates={photoDates}
        />
        <ServingAdjustSheet
          ref={servingSheetRef}
          onViewEntry={(entry) =>
            navigation.navigate('FoodEntryView', { entry })
          }
        />
      </>
    );
  }

  const content = (
    <>
      {!isConnectionLoading && (isConnected || isOffline) ? (
        <DateNavigator
          title={t('diary.title', { defaultValue: 'Diary' })}
          selectedDate={selectedDate}
          onPreviousDay={goToPreviousDay}
          onNextDay={goToNextDay}
          onToday={goToToday}
          onDatePress={openCalendar}
          action={
            hasFamilyDiaries
              ? {
                  icon: 'people',
                  accessibilityLabel: familyDiariesAccessibilityLabel,
                  onPress: openFamilyDiaries,
                }
              : undefined
          }
        />
      ) : (
        !isConnectionLoading && (
          <View className="px-4 pb-5" style={{ paddingTop: insets.top + 16 }}>
            <Text className="text-2xl font-bold text-text-primary">
              {t('diary.title', { defaultValue: 'Diary' })}
            </Text>
          </View>
        )
      )}
      {renderedContent}
      <CalendarSheet
        ref={calendarRef}
        selectedDate={selectedDate}
        onSelectDate={handleCalendarSelect}
        markedDates={photoDates}
      />
      <ServingAdjustSheet
        ref={servingSheetRef}
        onViewEntry={(entry) => navigation.navigate('FoodEntryView', { entry })}
      />
    </>
  );

  return (
    <>
      <GestureDetector gesture={swipeGesture}>
        <View className="flex-1 bg-background">{content}</View>
      </GestureDetector>
    </>
  );
};

export default DiaryScreen;
