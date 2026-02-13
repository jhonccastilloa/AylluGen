import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

export type ButtonVariant =
  | 'default'
  | 'destructive'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'link';

export type ButtonSize = 'sm' | 'default' | 'lg' | 'icon';

interface BaseButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

const BaseButton = ({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = 'default',
  size = 'default',
  fullWidth = true,
  containerStyle,
  labelStyle,
}: BaseButtonProps) => {
  const { theme } = useUnistyles();
  const isDisabled = disabled || loading;

  const variantContainerStyles: Record<ButtonVariant, StyleProp<ViewStyle>> = {
    default: styles.variantDefault,
    destructive: styles.variantDestructive,
    outline: styles.variantOutline,
    secondary: styles.variantSecondary,
    ghost: styles.variantGhost,
    link: styles.variantLink,
  };

  const variantLabelStyles: Record<ButtonVariant, StyleProp<TextStyle>> = {
    default: styles.labelDefault,
    destructive: styles.labelDestructive,
    outline: styles.labelOutline,
    secondary: styles.labelSecondary,
    ghost: styles.labelGhost,
    link: styles.labelLink,
  };

  const sizeContainerStyles: Record<ButtonSize, StyleProp<ViewStyle>> = {
    sm: styles.sizeSm,
    default: styles.sizeDefault,
    lg: styles.sizeLg,
    icon: styles.sizeIcon,
  };

  const sizeLabelStyles: Record<ButtonSize, StyleProp<TextStyle>> = {
    sm: styles.labelSm,
    default: styles.labelDefaultSize,
    lg: styles.labelLg,
    icon: styles.labelDefaultSize,
  };

  const spinnerColorByVariant: Record<ButtonVariant, string> = {
    default: theme.colors.onPrimary,
    destructive: theme.colors.onError,
    outline: theme.colors.text,
    secondary: theme.colors.text,
    ghost: theme.colors.text,
    link: theme.colors.primary,
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        sizeContainerStyles[size],
        variantContainerStyles[variant],
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        containerStyle,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <View style={styles.loadingContent}>
          <ActivityIndicator
            size="small"
            color={spinnerColorByVariant[variant]}
          />
          {size !== 'icon' && (
            <Text
              style={[
                styles.labelBase,
                sizeLabelStyles[size],
                variantLabelStyles[variant],
                labelStyle,
              ]}
            >
              {label}
            </Text>
          )}
        </View>
      ) : (
        <Text
          style={[
            styles.labelBase,
            sizeLabelStyles[size],
            variantLabelStyles[variant],
            labelStyle,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create(theme => ({
  base: {
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  fullWidth: {
    width: '100%',
  },
  sizeSm: {
    minHeight: 36,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  sizeDefault: {
    minHeight: 44,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  sizeLg: {
    minHeight: 48,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  sizeIcon: {
    width: 44,
    height: 44,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  variantDefault: {
    backgroundColor: theme.colors.primary,
  },
  variantDestructive: {
    backgroundColor: theme.colors.error,
  },
  variantOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  variantSecondary: {
    backgroundColor: theme.colors.surfaceVariant,
  },
  variantGhost: {
    backgroundColor: 'transparent',
  },
  variantLink: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    minHeight: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    marginTop: 0,
  },
  labelBase: {
    fontWeight: theme.typography.fontWeight.semibold,
  },
  labelSm: {
    fontSize: theme.typography.fontSize.sm,
  },
  labelDefaultSize: {
    fontSize: theme.typography.fontSize.md,
  },
  labelLg: {
    fontSize: theme.typography.fontSize.lg,
  },
  labelDefault: {
    color: theme.colors.onPrimary,
  },
  labelDestructive: {
    color: theme.colors.onError,
  },
  labelOutline: {
    color: theme.colors.text,
  },
  labelSecondary: {
    color: theme.colors.text,
  },
  labelGhost: {
    color: theme.colors.text,
  },
  labelLink: {
    color: theme.colors.primary,
    textDecorationLine: 'underline',
    textDecorationColor: theme.colors.primary,
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.55,
  },
}));

export default BaseButton;
