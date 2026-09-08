import { Pressable, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

export type AnimalSexValue = 'male' | 'female' | 'unknown';

interface SexOption {
  label: string;
  value: AnimalSexValue;
}

interface BaseSexInputProps {
  value: AnimalSexValue | '';
  onChange: (value: AnimalSexValue) => void;
  label?: string;
  errorMessage?: string;
  options?: SexOption[];
}

const defaultOptions: SexOption[] = [
  { label: 'Macho', value: 'male' },
  { label: 'Hembra', value: 'female' },
  { label: 'Desconocido', value: 'unknown' },
];

const BaseSexInput = ({
  value,
  onChange,
  label,
  errorMessage,
  options = defaultOptions,
}: BaseSexInputProps) => (
  <View style={styles.fieldGroup}>
    {label && <Text style={styles.label}>{label}</Text>}

    <View style={[styles.optionsRow, errorMessage && styles.optionsRowError]}>
      {options.map(option => {
        const isSelected = option.value === value;

        return (
          <Pressable
            key={option.value}
            style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
            onPress={() => onChange(option.value)}
          >
            <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>

    {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
  </View>
);

const styles = StyleSheet.create(theme => ({
  fieldGroup: {
    gap: theme.spacing.xs,
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    padding: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
  },
  optionsRowError: {
    borderColor: theme.colors.error,
  },
  optionButton: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.sm,
  },
  optionButtonSelected: {
    backgroundColor: theme.colors.primary,
  },
  optionText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    textAlign: 'center',
  },
  optionTextSelected: {
    color: theme.colors.onPrimary,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.typography.fontSize.sm,
  },
}));

export default BaseSexInput;
