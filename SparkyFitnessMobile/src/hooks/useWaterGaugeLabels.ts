import { useMemo } from 'react';
import { formatLocalizedNumber } from '../localization';
import type { WaterContainer } from '../types/measurements';

/**
 * The text the hydration gauge shows for the selected container and the
 * quick-add presets, shared by the Dashboard and the Diary so both cards read
 * the same.
 */
export function useWaterGaugeLabels(
  activeContainer: WaterContainer | null | undefined,
  quickAddPresets: WaterContainer[]
) {
  // A linked container has no volume of its own, so state what one press logs
  // in the linked variant's own unit instead of a millilitre figure it does
  // not have.
  const linkedPressLabel = useMemo(() => {
    if (!activeContainer?.linked_food_id) return undefined;
    const quantity = Number(activeContainer.linked_quantity ?? 1);
    const unit = activeContainer.linked_variant_serving_unit || '';
    const name = activeContainer.linked_food_name || '';
    if (!unit || !Number.isFinite(quantity) || quantity <= 0) return name;
    const amount = `${formatLocalizedNumber(quantity, { maximumFractionDigits: 2 })} ${unit}`;
    return name ? `${amount} · ${name}` : amount;
  }, [activeContainer]);

  // Each preset states what one tap logs, in the linked drink's own unit --
  // the same phrasing the selected container uses above it.
  const quickAddOptions = useMemo(
    () =>
      quickAddPresets.map((preset) => {
        const quantity = Number(preset.linked_quantity ?? 1);
        const unit = preset.linked_variant_serving_unit || '';
        return {
          id: preset.id,
          name: preset.linked_food_name || preset.name,
          pressLabel:
            unit && Number.isFinite(quantity) && quantity > 0
              ? `${formatLocalizedNumber(quantity, { maximumFractionDigits: 2 })} ${unit}`
              : undefined,
        };
      }),
    [quickAddPresets]
  );

  return { linkedPressLabel, quickAddOptions };
}
