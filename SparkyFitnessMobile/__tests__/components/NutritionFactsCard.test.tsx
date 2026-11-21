import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import NutritionFactsCard from '../../src/components/NutritionFactsCard';
import type { FoodDisplayValues } from '../../src/utils/foodDetails';

jest.mock('../../src/components/Icon', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ name }: { name: string }) => <View testID={`icon-${name}`} />,
  };
});

jest.mock('../../src/components/FoodNutritionSummary', () => {
  const { View } = require('react-native');
  return {
    FoodNutrientBreakdown: ({ showAll }: { showAll?: boolean }) => (
      <View testID={showAll ? 'breakdown-all' : 'breakdown'} />
    ),
  };
});

const values: FoodDisplayValues = {
  servingSize: 1,
  servingUnit: 'serving',
  calories: 311,
  protein: 1,
  carbs: 78,
  fat: 1.2,
  fiber: 4,
  sugars: 67,
  sodium: 3,
  cholesterol: 0,
};

const rowText = (view: ReturnType<typeof render>, key: string): string => {
  const row = view.getByTestId(`nutrition-facts-row-${key}`);
  // Host Text nodes only; the composite Text wrapping each would repeat it.
  const texts = row.findAll(
    (node) =>
      typeof node.type === 'string' && typeof node.props.children === 'string'
  );
  return texts.map((node) => node.props.children as string).join(' ');
};

describe('NutritionFactsCard', () => {
  it('shows the amount, calories and the main nutrients for one serving', () => {
    const view = render(
      <NutritionFactsCard
        values={values}
        servings={1}
        amountLabel="1 Serving"
      />
    );
    expect(view.getByTestId('nutrition-facts-amount').props.children).toBe(
      '1 Serving'
    );
    expect(view.getByTestId('nutrition-facts-calories')).toHaveTextContent(
      '311'
    );
    expect(rowText(view, 'carbs')).toBe('Total Carbs 78g');
    expect(rowText(view, 'fat')).toBe('Total Fat 1.2g');
    expect(rowText(view, 'sodium')).toBe('Sodium 3mg');
  });

  it('marks a nutrient the food does not list as n/a', () => {
    const view = render(
      <NutritionFactsCard
        values={values}
        servings={1}
        amountLabel="1 Serving"
      />
    );
    expect(rowText(view, 'saturatedFat')).toBe('Sat Fat n/a');
  });

  it('scales every value by the servings', () => {
    const view = render(
      <NutritionFactsCard
        values={values}
        servings={2}
        amountLabel="2 Serving"
      />
    );
    expect(view.getByTestId('nutrition-facts-calories')).toHaveTextContent(
      '622'
    );
    expect(rowText(view, 'carbs')).toBe('Total Carbs 156g');
  });

  it('shows the share of the daily calorie goal when known', () => {
    const view = render(
      <NutritionFactsCard
        values={values}
        servings={1}
        amountLabel="1 Serving"
        calorieGoalPercent={16}
      />
    );
    expect(view.getByText('16% of daily goal')).toBeTruthy();
  });

  it('expands to the full nutrient list and back', () => {
    const view = render(
      <NutritionFactsCard
        values={values}
        servings={1}
        amountLabel="1 Serving"
      />
    );
    expect(view.queryByTestId('breakdown-all')).toBeNull();

    fireEvent.press(view.getByText('View All Nutrients'));
    expect(view.getByTestId('breakdown-all')).toBeTruthy();

    fireEvent.press(view.getByText('Hide All Nutrients'));
    expect(view.queryByTestId('breakdown-all')).toBeNull();
  });

  it('shows Edit Nutrition only when an edit handler is given', () => {
    const onEdit = jest.fn();
    const view = render(
      <NutritionFactsCard
        values={values}
        servings={1}
        amountLabel="1 Serving"
        onEditNutrition={onEdit}
      />
    );
    fireEvent.press(view.getByText('Edit Nutrition'));
    expect(onEdit).toHaveBeenCalledTimes(1);

    view.rerender(
      <NutritionFactsCard
        values={values}
        servings={1}
        amountLabel="1 Serving"
      />
    );
    expect(view.queryByText('Edit Nutrition')).toBeNull();
  });
});
