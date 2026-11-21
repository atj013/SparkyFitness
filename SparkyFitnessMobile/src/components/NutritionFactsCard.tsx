import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { useCSSVariable } from 'uniwind';
import Icon from './Icon';
import { FoodNutrientBreakdown } from './FoodNutritionSummary';
import type { FoodDisplayValues } from '../utils/foodDetails';
import { useEnergyUnit } from '../hooks/useEnergyUnit';
import { energyUnitLabel, roundedEnergy } from '../utils/energyUnit';

interface NutritionFactsCardProps {
  values: FoodDisplayValues;
  /** Multiplier applied to every per-serving value (the logged quantity). */
  servings: number;
  /** Right side of the "Amount" row, e.g. "1 Serving" or "2 cup". */
  amountLabel: string;
  showNetCarbs?: boolean;
  customNutrients?: Record<string, string | number> | null;
  /** Share of the day's calorie goal, shown under the calorie count. */
  calorieGoalPercent?: number | null;
  /** Shows an "Edit Nutrition" link beside the title when set. */
  onEditNutrition?: () => void;
  editDisabled?: boolean;
}

/** Grams under 10 keep one decimal (0.5 g fat matters); larger values round. */
function formatAmount(value: number): string {
  if (value < 10) return String(Math.round(value * 10) / 10);
  return String(Math.round(value));
}

/**
 * Nutrition-label style summary: the calorie count large on the left, the
 * main nutrients on the right, and a row that expands the full nutrient list.
 */
