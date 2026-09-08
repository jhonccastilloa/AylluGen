import type { StyleProp, TextInputProps, TextStyle, ViewStyle } from 'react-native';
import { Text, TextInput, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

export interface BaseInputProps
  extends Omit<TextInputProps, 'value' | 'onChangeText' | 'style'> {
  value: string;
  onChangeText: (value: string) => void;
  label?: string;
  errorMessage?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  prefix?: string;
  suffix?: string;
}

const BaseInput = ({
  value,
  onChangeText,
  label,
  placeholder,
  errorMessage,
  containerStyle,
  inputStyle,
  prefix,
  suffix,
  autoCapitalize = 'none',
  autoCorrect = false,
  ...textInputProps
}: BaseInputProps) => {
  const { theme } = useUnistyles();

  return (
    <View style={[styles.fieldGroup, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={[styles.inputContainer, errorMessage && styles.inputError]}>
        {prefix && <Text style={styles.affixText}>{prefix}</Text>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.inputPlaceholder}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          style={[styles.input, inputStyle]}
          {...textInputProps}
        />
        {suffix && <Text style={styles.affixText}>{suffix}</Text>}
      </View>

      {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
    </View>
  );
};

const styles = StyleSheet.create(theme => ({
  fieldGroup: {
    gap: theme.spacing.xs,
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.md,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  affixText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.typography.fontSize.sm,
  },
}));

export default BaseInput;
