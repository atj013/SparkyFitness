import React from 'react';
import { View, Text } from 'react-native';

interface NutrientPillProps {
  label: string;
  consumed: number;
  goal?: number;
  unit?: string;
  /** With a goal, draws a thin progress line in this color under the value. */
  progressColor?: string;
}

const NutrientPill: React.FC<NutrientPillProps> = ({
  label,
  consumed,
  goal,
  unit = 'g',
  progressColor,
}) => {
  const showProgress = !!progressColor && !!goal && goal > 0;
  const percent = showProgress ? Math.min(100, (consumed / goal) * 100) : 0;
  return (
    <View className="w-[23%] bg-border rounded-xl px-0.5 py-1.5 items-center">
      <Text className="text-xs text-text-primary mb-0.5" numberOfLines={1}>
        {label}
      </Text>
      <Text
        className="text-xs font-bold text-text-primary text-center"
        numberOfLines={1}
      >
        {goal && goal > 0
          ? `${Math.round(consumed)}${unit} / ${Math.round(goal)}${unit}`
          : `${Math.round(consumed)}${unit}`}
      </Text>
      {showProgress ? (
        <View
          className="self-stretch mx-1.5 mt-1 h-[3px] rounded-full bg-progress-rail overflow-hidden"
          testID="nutrient-pill-progress"
        >
          <View
            className="h-[3px] rounded-full"
            style={{ width: `${percent}%`, backgroundColor: progressColor }}
          />
        </View>
      ) : null}
    </View>
  );
};

export default NutrientPill;
