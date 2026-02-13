import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import featureContainer from '@/features/container';
import type { Animal } from '@/features/animals/interfaces/animals.types';
import type { ProductionType } from '@/features/production/interfaces/production.types';
import { inputDateToIso, todayInputDate } from '@/features/shared/utils/date';
import FormButton from '@/presentation/components/button/FormButton';
import BaseInput from '@/presentation/components/input/BaseInput';
import BaseDateInput from '@/presentation/components/date-input/BaseDateInput';
import BaseParentSelectorInput, {
  type ParentOption,
} from '@/presentation/components/parent-selector-input/BaseParentSelectorInput';
import SyncStatusBanner from '@/presentation/components/SyncStatusBanner';
import AppIcon from '@/presentation/components/appIcon/AppIcon';
import type { RootStackParamList } from '@/presentation/navigation/types';
import { extractApiErrorMessage } from '@/core/utils/apiErrorHandler';
import { useAuthStore } from '@/store/useAuthStore';
import { useNetworkStore } from '@/store/useNetworkStore';

const PRODUCTION_TYPE_OPTIONS: ProductionType[] = [
  'WEIGHT',
  'WOOL',
  'FIBER',
  'MEAT',
  'MILK',
];

const DEFAULT_UNIT_BY_TYPE: Record<ProductionType, string> = {
  WEIGHT: 'kg',
  WOOL: 'kg',
  FIBER: 'kg',
  MEAT: 'kg',
  MILK: 'L',
};

