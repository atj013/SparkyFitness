import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  ScrollView,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
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
  /** The height the Diary measured is left for the card; it is never set
   * below MIN_FOOD_CARD_HEIGHT. Without it the card grows to fill. */
  height?: number;
  onLayout?: (event: LayoutChangeEvent) => void;
  /** The day's calories eaten (kcal), protein and fiber, shown beside the
   * title as three columns; absent hides them. */
  macros?: {
    calories: number;
    protein: MacroAmount;
    fiber: MacroAmount;
  };
}

interface MacroAmount {
  consumed: number;
  goal: number;
}

/** One column in the header: the name in its color over the amount. */
const HeaderStat: React.FC<{
  label: string;
  value: string;
  color: string;
  testID: string;
}> = ({ label, value, color, testID }) => (
  <View className="items-center" testID={testID}>
    <Text
      className="text-[11px] font-semibold"
      style={{ color }}
      numberOfLines={1}
    >
      {label}
    </Text>
    <Text className="text-[13px] font-bold text-text-primary" numberOfLines={1}>
      {value}
    </Text>
  </View>
);

const HEADER_HEIGHT = 48;

/** The smallest the list may get: room for two rows under the header. */
export const MIN_FOOD_CARD_HEIGHT = HEADER_HEIGHT + 2 * 32;

/**
 * Every food of the day in one list, in meal order, one line each. The Diary
 * measures the cards around it and passes the height left on its first
 * screen, and the list scrolls inside, so a long day never pushes the cards
 * under it off the screen. (The first screen only has a minimum height, so a
 * flex share alone sized the card by its rows.)
 */
const DiaryFoodCard: React.FC<DiaryFoodCardProps> = ({
  foodEntries,
  mealTypes,
  onAddFood,
  onAdjustServing,
  height,
  onLayout,
  macros,
}) => {
  const { t } = useTranslation();
  const energyUnit = useEnergyUnit();
  const [cardColor, onCardColor, caloriesColor, proteinColor, fiberColor] =
    useCSSVariable([
      '--color-diary-food',
      '--color-diary-on',
      '--color-calories',
      '--color-macro-protein',
      '--color-macro-fiber',
    ]) as string[];

  const gramsValue = (amount: MacroAmount) => {
    const consumed = Math.round(amount.consumed);
    const goal = Math.round(amount.goal);
    return goal > 0
      ? t('diary.food.macroAmount', {
          defaultValue: '{{consumed}}/{{goal}} g',
          consumed,
          goal,
        })
      : t('diary.food.macroAmountNoGoal', {
          defaultValue: '{{consumed}} g',
          consumed,
        });
  };
  const energyValue = (kcal: number) =>
    t('diary.food.energy', {
      defaultValue: '{{energy}} {{unit}}',
      energy: roundedEnergy(kcal, energyUnit),
      unit: energyUnitLabel(energyUnit, t),
    });

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
      // Still the one card that grows: any room the measured height misses
      // (a card above got shorter) comes to the list, and the next measure
      // folds it into the height.
      style={
        height != null
          ? {
              height: Math.max(height, MIN_FOOD_CARD_HEIGHT),
              flexGrow: 1,
            }
          : { flexGrow: 1, flexBasis: 0, minHeight: MIN_FOOD_CARD_HEIGHT }
      }
      onLayout={onLayout}
      testID="diary-food-card"
    >
      <View
        className="flex-row items-center pl-3.5 border-b border-border-subtle"
        style={{ height: HEADER_HEIGHT }}
      >
        <Text className="text-[17px] font-bold text-diary-food">
          {t('diary.food.title', { defaultValue: 'Food' })}
        </Text>
        {macros ? (
          // Calories, protein and fiber as three evenly spaced columns, each
          // its name in its color over the amount.
          <View
            className="flex-1 flex-row items-center justify-evenly"
            testID="diary-food-macros"
          >
            <HeaderStat
              label={t('nutrients.calories', { defaultValue: 'Calories' })}
              value={energyValue(macros.calories)}
              color={caloriesColor}
              testID="diary-food-calories"
            />
            <HeaderStat
              label={t('nutrients.protein', { defaultValue: 'Protein' })}
              value={gramsValue(macros.protein)}
              color={proteinColor}
              testID="diary-food-protein"
            />
            <HeaderStat
              label={t('nutrients.fiber', { defaultValue: 'Fiber' })}
              value={gramsValue(macros.fiber)}
              color={fiberColor}
              testID="diary-food-fiber"
            />
          </View>
        ) : (
          <View className="flex-1 ml-2">
            {rows.length > 0 ? (
              <Text
                className="text-[13px] text-text-secondary"
                numberOfLines={1}
              >
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
        )}
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
            className="w-9 h-9 rounded-full items-center justify-center"
            style={{ backgroundColor: cardColor }}
          >
            <Icon name="add" size={20} color={onCardColor} />
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
