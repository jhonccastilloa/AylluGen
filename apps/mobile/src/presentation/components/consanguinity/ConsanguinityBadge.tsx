import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

type ConsanguinityLevel = 'low' | 'medium' | 'high' | 'unknown';

interface ConsanguinityBadgeProps {
  value?: number | string | null;
  lowThreshold?: number;
  mediumThreshold?: number;
}

const getConsanguinityLevel = (
  value: number | null,
  lowThreshold: number,
  mediumThreshold: number,
): ConsanguinityLevel => {
  if (value === null || Number.isNaN(value)) {
    return 'unknown';
  }

  if (value <= lowThreshold) {
    return 'low';
  }

  if (value <= mediumThreshold) {
    return 'medium';
  }

  return 'high';
};

const toNumberOrNull = (value?: number | string | null): number | null => {
  if (value == null || value === '') {
    return null;
  }

  const normalizedValue =
    typeof value === 'string' ? Number(value.replace(',', '.')) : value;

  return Number.isFinite(normalizedValue) ? normalizedValue : null;
};

const ConsanguinityBadge = ({
  value,
  lowThreshold = 6.25,
  mediumThreshold = 12.5,
}: ConsanguinityBadgeProps) => {
  const numericValue = toNumberOrNull(value);
  const level = getConsanguinityLevel(
    numericValue,
    Math.min(lowThreshold, mediumThreshold),
    Math.max(lowThreshold, mediumThreshold),
  );

  const labelByLevel: Record<ConsanguinityLevel, string> = {
    low: 'Riesgo bajo',
    medium: 'Riesgo medio',
    high: 'Riesgo alto',
    unknown: 'Sin dato',
  };

  const valueLabel =
    numericValue === null ? '--' : `${Math.max(0, numericValue).toFixed(2)}%`;

  return (
    <View style={[styles.base, styles[`container_${level}`]]}>
      <Text style={[styles.valueText, styles[`text_${level}`]]}>{valueLabel}</Text>
      <Text style={[styles.statusText, styles[`text_${level}`]]}>
        {labelByLevel[level]}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create(theme => ({
  base: {
    minHeight: 32,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    alignSelf: 'flex-start',
  },
  valueText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
  },
  statusText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  container_low: {
    backgroundColor: theme.colors.successSoft,
    borderWidth: 1,
    borderColor: theme.colors.successSoftBorder,
  },
  container_medium: {
    backgroundColor: theme.colors.warningSoft,
    borderWidth: 1,
    borderColor: theme.colors.warningSoftBorder,
  },
  container_high: {
    backgroundColor: theme.colors.errorSoft,
    borderWidth: 1,
    borderColor: theme.colors.errorSoftBorder,
  },
  container_unknown: {
    backgroundColor: theme.colors.surfaceVariant,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  text_low: {
    color: theme.colors.successDark,
  },
  text_medium: {
    color: theme.colors.warningDark,
  },
  text_high: {
    color: theme.colors.errorDark,
  },
  text_unknown: {
    color: theme.colors.textSecondary,
  },
}));

export default ConsanguinityBadge;