const ProductionRecordFormScreen = () => {
  const { theme } = useUnistyles();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useAuthStore(state => state.user);
  const isOnline = useNetworkStore(state => state.isOnline);
  const isNetworkInitialized = useNetworkStore(state => state.isInitialized);

  const [animals, setAnimals] = useState<Animal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [isUsingCachedData, setIsUsingCachedData] = useState(true);

  const [animalId, setAnimalId] = useState('');
  const [type, setType] = useState<ProductionType>('WEIGHT');
  const [date, setDate] = useState(todayInputDate());
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState(DEFAULT_UNIT_BY_TYPE.WEIGHT);
  const [qualityScore, setQualityScore] = useState('');
  const [notes, setNotes] = useState('');

  const animalOptions = useMemo<ParentOption[]>(
    () =>
      animals.map(item => ({
        id: item.id,
        code: item.crotal,
        sex:
          item.sex === 'MALE'
            ? 'male'
            : item.sex === 'FEMALE'
              ? 'female'
              : 'unknown',
      })),
    [animals],
  );

  const loadLocalAnimals = useCallback(async () => {
    if (!user?.id) return;
    const localAnimals = await featureContainer.animals.listInventory(user.id);
    setAnimals(localAnimals);
    setIsUsingCachedData(true);
  }, [user?.id]);

  const refreshAnimalsFromServer = useCallback(async () => {
    if (!user?.id) return;
    const remoteAnimals = await featureContainer.animals.listInventory(
      user.id,
      undefined,
      { refreshFromServer: true },
    );
    setAnimals(remoteAnimals);
    setIsUsingCachedData(false);
  }, [user?.id]);

  const loadAnimals = useCallback(async () => {
    setError(undefined);
    setIsLoading(true);
    try {
      await loadLocalAnimals();
      if (!isNetworkInitialized || isOnline) {
        await refreshAnimalsFromServer();
      }
    } catch (loadError) {
      setError(extractApiErrorMessage(loadError));
      setIsUsingCachedData(true);
    } finally {
      setIsLoading(false);
    }
  }, [
    isNetworkInitialized,
    isOnline,
    loadLocalAnimals,
    refreshAnimalsFromServer,
  ]);

  useEffect(() => {
    loadAnimals();
  }, [loadAnimals]);

  const onSelectType = (nextType: ProductionType) => {
    setType(nextType);
    setUnit(DEFAULT_UNIT_BY_TYPE[nextType]);
  };

  const submitRecord = async () => {
    if (!user?.id) return;
    if (!animalId) {
      Toast.show({
        type: 'info',
        text1: t('production.missingAnimalTitle'),
        text2: t('production.missingAnimalMessage'),
      });
      return;
    }

    const dateIso = inputDateToIso(date);
    if (!dateIso) {
      Alert.alert(t('production.invalidDateTitle'), t('production.invalidDateMessage'));
      return;
    }

    const parsedValue = Number(value);
    if (!value.trim() || Number.isNaN(parsedValue) || parsedValue <= 0) {
      Alert.alert(t('production.invalidValueTitle'), t('production.invalidValueMessage'));
      return;
    }

    const hasQualityScore = qualityScore.trim().length > 0;
    const parsedQualityScore = hasQualityScore ? Number(qualityScore) : undefined;
    if (
      hasQualityScore &&
      (parsedQualityScore === undefined ||
        Number.isNaN(parsedQualityScore) ||
        parsedQualityScore < 0 ||
        parsedQualityScore > 100)
    ) {
      Alert.alert(
        t('production.invalidQualityTitle'),
        t('production.invalidQualityMessage'),
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await featureContainer.production.create(user.id, {
        animalId,
        type,
        date: dateIso,
        value: parsedValue,
        unit: unit.trim() || DEFAULT_UNIT_BY_TYPE[type],
        qualityScore: parsedQualityScore,
        notes: notes.trim() ? notes.trim() : undefined,
      });

      featureContainer.sync.syncNow(user.id).catch(() => {
        // Sync feedback is handled globally.
      });

      Toast.show({
        type: 'success',
        text1: t('production.successTitle'),
        text2:
          isOnline || !isNetworkInitialized
            ? t('production.successOnline')
            : t('production.successOffline'),
      });

      navigation.goBack();
    } catch (submitError) {
      Toast.show({
        type: 'error',
        text1: t('production.errorTitle'),
        text2: extractApiErrorMessage(submitError),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <AppIcon name="currencyDolar" size="sm" mColor={theme.colors.primary} />
          </View>
          <View style={styles.headerTextBlock}>
            <Text style={styles.title}>{t('production.newRecord')}</Text>
            <Text style={styles.subtitle}>{t('production.subtitle')}</Text>
          </View>
        </View>

        <SyncStatusBanner showCacheHint={isUsingCachedData} />

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={loadAnimals}>
              <Text style={styles.retryButtonText}>{t('retry')}</Text>
            </Pressable>
          </View>
        ) : null}

        {isLoading ? (
          <View style={styles.feedbackCard}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.feedbackText}>{t('offline.banner.cacheDescription')}</Text>
          </View>
        ) : (
          <View style={styles.formCard}>
            <BaseParentSelectorInput
              label={t('production.animalLabel')}
              value={animalId}
              onChangeText={setAnimalId}
              options={animalOptions}
            />

            {animals.length === 0 ? (
              <View style={styles.emptyAnimalsCard}>
                <Text style={styles.feedbackText}>{t('herd.noAnimalsText')}</Text>
                <Pressable
                  style={styles.secondaryAction}
                  onPress={() => navigation.navigate('RegisterAnimal')}
                >
                  <Text style={styles.secondaryActionText}>{t('herd.register')}</Text>
                </Pressable>
              </View>
            ) : null}

            <Text style={styles.formLabel}>{t('production.typeLabel')}</Text>
            <View style={styles.typeRow}>
              {PRODUCTION_TYPE_OPTIONS.map(option => (
                <Pressable
                  key={option}
                  style={[styles.typeChip, type === option && styles.typeChipSelected]}
                  onPress={() => onSelectType(option)}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      type === option && styles.typeChipTextSelected,
                    ]}
                  >
                    {t(`production.types.${option}`)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <BaseDateInput
              label={t('production.dateLabel')}
              value={date}
              onChangeText={setDate}
            />

            <BaseInput
              label={t('production.valueLabel')}
              value={value}
              onChangeText={setValue}
              placeholder={t('production.valuePlaceholder')}
              keyboardType="decimal-pad"
            />

            <BaseInput
              label={t('production.unitLabel')}
              value={unit}
              onChangeText={setUnit}
              placeholder={t('production.unitPlaceholder')}
            />

            <BaseInput
              label={t('production.qualityLabel')}
              value={qualityScore}
              onChangeText={setQualityScore}
              placeholder={t('production.qualityPlaceholder')}
              keyboardType="numeric"
            />

            <BaseInput
              label={t('production.notesLabel')}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('production.notesPlaceholder')}
              multiline
            />

            <FormButton
              label={t('production.submit')}
              loadingLabel={t('production.submitting')}
              loading={isSubmitting}
              onPress={submitRecord}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create(theme => ({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  headerIcon: {
    width: theme.spacing.xxl,
    height: theme.spacing.xxl,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextBlock: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    textTransform: 'uppercase',
  },
  formCard: {
    borderRadius: theme.borderRadius.xl,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  emptyAnimalsCard: {
    borderRadius: theme.borderRadius.md,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.warningSoftBorder,
    backgroundColor: theme.colors.warningSoft,
    padding: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  secondaryAction: {
    minHeight: theme.spacing.xl + theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.warningDark,
    backgroundColor: theme.colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  secondaryActionText: {
    color: theme.colors.warningDark,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    textTransform: 'uppercase',
  },
  formLabel: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  typeChip: {
    borderRadius: theme.borderRadius.full,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceVariant,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  typeChipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  typeChipText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
  },
  typeChipTextSelected: {
    color: theme.colors.onPrimary,
  },
  feedbackCard: {
    borderRadius: theme.borderRadius.lg,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  feedbackText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    textAlign: 'center',
  },
  errorCard: {
    borderRadius: theme.borderRadius.lg,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.errorSoftBorder,
    backgroundColor: theme.colors.errorSoft,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  errorText: {
    color: theme.colors.errorDark,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
  retryButton: {
    minHeight: theme.spacing.xxl,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  retryButtonText: {
    color: theme.colors.onPrimary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    textTransform: 'uppercase',
  },
}));

export default ProductionRecordFormScreen;
