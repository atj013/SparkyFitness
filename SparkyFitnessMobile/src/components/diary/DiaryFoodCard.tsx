import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useCSSVariable } from 'uniwind';

import Icon from '../Icon';
import SwipeableFoodRow from '../SwipeableFoodRow';
import type { FoodEntry } from '../../types/foodEntries';
import type { MealType } from '../../types/mealTypes';
import {
  calculateEntryNutrition,
  calculateMealNutrition,
  getMealGroupLabel,
  groupFoodEntriesByMealType,
} from '../../utils/mealNutrition';
import { useEnergyUnit } from '../../hooks/useEnergyUnit';
import { energyUnitLabel, roundedEnergy } from '../../utils/energyUnit';

interface DiaryFoodCardProps {
  foodEntries: FoodEntry[];
  mealTypes: MealType[];
  onAddFood: () => void;
  onAdjustServing?: (entry: FoodEntry) => void;
}

/** The smallest the list may get: room for three rows under the header. */
const MIN_CARD_HEIGHT = 44 + 3 * 32;

/**
 * Every food of the day in one list, in meal order, one line each. The card
 * takes three quarters of the height the Diary's first screen has left (the
 * Sleep card takes the rest, or the card takes it all with no night logged) and
 * scrolls inside. Its basis is 0, so a long day never grows it past that share
 * and pushes the cards under it off the screen.
 */
const DiaryFoodCard: React.FC<DiaryFoodCardProps> = ({
  foodEntries,
  mealTypes,
  onAddFood,
  onAdjustServing,
}) => {
  const { t } = useTranslation();
  const energyUnit = useEnergyUnit();
  const accentPrimary = useCSSVariable('--color-accent-primary') as string;

  const rows = useMemo(
    () =>
      groupFoodEntriesByMealType(foodEntries, mealTypes).flatMap((group) => {
        const label = getMealGroupLabel(group, t);
        const letter = label.trim().charAt(0).toLocaleUpperCase() || '·';
        return group.entries.map((entry) => ({
          entry,
          mealTag: { letter, label },
        }));
      }),
    [foodEntries, mealTypes, t]
  );

  const totalCalories = calculateMealNutrition(foodEntries).values.calories;

  return (
    <View
      className="bg-surface rounded-xl shadow-sm overflow-hidden"
      style={{ flexGrow: 3, flexBasis: 0, minHeight: MIN_CARD_HEIGHT }}
      testID="diary-food-card"
    >
      <View className="flex-row items-center h-11 pl-3 border-b border-border-subtle">
        <View className="flex-1 flex-row items-baseline gap-2">
          <Text className="text-md font-bold text-text-secondary">
            {t('diary.food.title', { defaultValue: 'Food' })}
          </Text>
          {rows.length > 0 ? (
            <Text className="text-xs text-text-secondary" numberOfLines={1}>
              {t('diary.food.count', {
                defaultValue: '{{count}} items',
                count: rows.length,
              })}
              {t('diary.food.energySeparator', {
                defaultValue: ' · {{energy}} {{unit}}',
                energy: roundedEnergy(totalCalories, energyUnit),
                unit: energyUnitLabel(energyUnit, t),
              })}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={onAddFood}
          accessibilityRole="button"
          accessibilityLabel={t('diary.food.add', {
            defaultValue: 'Add food',
          })}
          className="w-11 h-11 items-center justify-center"
          testID="diary-food-add"
        >
          <View
            className="w-7 h-7 rounded-full items-center justify-center"
            style={{ backgroundColor: accentPrimary }}
          >
            <Icon name="add" size={18} color="#ffffff" />
          </View>
        </Pressable>
      </View>
      {rows.length === 0 ? (
        <View className="flex-1 items-center justify-center py-4">
          <Text className="text-sm text-text-secondary">
            {t('foodSummary.noFoodLogged', {
              defaultValue: 'Nothing logged yet',
            })}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 12 }}
          nestedScrollEnabled
          showsVerticalScrollIndicator
          testID="diary-food-list"
        >
          {rows.map(({ entry, mealTag }, index) => (
            <View
              key={entry.id || index}
              className={
                index < rows.length - 1 ? 'border-b border-border-subtle' : ''
              }
            >
              <SwipeableFoodRow
                entry={entry}
                nutrition={calculateEntryNutrition(entry)}
                onAdjustServing={onAdjustServing}
                compact
                mealTag={mealTag}
              />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

export default DiaryFoodCard;
