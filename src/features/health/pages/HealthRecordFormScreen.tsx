import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
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
import type { HealthType } from '@/features/health/interfaces/health.types';
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

const HEALTH_TYPE_OPTIONS: HealthType[] = [
  'VACCINATION',
  'DEWORMING',
  'SHEARING',
  'CHECKUP',
  'TREATMENT',
];

const HealthRecordFormScreen = () => {
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
  const [type, setType] = useState<HealthType>('VACCINATION');
  const [date, setDate] = useState(todayInputDate());
  const [nextDueDate, setNextDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [completed, setCompleted] = useState(false);

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

  const submitRecord = async () => {
    if (!user?.id) return;
    if (!animalId) {
      Toast.show({
        type: 'info',
        text1: t('health.missingAnimalTitle'),
        text2: t('health.missingAnimalMessage'),
      });
      return;
    }

    const dateIso = inputDateToIso(date);
    if (!dateIso) {
      Alert.alert(t('health.invalidDateTitle'), t('health.invalidDateMessage'));
      return;
    }

    const nextDueDateIso = inputDateToIso(nextDueDate);
    if (nextDueDate && !nextDueDateIso) {
      Alert.alert(t('health.invalidDateTitle'), t('health.invalidDateMessage'));
      return;
    }

    setIsSubmitting(true);
    try {
      await featureContainer.health.create(user.id, {
        animalId,
        type,
        date: dateIso,
        nextDueDate: nextDueDateIso,
        notes: notes.trim() ? notes.trim() : undefined,
        completed,
      });

      featureContainer.sync.syncNow(user.id).catch(() => {
        // Sync feedback is handled globally.
      });

      Toast.show({
        type: 'success',
        text1: t('health.successTitle'),
        text2:
          isOnline || !isNetworkInitialized
            ? t('health.successOnline')
            : t('health.successOffline'),
      });

      navigation.goBack();
    } catch (submitError) {
      Toast.show({
        type: 'error',
        text1: t('health.errorTitle'),
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
            <AppIcon name="calendarBlank" size="sm" mColor={theme.colors.primary} />
          </View>
          <View style={styles.headerTextBlock}>
            <Text style={styles.title}>{t('health.newRecord')}</Text>
            <Text style={styles.subtitle}>{t('health.subtitle')}</Text>
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
              label={t('health.animalLabel')}
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

            <Text style={styles.formLabel}>{t('health.typeLabel')}</Text>
            <View style={styles.typeRow}>
              {HEALTH_TYPE_OPTIONS.map(option => (
                <Pressable
                  key={option}
                  style={[styles.typeChip, type === option && styles.typeChipSelected]}
                  onPress={() => setType(option)}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      type === option && styles.typeChipTextSelected,
                    ]}
                  >
                    {t(`health.types.${option}`)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <BaseDateInput
              label={t('health.dateLabel')}
              value={date}
              onChangeText={setDate}
            />

            <BaseDateInput
              label={t('health.nextDueDateLabel')}
              value={nextDueDate}
              onChangeText={setNextDueDate}
              allowClear
            />

            <BaseInput
              label={t('health.notesLabel')}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('health.notesPlaceholder')}
              multiline
            />

            <View style={styles.switchRow}>
              <Text style={styles.formLabel}>{t('health.completedLabel')}</Text>
              <Switch value={completed} onValueChange={setCompleted} />
            </View>

            <FormButton
              label={t('health.submit')}
              loadingLabel={t('health.submitting')}
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.xs,
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

export default HealthRecordFormScreen;
