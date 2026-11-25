import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { useCSSVariable } from 'uniwind';
import Icon, { type IconName } from './Icon';

interface CreateTileProps {
  icon: IconName;
  title: string;
  onPress: () => void;
  disabled?: boolean;
  className?: string;
}

/** A small icon-over-label button; four sit in one row on the Hub. */
const CreateTile: React.FC<CreateTileProps> = ({
  icon,
  title,
  onPress,
  disabled = false,
  className = '',
}) => {
  const accentPrimary = useCSSVariable('--color-accent-primary') as string;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={disabled ? { opacity: 0.7 } : undefined}
      className={`bg-surface rounded-xl py-3 px-1 items-center shadow-sm ${className}`}
    >
      <Icon name={icon} size={22} color={accentPrimary} />
      <Text
        className="text-text-primary text-xs font-medium mt-1"
        numberOfLines={1}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

export default CreateTile;
