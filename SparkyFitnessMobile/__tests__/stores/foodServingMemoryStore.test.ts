import {
  findRememberedOption,
  servingMemoryKeyFor,
  trimRememberedServings,
  useFoodServingMemoryStore,
  type RememberedServing,
} from '../../src/stores/foodServingMemoryStore';

const remembered = (
  servingSize: number,
  servingUnit: string,
  quantity: number,
  at = 1
): RememberedServing => ({ servingSize, servingUnit, quantity, at });

describe('foodServingMemoryStore', () => {
  beforeEach(() => {
    useFoodServingMemoryStore.getState().clear();
  });

  describe('servingMemoryKeyFor', () => {
    it('keys a saved food by its id', () => {
      expect(servingMemoryKeyFor({ id: 'f1', source: 'local' })).toBe(
        'food:f1'
      );
    });

    it('keys a provider result by provider and external id', () => {
      expect(
        servingMemoryKeyFor({
          id: '0696685120029',
          source: 'external',
          provider_type: 'openfoodfacts',
        })
      ).toBe('ext:openfoodfacts:0696685120029');
    });

    it('does not remember meals', () => {
      expect(servingMemoryKeyFor({ id: 'm1', source: 'meal' })).toBeNull();
    });
  });

  describe('findRememberedOption', () => {
    const options = [
      { id: 'slices', servingSize: 2, servingUnit: 'slice' },
      { id: 'grams', servingSize: 68, servingUnit: 'g' },
    ];

    it('finds the option with the same size and unit', () => {
      expect(findRememberedOption(options, remembered(68, 'g', 150))?.id).toBe(
        'grams'
      );
    });

    it('ignores case and stray spaces in the unit', () => {
      expect(
        findRememberedOption(options, remembered(2, ' Slice ', 1))?.id
      ).toBe('slices');
    });

    it('finds nothing when the serving no longer exists', () => {
      expect(
        findRememberedOption(options, remembered(1, 'cup', 1))
      ).toBeUndefined();
      expect(findRememberedOption(options, undefined)).toBeUndefined();
    });
  });

  it('remembers a serving under every key given', () => {
    useFoodServingMemoryStore.getState().remember(['ext:off:1', 'food:f1'], {
      servingSize: 2,
      servingUnit: 'slice',
      quantity: 1,
    });
    const { servings } = useFoodServingMemoryStore.getState();
    expect(servings['ext:off:1']).toMatchObject({ quantity: 1 });
    expect(servings['food:f1']).toMatchObject({ servingUnit: 'slice' });
  });

  it('keeps only the most recently logged foods past the cap', () => {
    const trimmed = trimRememberedServings(
      {
        old: remembered(1, 'g', 1, 1),
        mid: remembered(1, 'g', 1, 2),
        recent: remembered(1, 'g', 1, 3),
      },
      2
    );
    expect(Object.keys(trimmed).sort()).toEqual(['mid', 'recent']);
  });
});
