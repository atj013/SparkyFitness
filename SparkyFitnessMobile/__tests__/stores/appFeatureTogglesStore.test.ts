import { useAppFeatureTogglesStore } from '../../src/stores/appFeatureTogglesStore';

describe('appFeatureTogglesStore', () => {
  beforeEach(() => {
    useAppFeatureTogglesStore.setState({ off: {} });
  });

  it('has every feature on until it is switched off', () => {
    expect(useAppFeatureTogglesStore.getState().off).toEqual({});
  });

  it('stores only the features switched off', () => {
    const { setOn } = useAppFeatureTogglesStore.getState();
    setOn('mealPlans', false);
    setOn('fasting', false);
    setOn('mealPlans', true);
    expect(useAppFeatureTogglesStore.getState().off).toEqual({ fasting: true });
  });
});
