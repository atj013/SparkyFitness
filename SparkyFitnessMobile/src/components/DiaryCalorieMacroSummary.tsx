import React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useCSSVariable } from 'uniwind';

import NutrientPill from './NutrientPill';
import { useAppPreferencesStore } from '../stores/appPreferencesStore';
import { getNetCarbsValue } from '../utils/nutrientUtils';
import { NUTRIENT_META, getNutrientLabel } from '../constants/nutrients';
import type { DailySummary } from '../types/dailySummary';
import type { UserCustomNutrient } from '../hooks/useCustomNutrients';

const CORE_MACROS = ['protein', 'carbs', 'fat', 'dietary_fiber'] as const;

interface DiaryCalorieMacroSummaryProps {
  summary: DailySummary;
  showNetCarbs: boolean;
  /** Diary-specific custom nutrient keys (view_group='diary'), already capped to 4. */
  customNutrientKeys: string[];
  customNutrients: UserCustomNutrient[];
}

/**
 * The day's macros (and any chosen custom nutrients) in one tight card above
 * the Diary's food list. Calories are left out: the Food card's header
 * already gives the day's total, and the room goes to the food list.
 */
const DiaryCalorieMacroSummary: React.FC<DiaryCalorieMacroSummaryProps> = ({
  summary,
  showNetCarbs,
  customNutrientKeys,
  customNutrients,
}) => {
  const { t } = useTranslation();
  const diarySummaryVisible = useAppPreferencesStore(
    (s) => s.diarySummaryVisible
  );
  const [proteinColor, carbsColor, fatColor, fiberColor] = useCSSVariable([
    '--color-macro-protein',
    '--color-macro-carbs',
    '--color-macro-fat',
    '--color-macro-fiber',
  ]) as [string, string, string, string];
  const macroColor: Record<(typeof CORE_MACROS)[number], string> = {
    protein: proteinColor,
    carbs: carbsColor,
    fat: fatColor,
    dietary_fiber: fiberColor,
  };

  if (!diarySummaryVisible) {
    return null;
  }

  const resolveCoreMacro = (key: (typeof CORE_MACROS)[number]) => {
    if (key === 'protein') {
      return {
        label: t('nutrients.protein', { defaultValue: 'Protein' }),
        consumed: summary.protein.consumed,
        goal: summary.protein.goal || undefined,
      };
    }
    if (key === 'carbs') {
      const consumed = showNetCarbs
        ? getNetCarbsValue(summary.carbs.consumed, summary.fiber.consumed)
        : summary.carbs.consumed;
      return {
        label: showNetCarbs
          ? t('nutrients.netCarbs', { defaultValue: 'Net Carbs' })
          : t('nutrients.carbs', { defaultValue: 'Carbs' }),
        consumed,
        goal: summary.carbs.goal || undefined,
      };
    }
    if (key === 'fat') {
      return {
        label: t('nutrients.fat', { defaultValue: 'Fat' }),
        consumed: summary.fat.consumed,
        goal: summary.fat.goal || undefined,
      };
    }
    return {
      label: t('nutrients.fiber', { defaultValue: 'Fiber' }),
      consumed: summary.fiber.consumed,
      goal: summary.fiber.goal || undefined,
    };
  };

  return (
    <View
      className="bg-surface rounded-xl shadow-sm p-2 flex-row flex-wrap justify-between gap-y-2"
      testID="diary-summary-card"
    >
      {CORE_MACROS.map((key) => {
        const { label, consumed, goal: macroGoal } = resolveCoreMacro(key);
        return (
          <NutrientPill
            key={key}
            label={label}
            consumed={consumed}
            goal={macroGoal}
            progressColor={macroColor[key]}
          />
        );
      })}
      {customNutrientKeys.map((name) => {
        const customDef = customNutrients.find((cn) => cn.name === name);
        const meta = NUTRIENT_META[name];
        const label = meta
          ? getNutrientLabel(t, name)
          : (customDef?.name ?? name);
        const unit = meta?.unit ?? customDef?.unit ?? 'g';
        const consumed = summary.customNutrientTotals[name] ?? 0;
        const nutrientGoal = summary.customNutrientGoals[name] || undefined;
        return (
          <NutrientPill
            key={name}
            label={label}
            consumed={consumed}
            goal={nutrientGoal}
            unit={unit}
          />
        );
      })}
    </View>
  );
};

export default DiaryCalorieMacroSummary;
