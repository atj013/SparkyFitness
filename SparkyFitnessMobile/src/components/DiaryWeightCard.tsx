import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { useCSSVariable } from 'uniwind';
import Icon from './Icon';
import { useLatestMeasurementsOnOrBefore } from '../hooks/useMeasurements';
import {
  formatWeightDisplay,
  type WeightDisplayMode,
} from '../utils/unitConversions';

interface DiaryWeightCardProps {
  date: string;
  weightMode: WeightDisplayMode;
  enabled: boolean;
  onPress: () => void;
}

/**
 * Current weight on the Diary: the newest weight logged on or before the day
 * shown, even when it was logged on an earlier day. Tapping opens the day's
 * check-in to log a new one.
 */
const DiaryWeightCard: React.FC<DiaryWeightCardProps> = ({
  date,
  weightMode,
  enabled,
  onPress,
}) => {
  const { t } = useTranslation();
  const [accentPrimary, mutedColor] = useCSSVariable([
    '--color-accent-primary',
    '--color-text-muted',
  ]) as [string, string];
  const { latestMeasurements } = useLatestMeasurementsOnOrBefore({
    date,
    enabled,
  });
  const weightKg = Number(latestMeasurements?.weight);
  const hasWeight = Number.isFinite(weightKg) && weightKg > 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('diary.weightCard.a11y', {
        defaultValue: 'Log weight for this day',
      })}
      className="bg-surface rounded-xl p-4 mb-2 shadow-sm flex-row items-center gap-3"
      testID="diary-weight-card"
    >
      <Icon name="scale" size={20} color={accentPrimary} />
      <View className="flex-1">
        <Text className="text-base font-bold text-text-secondary">
          {t('diary.weightCard.title', { defaultValue: 'Current weight' })}
        </Text>
        {!hasWeight ? (
          <Text className="text-sm text-text-muted">
            {t('diary.weightCard.none', {
              defaultValue: 'No weight logged yet',
            })}
          </Text>
        ) : null}
      </View>
      {hasWeight ? (
        <Text
          className="text-xl font-bold text-text-primary"
          testID="diary-weight-value"
        >
          {formatWeightDisplay(weightKg, weightMode)}
        </Text>
      ) : null}
      <Icon name="chevron-forward" size={16} color={mutedColor} />
    </Pressable>
  );
};

export default DiaryWeightCard;
