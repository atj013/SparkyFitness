import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useCSSVariable } from 'uniwind';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useActiveWorkoutBarPadding } from '../components/ActiveWorkoutBar';
import { useNativeIOSTabsActive } from '../services/nativeTabBarPreference';
import { useVerticalBar } from '../hooks/useVerticalBar';
import { useNavigationActionGuard } from '../hooks/useNavigationActionGuard';
import { useMobileFeatures } from '../hooks/useMobileFeatures';
import Button from '../components/ui/Button';
import CreateTile from '../components/CreateTile';
import FoodLibraryRow from '../components/FoodLibraryRow';
import Icon from '../components/Icon';
import SettingsRow, { SettingsRowGroup } from '../components/SettingsRow';
import { programTitle } from '../components/recording/RunProgramCard';
import { useRunProgram } from '../services/runProgramService';
import MealLibraryRow from '../components/MealLibraryRow';
import StatusView from '../components/StatusView';
import { ServerStatusView } from '../components/ServerGate';
import OfflineLibrary from '../components/OfflineLibrary';
import {
  useFavorites,
  useFoods,
  useMeals,
  useMedications,
  useWaterContainersQuery,
  useRecentMeals,
  useServerConnection,
  useSuggestedExercises,
} from '../hooks';
import { fetchExercisesCount } from '../services/api/exerciseApi';
import { fetchFoodsPage } from '../services/api/foodsApi';
import { fetchWorkoutPresetsPage } from '../services/api/workoutPresetsApi';
import type { Exercise } from '../types/exercise';
import { foodItemToFoodInfo } from '../types/foodInfo';
import type { FoodItem } from '../types/foods';
import type { Meal } from '../types/meals';
import type { RootStackParamList, TabParamList } from '../types/navigation';
import { useAppFeatureOn } from '../stores/appFeatureTogglesStore';

type LibraryScreenProps = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Library'>,
  NativeStackScreenProps<RootStackParamList>
>;

const RECENT_LIMIT = 4;

type RecentItem =
  | { type: 'meal'; data: Meal }
  | { type: 'food'; data: FoodItem }
  | { type: 'exercise'; data: Exercise };

/** A row's item count before its chevron; a dash until it has loaded. */
const RowCount: React.FC<{ value: number | undefined }> = ({ value }) => {
  const mutedColor = useCSSVariable('--color-text-secondary') as string;
  return (
    <View className="flex-row items-center">
      <Text className="text-text-secondary text-base mr-2">{value ?? '-'}</Text>
      <Icon name="chevron-forward" size={20} color={mutedColor} />
    </View>
  );
};