const NutritionFactsCard: React.FC<NutritionFactsCardProps> = ({
  values,
  servings,
  amountLabel,
  showNetCarbs = false,
  customNutrients,
  calorieGoalPercent,
  onEditNutrition,
  editDisabled = false,
}) => {
  const { t } = useTranslation();
  const energyUnit = useEnergyUnit();
  const accentColor = useCSSVariable('--color-accent-primary') as string;
  const [showAll, setShowAll] = useState(false);

  const scaled = (value: number | undefined, unit: string) =>
    value === undefined || Number.isNaN(value)
      ? t('foodNutrition.facts.notAvailable', { defaultValue: 'n/a' })
      : `${formatAmount(value * servings)}${unit}`;

  const rows: { key: string; label: string; value: string; sub?: boolean }[] = [
    {
      key: 'fat',
      label: t('foodNutrition.facts.totalFat', { defaultValue: 'Total Fat' }),
      value: scaled(values.fat, 'g'),
    },
    {
      key: 'saturatedFat',
      label: t('foodNutrition.facts.saturatedFat', {
        defaultValue: 'Sat Fat',
      }),
      value: scaled(values.saturatedFat, 'g'),
      sub: true,
    },
    {
      key: 'cholesterol',
      label: t('foodNutrition.facts.cholesterol', {
        defaultValue: 'Cholesterol',
      }),
      value: scaled(values.cholesterol, 'mg'),
    },
    {
      key: 'sodium',
      label: t('foodNutrition.facts.sodium', { defaultValue: 'Sodium' }),
      value: scaled(values.sodium, 'mg'),
    },
    {
      key: 'carbs',
      label: t('foodNutrition.facts.totalCarbs', {
        defaultValue: 'Total Carbs',
      }),
      value: scaled(values.carbs, 'g'),
    },
    {
      key: 'fiber',
      label: t('foodNutrition.facts.fiber', { defaultValue: 'Fiber' }),
      value: scaled(values.fiber, 'g'),
      sub: true,
    },
    {
      key: 'sugars',
      label: t('foodNutrition.facts.sugars', { defaultValue: 'Sugars' }),
      value: scaled(values.sugars, 'g'),
      sub: true,
    },
    {
      key: 'protein',
      label: t('foodNutrition.facts.protein', { defaultValue: 'Protein' }),
      value: scaled(values.protein, 'g'),
    },
  ];

  const energyLabel =
    energyUnit === 'kcal'
      ? t('foodNutrition.facts.calories', { defaultValue: 'Calories' })
      : energyUnitLabel(energyUnit, t);

  return (
    <View>
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-text-primary text-2xl font-bold">
          {t('foodNutrition.facts.title', { defaultValue: 'Nutrition Facts' })}
        </Text>
        {onEditNutrition ? (
          <Pressable
            onPress={onEditNutrition}
            disabled={editDisabled}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('foodNutrition.facts.edit', {
              defaultValue: 'Edit Nutrition',
            })}
            testID="nutrition-facts-edit"
          >
            <Text
              className="text-base font-semibold"
              style={{ color: accentColor, opacity: editDisabled ? 0.5 : 1 }}
            >
              {t('foodNutrition.facts.edit', {
                defaultValue: 'Edit Nutrition',
              })}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View className="bg-surface rounded-xl shadow-sm overflow-hidden">
        <View className="px-4 pt-4">
          <View className="flex-row justify-between pb-3 border-b border-text-primary">
            <Text className="text-text-primary text-base font-semibold">
              {t('foodNutrition.facts.amount', { defaultValue: 'Amount' })}
            </Text>
            <Text
              className="text-text-primary text-base font-semibold"
              testID="nutrition-facts-amount"
            >
              {amountLabel}
            </Text>
          </View>

          <View className="flex-row py-4 gap-4">
            <View className="flex-1 items-center justify-center">
              <Text
                className="text-text-primary font-bold"
                style={{ fontSize: 56, lineHeight: 64 }}
                adjustsFontSizeToFit
                numberOfLines={1}
                testID="nutrition-facts-calories"
              >
                {roundedEnergy(values.calories * servings, energyUnit)}
              </Text>
              <Text className="text-text-secondary text-base">
                {energyLabel}
              </Text>
              {calorieGoalPercent != null ? (
                <Text
                  className="text-text-muted text-xs mt-1"
                  testID="nutrition-facts-goal"
                >
                  {t('foodNutrition.facts.ofDailyGoal', {
                    defaultValue: '{{percent}}% of daily goal',
                    percent: calorieGoalPercent,
                  })}
                </Text>
              ) : null}
            </View>
            <View className="flex-[1.3] gap-1">
              {rows.map((row) => (
                <View
                  key={row.key}
                  className="flex-row justify-between"
                  testID={`nutrition-facts-row-${row.key}`}
                >
                  <Text
                    className={
                      row.sub
                        ? 'text-text-secondary text-sm pl-3'
                        : 'text-text-primary text-sm font-medium'
                    }
                  >
                    {row.label}
                  </Text>
                  <Text
                    className={
                      row.sub
                        ? 'text-text-secondary text-sm'
                        : 'text-text-primary text-sm'
                    }
                  >
                    {row.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {showAll ? (
          <View className="px-4 pb-3 border-t border-border-subtle pt-3">
            <FoodNutrientBreakdown
              values={values}
              servings={servings}
              showNetCarbs={showNetCarbs}
              customNutrients={customNutrients}
              showAll
            />
          </View>
        ) : null}

        <Pressable
          onPress={() => setShowAll((prev) => !prev)}
          className="flex-row items-center justify-between px-4 py-4 border-t border-border-subtle"
          accessibilityRole="button"
          accessibilityState={{ expanded: showAll }}
          testID="nutrition-facts-toggle"
        >
          <Text
            className="text-base font-semibold"
            style={{ color: accentColor }}
          >
            {showAll
              ? t('foodNutrition.facts.hideAll', {
                  defaultValue: 'Hide All Nutrients',
                })
              : t('foodNutrition.facts.viewAll', {
                  defaultValue: 'View All Nutrients',
                })}
          </Text>
          <Icon
            name={showAll ? 'chevron-up' : 'chevron-forward'}
            size={18}
            color={accentColor}
          />
        </Pressable>
      </View>
    </View>
  );
};

export default NutritionFactsCard;
