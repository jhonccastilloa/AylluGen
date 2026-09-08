import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useTranslation } from 'react-i18next';

export interface ParentOption {
  id: string;
  code: string;
  name?: string;
  sex?: 'male' | 'female' | 'unknown';
  breed?: string;
}

export interface ParentSelectorModalAction {
  id: string;
  label: string;
  onPress: (query: string) => void;
  closeOnPress?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

interface BaseParentSelectorInputProps {
  value: string;
  onChangeText: (value: string) => void;
  options: ParentOption[];
  label?: string;
  placeholder?: string;
  errorMessage?: string;
  modalTitle?: string;
  searchPlaceholder?: string;
  allowClear?: boolean;
  modalActions?: ParentSelectorModalAction[];
  disabled?: boolean;
  disabledMessage?: string;
}

const formatOptionLabel = (option: ParentOption): string => {
  const fragments = [option.code];

  if (option.name) {
    fragments.push(option.name);
  }

  if (option.breed) {
    fragments.push(option.breed);
  }

  return fragments.join(' | ');
};

const BaseParentSelectorInput = ({
  value,
  onChangeText,
  options,
  label,
  placeholder,
  errorMessage,
  modalTitle,
  searchPlaceholder,
  allowClear = true,
  modalActions,
  disabled = false,
  disabledMessage,
}: BaseParentSelectorInputProps) => {
  const { theme } = useUnistyles();
  const { t } = useTranslation();
  const [isModalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState('');
  const resolvedPlaceholder = placeholder ?? t('parentSelector.placeholder');
  const resolvedModalTitle = modalTitle ?? t('parentSelector.modalTitle');
  const resolvedSearchPlaceholder =
    searchPlaceholder ?? t('parentSelector.searchPlaceholder');

  const selectedOption = useMemo(
    () => options.find(option => option.id === value),
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return options;
    }

    return options.filter(option => {
      const haystack = [option.code, option.name, option.breed]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [options, query]);

  return (
    <View style={styles.fieldGroup}>
      {label && <Text style={styles.label}>{label}</Text>}

      <Pressable
        style={[
          styles.selector,
          errorMessage && styles.selectorError,
          disabled && styles.selectorDisabled,
        ]}
        onPress={() => setModalOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label ?? resolvedModalTitle}
      >
        <Text
          style={[
            styles.selectorText,
            !selectedOption && styles.selectorPlaceholderText,
          ]}
        >
          {selectedOption
            ? formatOptionLabel(selectedOption)
            : disabled && disabledMessage
              ? disabledMessage
              : resolvedPlaceholder}
        </Text>

        {allowClear && selectedOption ? (
          <Pressable
            style={styles.clearButton}
            onPress={event => {
              event.stopPropagation();
              onChangeText('');
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('parentSelector.clear')}
          >
            <Text style={styles.clearButtonText}>{t('parentSelector.clear')}</Text>
          </Pressable>
        ) : (
          <Text style={styles.openText}>{t('parentSelector.choose')}</Text>
        )}
      </Pressable>

      {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

      <Modal
        visible={isModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{resolvedModalTitle}</Text>
              <Pressable
                onPress={() => setModalOpen(false)}
                accessibilityRole="button"
                accessibilityLabel={t('parentSelector.close')}
              >
                <Text style={styles.modalCloseText}>{t('parentSelector.close')}</Text>
              </Pressable>
            </View>

            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={resolvedSearchPlaceholder}
              placeholderTextColor={theme.colors.inputPlaceholder}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.searchInput}
            />

            <FlatList
              data={filteredOptions}
              keyExtractor={item => item.id}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={styles.optionsList}
              ListEmptyComponent={
                <Text style={styles.emptyText}>{t('parentSelector.emptySearch')}</Text>
              }
              renderItem={({ item }) => {
                const isSelected = item.id === value;

                return (
                  <Pressable
                    style={[
                      styles.optionRow,
                      isSelected && styles.optionRowSelected,
                    ]}
                    onPress={() => {
                      onChangeText(item.id);
                      setModalOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={formatOptionLabel(item)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.optionTextSelected,
                      ]}
                    >
                      {formatOptionLabel(item)}
                    </Text>
                  </Pressable>
                );
              }}
            />

            {modalActions && modalActions.length > 0 ? (
              <View style={styles.modalActionsContainer}>
                {modalActions.map(action => (
                  <Pressable
                    key={action.id}
                    style={[
                      styles.modalActionButton,
                      action.variant === 'primary' && styles.modalActionButtonPrimary,
                      action.disabled && styles.modalActionButtonDisabled,
                    ]}
                    disabled={action.disabled}
                    onPress={() => {
                      if (action.closeOnPress !== false) {
                        setModalOpen(false);
                      }
                      action.onPress(query.trim());
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={action.label}
                  >
                    <Text
                      style={[
                        styles.modalActionText,
                        action.variant === 'primary' && styles.modalActionTextPrimary,
                        action.disabled && styles.modalActionTextDisabled,
                      ]}
                    >
                      {action.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
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
    minHeight: 52,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
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
  },
  selectorPlaceholderText: {
    color: theme.colors.inputPlaceholder,
  },
  openText: {
    color: theme.colors.primary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  clearButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceVariant,
  },
  clearButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.typography.fontSize.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '80%',
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
  },
  modalCloseText: {
    color: theme.colors.primary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  searchInput: {
    minHeight: 44,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.md,
  },
  optionsList: {
    marginTop: theme.spacing.xs,
  },
  optionRow: {
    minHeight: 48,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  optionRowSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surfaceVariant,
  },
  optionText: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.sm,
  },
  optionTextSelected: {
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.sm,
    paddingVertical: theme.spacing.md,
  },
  modalActionsContainer: {
    marginTop: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  modalActionButton: {
    minHeight: theme.spacing.xxl,
    borderRadius: theme.borderRadius.md,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  modalActionButtonPrimary: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  modalActionButtonDisabled: {
    backgroundColor: theme.colors.surfaceVariant,
    borderColor: theme.colors.border,
  },
  modalActionText: {
    color: theme.colors.primary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    textTransform: 'uppercase',
  },
  modalActionTextPrimary: {
    color: theme.colors.onPrimary,
  },
  modalActionTextDisabled: {
    color: theme.colors.textSecondary,
  },
}));

export default BaseParentSelectorInput;
