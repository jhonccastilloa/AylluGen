import { useMemo, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useTranslation } from 'react-i18next';
import AppIcon from '@/presentation/components/appIcon/AppIcon';

export interface BaseDateInputProps {
  value: string;
  onChangeText: (value: string) => void;
  onBlur?: () => void;
  label?: string;
  placeholder?: string;
  errorMessage?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
  allowClear?: boolean;
}

const toInputDate = (date: Date): string => date.toISOString().slice(0, 10);

const parseInputDate = (value: string): Date => {
  if (!value.trim()) return new Date();
  const parsedDate = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsedDate.getTime())) {
    return new Date();
  }
  return parsedDate;
};

const BaseDateInput = ({
  value,
  onChangeText,
  onBlur,
  label,
  placeholder = 'YYYY-MM-DD',
  errorMessage,
  minimumDate,
  maximumDate,
  disabled = false,
  allowClear = false,
}: BaseDateInputProps) => {
  const { theme } = useUnistyles();
  const { t } = useTranslation();
  const [isPickerVisible, setPickerVisible] = useState(false);

  const selectedDate = useMemo(() => parseInputDate(value), [value]);

  const onPickerChange = (event: DateTimePickerEvent, nextDate?: Date) => {
    if (Platform.OS === 'android') {
      setPickerVisible(false);
    }

    if (event.type === 'dismissed') {
      onBlur?.();
      return;
    }
    if (!nextDate) {
      onBlur?.();
      return;
    }
    onChangeText(toInputDate(nextDate));
    onBlur?.();
  };

  return (
    <View style={styles.fieldGroup}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <Pressable
        style={[
          styles.selector,
          errorMessage && styles.selectorError,
          disabled && styles.selectorDisabled,
        ]}
        onPress={() => setPickerVisible(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label ?? t('health.dateLabel')}
      >
        <Text style={[styles.selectorText, !value && styles.placeholderText]}>
          {value || placeholder}
        </Text>
        {allowClear && value ? (
          <Pressable
            onPress={event => {
              event.stopPropagation();
              onChangeText('');
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('parentSelector.clear')}
          >
            <Text style={styles.clearText}>{t('parentSelector.clear')}</Text>
          </Pressable>
        ) : (
          <AppIcon name="calendarBlank" size="sm" mColor={theme.colors.primary} />
        )}
      </Pressable>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      {isPickerVisible ? (
        <View style={styles.pickerContainer}>
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onPickerChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
          />
          {Platform.OS === 'ios' ? (
            <Pressable
              style={styles.closeButton}
              onPress={() => {
                setPickerVisible(false);
                onBlur?.();
              }}
              accessibilityRole="button"
              accessibilityLabel={t('parentSelector.close')}
            >
              <Text style={styles.closeButtonText}>{t('parentSelector.close')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
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
  selector: {
    minHeight: theme.spacing.xxl,
    borderRadius: theme.borderRadius.md,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  selectorError: {
    borderColor: theme.colors.error,
  },
  selectorDisabled: {
    opacity: 0.6,
  },
  selectorText: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
  },
  placeholderText: {
    color: theme.colors.inputPlaceholder,
  },
  clearText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.typography.fontSize.sm,
  },
  pickerContainer: {
    borderRadius: theme.borderRadius.md,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.xs,
  },
  closeButton: {
    alignSelf: 'flex-end',
    marginRight: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  closeButtonText: {
    color: theme.colors.primary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
}));

export default BaseDateInput;
