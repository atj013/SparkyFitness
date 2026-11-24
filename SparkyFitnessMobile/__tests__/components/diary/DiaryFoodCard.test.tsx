import React from 'react';
import { render } from '@testing-library/react-native';

import DiaryFoodCard from '../../../src/components/diary/DiaryFoodCard';

jest.mock('../../../src/components/Icon', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: () => <View /> };
});
jest.mock('uniwind', () => ({
  useCSSVariable: (names: string | string[]) =>
    Array.isArray(names) ? names.map(() => '#111827') : '#111827',
}));

function renderCard(
  props: Partial<React.ComponentProps<typeof DiaryFoodCard>> = {}
) {
  return render(
    <DiaryFoodCard
      foodEntries={[]}
      mealTypes={[]}
      onAddFood={jest.fn()}
      {...props}
    />
  );
}

describe('DiaryFoodCard header', () => {
  it('shows calories, protein and fiber as three columns', () => {
    const screen = renderCard({
      macros: {
        calories: 2308.4,
        protein: { consumed: 51.2, goal: 150 },
        fiber: { consumed: 2, goal: 0 },
      },
    });

    expect(screen.getByText('Calories')).toBeTruthy();
    expect(screen.getByText('2308 kcal')).toBeTruthy();
    expect(screen.getByText('Protein')).toBeTruthy();
    expect(screen.getByText('51/150 g')).toBeTruthy();
    // No goal: just the amount.
    expect(screen.getByText('Fiber')).toBeTruthy();
    expect(screen.getByText('2 g')).toBeTruthy();
  });

  it('leaves the columns out without macros', () => {
    const screen = renderCard();
    expect(screen.queryByTestId('diary-food-macros')).toBeNull();
    expect(screen.getByText('Food')).toBeTruthy();
  });
});