const LibraryScreen: React.FC<LibraryScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const { status: storedProgram, enabled: programEnabled } = useRunProgram();
  const activeProgram = programEnabled ? storedProgram : null;
  const { isEnabled: isFeatureOn } = useMobileFeatures();
  const mealPlansOn = useAppFeatureOn('mealPlans');
  const routesOn = useAppFeatureOn('routes');
  const insets = useSafeAreaInsets();
  const activeWorkoutBarPadding = useActiveWorkoutBarPadding();
  const usesNativeTabs = useNativeIOSTabsActive();
  const verticalBar = useVerticalBar();
  const accentColor = useCSSVariable('--color-accent-primary') as string;
  const [catOrange, catBlue, catPink, catViolet, hydration] = useCSSVariable([
    '--color-cat-orange',
    '--color-cat-blue',
    '--color-cat-pink',
    '--color-cat-violet',
    '--color-hydration',
  ]) as [string, string, string, string, string];
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isNavigationLocked, runNavigationAction } =
    useNavigationActionGuard(navigation);
  const {
    isConnected,
    isLoading: isConnectionLoading,
    status: connectionStatus,
  } = useServerConnection();
  const { favoriteFoods, favoriteMeals } = useFavorites({
    enabled: isConnected,
  });
  const favoriteFoodIds = useMemo(
    () => new Set(favoriteFoods.map((f) => f.id)),
    [favoriteFoods]
  );
  const favoriteMealIds = useMemo(
    () => new Set(favoriteMeals.map((m) => m.id)),
    [favoriteMeals]
  );
  const {
    recentFoods,
    isLoading: isFoodsLoading,
    isError: isFoodsError,
    refetch: refetchFoods,
  } = useFoods({ enabled: isConnected });
  const {
    recentMeals,
    isLoading: isRecentMealsLoading,
    isError: isRecentMealsError,
    refetch: refetchRecentMeals,
  } = useRecentMeals({ enabled: isConnected, limit: RECENT_LIMIT });
  const { meals, refetch: refetchMeals } = useMeals({ enabled: isConnected });
  const { data: medications, refetch: refetchMedications } = useMedications({
    enabled: isConnected,
  });
  const { containers: waterContainers } = useWaterContainersQuery({
    enabled: isConnected,
  });
  const {
    recentExercises,
    isLoading: isRecentExercisesLoading,
    isError: isRecentExercisesError,
    refetch: refetchRecentExercises,
  } = useSuggestedExercises();
  // Foods count uses the ['foods', ...] prefix so it is invalidated by the
  // existing `foodsQueryKey` invalidations in useSaveFood / useDeleteFood.
  const { data: foodsCount, refetch: refetchFoodsCount } = useQuery({
    queryKey: ['foods', 'count'] as const,
    queryFn: () =>
      fetchFoodsPage({ page: 1, itemsPerPage: 1 }).then(
        (r) => r.pagination.totalCount
      ),
    enabled: isConnected,
    staleTime: 1000 * 60 * 5,
  });
  const { data: exercisesCount, refetch: refetchExercisesCount } = useQuery({
    queryKey: ['exercises', 'count'] as const,
    queryFn: fetchExercisesCount,
    enabled: isConnected,
    staleTime: 1000 * 60 * 5,
  });
  const { data: presetsCount, refetch: refetchPresetsCount } = useQuery({
    queryKey: ['workoutPresets', 'count'] as const,
    queryFn: () =>
      fetchWorkoutPresetsPage({ page: 1, pageSize: 1 }).then(
        (r) => r.pagination.totalCount
      ),
    enabled: isConnected,
    staleTime: 1000 * 60 * 5,
  });

  const onRefresh = useCallback(async () => {
    if (!isConnected) return;
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchFoods(),
        refetchRecentMeals(),
        refetchMeals(),
        refetchFoodsCount(),
        refetchExercisesCount(),
        refetchPresetsCount(),
        refetchRecentExercises(),
        refetchMedications(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [
    isConnected,
    refetchFoods,
    refetchRecentMeals,
    refetchMeals,
    refetchFoodsCount,
    refetchExercisesCount,
    refetchPresetsCount,
    refetchRecentExercises,
    refetchMedications,
  ]);

  const recentItems = useMemo<RecentItem[]>(() => {
    const items: RecentItem[] = [];
    let mi = 0;
    let fi = 0;
    let ei = 0;
    while (items.length < RECENT_LIMIT) {
      const hasMeal = mi < recentMeals.length;
      const hasFood = fi < recentFoods.length;
      const hasExercise = ei < recentExercises.length;
      if (!hasMeal && !hasFood && !hasExercise) break;
      if (hasMeal) {
        items.push({ type: 'meal', data: recentMeals[mi++] });
        if (items.length >= RECENT_LIMIT) break;
      }
      if (hasFood) {
        items.push({ type: 'food', data: recentFoods[fi++] });
        if (items.length >= RECENT_LIMIT) break;
      }
      if (hasExercise)
        items.push({ type: 'exercise', data: recentExercises[ei++] });
    }
    return items;
  }, [recentMeals, recentFoods, recentExercises]);

  const isRecentLoading =
    isFoodsLoading || isRecentMealsLoading || isRecentExercisesLoading;
  const showRecentError =
    !isRecentLoading &&
    recentItems.length === 0 &&
    (isFoodsError || isRecentMealsError || isRecentExercisesError);

  const retryRecent = () => {
    void refetchFoods();
    void refetchRecentMeals();
    void refetchRecentExercises();
  };

  // A server that is set up but not answering: offer what the phone has saved.
  if (connectionStatus === 'unreachable') {
    return (
      <View
        className="flex-1 bg-background"
        style={usesNativeTabs ? undefined : { paddingTop: insets.top }}
      >
        <OfflineLibrary
          onOpenWorkoutPresets={() =>
            runNavigationAction(() =>
              navigation.navigate('WorkoutPresetsLibrary')
            )
          }
          onOpenExercises={() =>
            runNavigationAction(() => navigation.navigate('ExercisesLibrary'))
          }
        />
      </View>
    );
  }

  if (!isConnectionLoading && !isConnected) {
    return (
      <View
        className="flex-1 bg-background"
        style={usesNativeTabs ? undefined : { paddingTop: insets.top }}
      >
        <ServerStatusView />
      </View>
    );
  }

  if (isConnectionLoading) {
    return (
      <View
        className="flex-1 bg-background"
        style={usesNativeTabs ? undefined : { paddingTop: insets.top }}
      >
        <StatusView
          loading
          title={t('screens.library.loading', {
            defaultValue: 'Loading library...',
          })}
        />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      style={[
        { flex: 1 },
        usesNativeTabs ? undefined : { paddingTop: insets.top },
      ]}
      contentContainerStyle={{
        paddingHorizontal: 16,
        ...(!usesNativeTabs ? { paddingTop: 16 } : null),
        // Room under the large title beside a vertical bar.
        ...(usesNativeTabs && verticalBar ? { paddingTop: 12 } : null),
        paddingBottom: insets.bottom + activeWorkoutBarPadding + 16,
      }}
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
      {!usesNativeTabs && (
        <View className="mb-6">
          <Text className="text-2xl font-bold text-text-primary">
            {t('screens.library.hubTitle', { defaultValue: 'Hub' })}
          </Text>
        </View>
      )}

      <Text className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 px-1">
        {t('screens.library.createNew', { defaultValue: 'Create new' })}
      </Text>
      <View className="flex-row gap-2 mb-6">
        <CreateTile
          icon="food"
          title={t('screens.library.food', { defaultValue: 'Food' })}
          disabled={isNavigationLocked}
          onPress={() =>
            runNavigationAction(() =>
              navigation.navigate('FoodForm', {
                mode: 'create-food',
                pickerMode: 'library',
              })
            )
          }
          className="flex-1"
        />
        <CreateTile
          icon="meal"
          title={t('screens.library.meal', { defaultValue: 'Meal' })}
          disabled={isNavigationLocked}
          onPress={() =>
            runNavigationAction(() => navigation.navigate('MealAdd'))
          }
          className="flex-1"
        />
        <CreateTile
          icon="exercise-weights"
          title={t('screens.library.exercise', { defaultValue: 'Exercise' })}
          disabled={isNavigationLocked}
          onPress={() =>
            runNavigationAction(() =>
              navigation.navigate('ExerciseForm', { mode: 'create-exercise' })
            )
          }
          className="flex-1"
        />
        <CreateTile
          icon="bookmark-filled"
          title={t('screens.library.preset', { defaultValue: 'Preset' })}
          disabled={isNavigationLocked}
          onPress={() =>
            runNavigationAction(() =>
              navigation.navigate('WorkoutPresetForm', {
                mode: 'create-preset',
              })
            )
          }
          className="flex-1"
        />
      </View>

      <SettingsRowGroup
        title={t('screens.library.sections.food', {
          defaultValue: 'Food & drink',
        })}
      >
        <SettingsRow
          icon="food"
          iconColor={catOrange}
          title={t('screens.library.foods', { defaultValue: 'Foods' })}
          rightAccessory={<RowCount value={foodsCount} />}
          onPress={() => navigation.navigate('FoodsLibrary')}
        />
        <SettingsRow
          icon="meal"
          iconColor={catOrange}
          title={t('screens.library.meals', { defaultValue: 'Meals' })}
          rightAccessory={<RowCount value={meals.length} />}
          onPress={() => navigation.navigate('MealsLibrary')}
        />
        {mealPlansOn && (
          <SettingsRow
            icon="calendar"
            iconColor={catOrange}
            title={t('screens.library.mealPlans', {
              defaultValue: 'Meal plans',
            })}
            subtitle={t('screens.library.mealPlansSubtitle', {
              defaultValue: 'Repeat meals on selected days',
            })}
            subtitleNumberOfLines={0}
            onPress={() => navigation.navigate('MealPlans')}
          />
        )}
        <SettingsRow
          icon="water"
          iconColor={hydration}
          title={t('screens.library.waterContainers', {
            defaultValue: 'Water containers',
          })}
          subtitle={t('screens.library.waterContainersSubtitle', {
            defaultValue: 'Bottles, glasses, and drinks linked to foods',
          })}
          subtitleNumberOfLines={0}
          rightAccessory={<RowCount value={waterContainers.length} />}
          onPress={() => navigation.navigate('WaterContainers')}
        />
      </SettingsRowGroup>

      <SettingsRowGroup
        title={t('screens.library.sections.training', {
          defaultValue: 'Training',
        })}
      >
        <SettingsRow
          icon="list"
          iconColor={catBlue}
          title={t('screens.library.workoutPlans', {
            defaultValue: 'Workout plans',
          })}
          subtitle={t('screens.library.workoutPlansSubtitle', {
            defaultValue: 'Schedule workouts across the week',
          })}
          subtitleNumberOfLines={0}
          onPress={() => navigation.navigate('WorkoutPlans')}
        />
        <SettingsRow
          icon="exercise-running"
          iconColor={catBlue}
          title={t('screens.library.runPrograms', {
            defaultValue: 'Training programs',
          })}
          subtitle={
            activeProgram
              ? t('screens.library.runProgramsActive', {
                  name: programTitle(t, activeProgram.program),
                  progress: t('recordActivity.program.workoutsDone', {
                    done: activeProgram.done,
                    total: activeProgram.total,
                    defaultValue: '{{done}} of {{total}} workouts',
                  }),
                  defaultValue: '{{name}} · {{progress}}',
                })
              : t('screens.library.runProgramsSubtitle', {
                  defaultValue:
                    'Run and walk plans from Beginner 5K to marathon',
                })
          }
          subtitleNumberOfLines={0}
          onPress={() => navigation.navigate('RunPrograms')}
        />
        <SettingsRow
          icon="calendar"
          iconColor={catBlue}
          title={t('screens.library.trainingCalendar', {
            defaultValue: 'Training calendar',
          })}
          subtitle={t('screens.library.trainingCalendarSubtitle', {
            defaultValue: 'Planned and completed workouts, and load by sport',
          })}
          subtitleNumberOfLines={0}
          onPress={() => navigation.navigate('TrainingCalendar')}
        />
        <SettingsRow
          icon="bookmark-filled"
          iconColor={catBlue}
          title={t('screens.library.workoutPresets', {
            defaultValue: 'Workout presets',
          })}
          rightAccessory={<RowCount value={presetsCount} />}
          onPress={() => navigation.navigate('WorkoutPresetsLibrary')}
        />
        <SettingsRow
          icon="exercise-weights"
          iconColor={catBlue}
          title={t('screens.library.exercises', { defaultValue: 'Exercises' })}
          rightAccessory={<RowCount value={exercisesCount} />}
          onPress={() => navigation.navigate('ExercisesLibrary')}
        />
        {routesOn && (
          <SettingsRow
            icon="location"
            iconColor={catBlue}
            title={t('screens.library.routes', { defaultValue: 'Routes' })}
            subtitle={t('screens.library.routesSubtitle', {
              defaultValue: 'Draw, import and save routes to follow',
            })}
            subtitleNumberOfLines={0}
            onPress={() => navigation.navigate('Routes')}
          />
        )}
        <SettingsRow
          icon="wrench"
          iconColor={catBlue}
          title={t('screens.library.equipment', { defaultValue: 'Equipment' })}
          subtitle={t('screens.library.equipmentSubtitle', {
            defaultValue: 'Shoes and other gear',
          })}
          subtitleNumberOfLines={0}
          onPress={() => navigation.navigate('Equipment')}
        />
      </SettingsRowGroup>

      <SettingsRowGroup
        title={t('screens.library.sections.health', {
          defaultValue: 'Health',
        })}
      >
        <SettingsRow
          icon="medication"
          iconColor={catPink}
          title={t('screens.library.medications', {
            defaultValue: 'Medications',
          })}
          rightAccessory={<RowCount value={medications?.length} />}
          onPress={() => navigation.navigate('MedicationsList')}
        />
        {isFeatureOn('labResults') && (
          <SettingsRow
            icon="lab-results"
            iconColor={catPink}
            title={t('screens.library.labResults', {
              defaultValue: 'Lab results',
            })}
            subtitle={t('screens.library.labResultsSubtitle', {
              defaultValue: 'Blood tests and other markers over time',
            })}
            subtitleNumberOfLines={0}
            onPress={() => navigation.navigate('LabResults')}
          />
        )}
      </SettingsRowGroup>

      <SettingsRowGroup
        title={t('screens.library.sections.progress', {
          defaultValue: 'Progress',
        })}
        className="mb-6"
      >
        <SettingsRow
          icon="chart-bar"
          iconColor={catViolet}
          title={t('screens.library.reports', { defaultValue: 'Reports' })}
          subtitle={t('screens.library.reportsSubtitle', {
            defaultValue: 'Nutrition, sleep, mood and exercise trends',
          })}
          subtitleNumberOfLines={0}
          onPress={() => navigation.navigate('Reports')}
        />
        <SettingsRow
          icon="trophy"
          iconColor={catViolet}
          title={t('screens.library.personalRecords', {
            defaultValue: 'Personal records',
          })}
          subtitle={t('screens.library.personalRecordsSubtitle', {
            defaultValue: 'Your best 1 km, 5 km, 10 km and more',
          })}
          subtitleNumberOfLines={0}
          onPress={() => navigation.navigate('PersonalRecords')}
        />
        <SettingsRow
          icon="people"
          iconColor={catViolet}
          title={t('screens.library.challenges', {
            defaultValue: 'Challenges',
          })}
          subtitle={t('screens.library.challengesSubtitle', {
            defaultValue: 'Group leaderboards with friends and family',
          })}
          subtitleNumberOfLines={0}
          onPress={() => navigation.navigate('Challenges')}
        />
      </SettingsRowGroup>

      <View className="mb-3">
        <Text className="text-lg font-semibold text-text-primary">
          {t('screens.library.recentlyLogged', {
            defaultValue: 'Recently Logged',
          })}
        </Text>
      </View>

      <View className="bg-surface rounded-xl overflow-hidden shadow-sm">
        {isRecentLoading ? (
          <View className="px-4 py-8 items-center">
            <ActivityIndicator size="small" color="#6B7280" />
            <Text className="text-text-secondary text-sm mt-3">
              {t('screens.library.loadingRecentItems', {
                defaultValue: 'Loading recent items...',
              })}
            </Text>
          </View>
        ) : showRecentError ? (
          <View className="px-4 py-6 items-start">
            <Text className="text-text-secondary text-sm">
              {t('screens.library.failedRecentItems', {
                defaultValue: 'Failed to load recent items.',
              })}
            </Text>
            <Button
              variant="link"
              className="px-0 py-0 mt-3"
              textClassName="text-sm"
              onPress={retryRecent}
            >
              {t('common.retry', { defaultValue: 'Retry' })}
            </Button>
          </View>
        ) : recentItems.length > 0 ? (
          recentItems.map((item, index) => {
            const showDivider = index < recentItems.length - 1;
            if (item.type === 'meal') {
              return (
                <MealLibraryRow
                  key={`meal-${item.data.id}`}
                  meal={item.data}
                  isFavorite={favoriteMealIds.has(item.data.id)}
                  showDivider={showDivider}
                  onPress={() =>
                    navigation.navigate('MealDetail', {
                      mealId: item.data.id,
                      initialMeal: item.data,
                    })
                  }
                />
              );
            }
            if (item.type === 'food') {
              return (
                <FoodLibraryRow
                  key={`food-${item.data.id}`}
                  food={item.data}
                  isFavorite={favoriteFoodIds.has(item.data.id)}
                  showDivider={showDivider}
                  onPress={() =>
                    navigation.navigate('FoodDetail', {
                      item: foodItemToFoodInfo(item.data),
                    })
                  }
                />
              );
            }
            return (
              <Pressable
                key={`exercise-${item.data.id}`}
                className={`px-4 py-3 ${showDivider ? 'border-b border-border-subtle' : ''}`}
                onPress={() =>
                  navigation.navigate('ExerciseDetail', { item: item.data })
                }
                style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}
              >
                <Text className="text-text-primary text-base font-medium">
                  {item.data.name}
                </Text>
                {item.data.category ? (
                  <Text className="text-text-secondary text-sm mt-0.5">
                    {item.data.category}
                  </Text>
                ) : null}
              </Pressable>
            );
          })
        ) : (
          <View className="px-4 py-6">
            <Text className="text-text-primary text-base font-medium">
              {t('screens.library.noRecentItems', {
                defaultValue: 'No recent items yet',
              })}
            </Text>
            <Text className="text-text-secondary text-sm mt-1">
              {t('screens.library.recentItemsHint', {
                defaultValue:
                  'Foods, meals, and exercises you log will appear here for quick access.',
              })}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default LibraryScreen;
