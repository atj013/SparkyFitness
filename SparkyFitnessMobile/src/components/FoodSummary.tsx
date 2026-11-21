import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, Pressable } from 'react-native';
import { useCSSVariable } from 'uniwind';
import type { FoodEntry } from '../types/foodEntries';
import type { DailyGoals } from '../types/goals';
import type { MealType } from '../types/mealTypes';
import Icon from './Icon';
import { MEAL_CONFIG } from '../constants/meals';
import SwipeableFoodRow from './SwipeableFoodRow';
import {
  calculateEntryNutrition,
  calculateMealNutrition,
  getMealGroupLabel,
  groupFoodEntriesByMealType,
  getMealTargetCalories,
  type MealGroup,
} from '../utils/mealNutrition';
import { useEnergyUnit } from '../hooks/useEnergyUnit';
import { energyUnitLabel, roundedEnergy } from '../utils/energyUnit';

interface FoodSummaryProps {
  foodEntries: FoodEntry[];
  mealTypes: MealType[];
  goals?: DailyGoals;
  calorieGoal?: number;
  onAddFood?: () => void;
  /**
   * When set, every meal type gets a section (even with nothing logged) and a
   * "+" button that calls this with the section's meal type id.
   */
  onAddFoodToMeal?: (mealTypeId: string) => void;
  onAdjustServing?: (entry: FoodEntry) => void;
  onPressMealType?: (
    mealTypeId: string | null,
    mealTypeName: string,
    entries: FoodEntry[]
  ) => void;
}

interface MealSectionProps {
  group: MealGroup;
  goals?: DailyGoals;
  calorieGoal?: number;
  onAddFoodToMeal?: (mealTypeId: string) => void;
  onAdjustServing?: (entry: FoodEntry) => void;
  onPressMealType?: (
    mealTypeId: string | null,
    mealTypeName: string,
    entries: FoodEntry[]
  ) => void;
}

const EmptyState: React.FC<{ onAddFood?: () => void }> = ({ onAddFood }) => {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onAddFood}
      accessibilityRole="button"
      accessibilityLabel={t('foodSummary.tapToAddFood', {
        defaultValue: 'Tap to add food',
      })}
      className="bg-surface rounded-xl p-4 mb-2 shadow-sm items-center py-6"
    >
      <Text className="text-text-muted text-base">
        {t('foodSummary.tapToAddFood', { defaultValue: 'Tap to add food' })}
      </Text>
    </Pressable>
  );
};

const MealSection: React.FC<MealSectionProps> = ({
  group,
  goals,
  calorieGoal,
  onAddFoodToMeal,
  onAdjustServing,
  onPressMealType,
}) => {
  const { t } = useTranslation();
  const accentPrimary = useCSSVariable('--color-accent-primary') as string;

  const label = getMealGroupLabel(group, t);
  // Single canonical MEAL_CONFIG lookup (read once, reuse both fields). A
  // custom category named "breakfast" still gets the neutral icon, never the
  // system one — ownership is decided by isSystem, not by the name.
  const systemConfig = group.isSystem
    ? MEAL_CONFIG[group.name.toLowerCase()]
    : undefined;
  const icon = systemConfig?.icon ?? 'meal-snack';

  const energyUnit = useEnergyUnit();
  const totalCalories = calculateMealNutrition(group.entries).values.calories;
  const targetCalories = React.useMemo(
    () => getMealTargetCalories(group.name, group.isSystem, goals, calorieGoal),
    [group.isSystem, group.name, goals, calorieGoal]
  );

  const headerContent = (
    <>
      <Icon name={icon} size={18} color={accentPrimary} />
      <Text className="text-base font-bold text-text-secondary flex-1">
        {label}
      </Text>
      {(totalCalories > 0 || targetCalories > 0) && (
        <View className="bg-accent-primary/5 rounded-full px-2.5 py-0.5">
          <Text className="text-xs text-accent-primary font-semibold">
            {roundedEnergy(totalCalories, energyUnit)}
            {targetCalories > 0
              ? ` / ${roundedEnergy(targetCalories, energyUnit)}`
              : ''}{' '}
            {energyUnitLabel(energyUnit, t)}
          </Text>
        </View>
      )}
      {onPressMealType && (
        <Icon name="chevron-forward" size={14} color={accentPrimary} />
      )}
    </>
  );

  const isEmpty = group.entries.length === 0;
  const mealTypeId = group.mealTypeId;
  const headerSpacing = isEmpty ? 'mb-1' : 'mb-3';

  return (
    <View className="bg-surface rounded-xl p-4 overflow-hidden shadow-sm">
      <View className={`flex-row items-center gap-2 ${headerSpacing}`}>
        {onPressMealType ? (
          <Pressable
            onPress={() =>
              onPressMealType(group.mealTypeId, group.name, group.entries)
            }
            className="flex-row gap-2 items-center flex-1"
            accessibilityRole="button"
            accessibilityLabel={t('foodSummary.nutritionBreakdown', {
              defaultValue: '{{label}} nutrition breakdown',
              label,
            })}
          >
            {headerContent}
          </Pressable>
        ) : (
          <View className="flex-row gap-2 items-center flex-1">
            {headerContent}
          </View>
        )}
        {onAddFoodToMeal && mealTypeId && (
          <Pressable
            onPress={() => onAddFoodToMeal(mealTypeId)}
            hitSlop={8}
            className="w-8 h-8 rounded-full bg-accent-primary/10 items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel={t('foodSummary.addFoodToMeal', {
              defaultValue: 'Add food to {{label}}',
              label,
            })}
            testID={`meal-add-${mealTypeId}`}
          >
            <Icon name="add" size={20} color={accentPrimary} />
          </Pressable>
        )}
      </View>
      {isEmpty && (
        <Text className="text-sm text-text-muted">
          {t('foodSummary.noFoodLogged', {
            defaultValue: 'Nothing logged yet',
          })}
        </Text>
      )}
      {group.entries.map((entry, index) => {
        const nutrition = calculateEntryNutrition(entry);
        return (
          <SwipeableFoodRow
            key={entry.id || index}
            entry={entry}
            nutrition={nutrition}
            onAdjustServing={onAdjustServing}
          />
        );
      })}
    </View>
  );
};

const FoodSummary: React.FC<FoodSummaryProps> = ({
  foodEntries,
  mealTypes,
  goals,
  calorieGoal,
  onAddFood,
  onAddFoodToMeal,
  onAdjustServing,
  onPressMealType,
}) => {
  // With per-meal add buttons, every meal type keeps its section so there is
  // always somewhere to tap; otherwise only meals with entries are shown.
  const showEmptyMeals = !!onAddFoodToMeal && mealTypes.length > 0;

  if (foodEntries.length === 0 && !showEmptyMeals) {
    return <EmptyState onAddFood={onAddFood} />;
  }

  const groups = groupFoodEntriesByMealType(foodEntries, mealTypes, {
    includeEmpty: showEmptyMeals,
  });

  if (groups.length === 0) {
    return <EmptyState onAddFood={onAddFood} />;
  }

  return (
    <View className="gap-2 mb-2">
      {groups.map((group) => (
        <MealSection
          key={
            group.mealTypeId
              ? `meal:${group.mealTypeId}`
              : `historical:${group.name.toLowerCase()}`
          }
          group={group}
          goals={goals}
          calorieGoal={calorieGoal}
          onAddFoodToMeal={onAddFoodToMeal}
          onAdjustServing={onAdjustServing}
          onPressMealType={onPressMealType}
        />
      ))}
    </View>
  );
};

export default FoodSummary;
