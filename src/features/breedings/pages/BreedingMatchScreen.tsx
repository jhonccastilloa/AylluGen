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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/presentation/navigation/types';
import type { Animal } from '@/features/animals/interfaces/animals.types';
import type { Breeding } from '@/features/breedings/interfaces/breedings.types';
import featureContainer from '@/features/container';
import { useAuthStore } from '@/store/useAuthStore';
import Toast from 'react-native-toast-message';
import AppIcon from '@/presentation/components/appIcon/AppIcon';
import { useTranslation } from 'react-i18next';
import SyncStatusBanner from '@/presentation/components/SyncStatusBanner';
import { useNetworkStore } from '@/store/useNetworkStore';
import { extractApiErrorMessage } from '@/core/utils/apiErrorHandler';
import BaseParentSelectorInput, {
  type ParentOption,
} from '@/presentation/components/parent-selector-input/BaseParentSelectorInput';

type Props = NativeStackScreenProps<RootStackParamList, 'BreedingMatch'>;

const BreedingMatchScreen = ({ navigation }: Props) => {
  const { theme } = useUnistyles();
  const { t } = useTranslation();
  const user = useAuthStore(state => state.user);
  const isOnline = useNetworkStore(state => state.isOnline);
  const isNetworkInitialized = useNetworkStore(state => state.isInitialized);

  const [males, setMales] = useState<Animal[]>([]);
  const [females, setFemales] = useState<Animal[]>([]);
  const [selectedMaleId, setSelectedMaleId] = useState('');
  const [selectedFemaleId, setSelectedFemaleId] = useState('');
  const [loading, setLoading] = useState(false);
  const [parentsLoading, setParentsLoading] = useState(true);
  const [parentsError, setParentsError] = useState<string | undefined>(undefined);
  const [historyRecords, setHistoryRecords] = useState<Breeding[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isUsingCachedData, setIsUsingCachedData] = useState(true);

  const loadParentsFromLocal = useCallback(async () => {
    if (!user?.id) return;
    const [localMales, localFemales] = await Promise.all([
      featureContainer.animals.listInventory(user.id, { sex: 'MALE' }),
      featureContainer.animals.listInventory(user.id, { sex: 'FEMALE' }),
    ]);
    setMales(localMales);
    setFemales(localFemales);
    setIsUsingCachedData(true);
  }, [user?.id]);

  const refreshParentsFromServer = useCallback(async () => {
    if (!user?.id) return;
    const [remoteMales, remoteFemales] = await Promise.all([
      featureContainer.animals.getMales(user.id),
      featureContainer.animals.getFemales(user.id),
    ]);
    setMales(remoteMales);
    setFemales(remoteFemales);
    await featureContainer.breedings.list(user.id, { refreshFromServer: true });
    setIsUsingCachedData(false);
  }, [user?.id]);

  const loadParents = useCallback(async () => {
    if (!user?.id) {
      setParentsLoading(false);
      return;
    }

    setParentsLoading(true);
    setParentsError(undefined);

    try {
      await loadParentsFromLocal();
      if (!isNetworkInitialized || isOnline) {
        await refreshParentsFromServer();
      }
    } catch (error) {
      setParentsError(extractApiErrorMessage(error));
      setIsUsingCachedData(true);
    } finally {
      setParentsLoading(false);
    }
  }, [
    isNetworkInitialized,
    isOnline,
    loadParentsFromLocal,
    refreshParentsFromServer,
    user?.id,
  ]);

  useEffect(() => {
    loadParents();
  }, [loadParents]);

  useEffect(() => {
    if (!selectedFemaleId) {
      setHistoryRecords([]);
      return;
    }
    if (isNetworkInitialized && !isOnline) return;

    let isMounted = true;
    const loadHistory = async () => {
      setHistoryLoading(true);
      try {
        const history = await featureContainer.breedings.getHistory(
          selectedFemaleId,
          user?.id,
        );
        if (isMounted) {
          setHistoryRecords(history);
        }
      } catch {
        if (isMounted) {
          setHistoryRecords([]);
        }
      } finally {
        if (isMounted) {
          setHistoryLoading(false);
        }
      }
    };

    loadHistory();
    return () => {
      isMounted = false;
    };
  }, [isNetworkInitialized, isOnline, selectedFemaleId, user?.id]);

  const selectedMale = useMemo(
    () => males.find(item => item.id === selectedMaleId) ?? null,
    [males, selectedMaleId],
  );
  const selectedFemale = useMemo(
    () => females.find(item => item.id === selectedFemaleId) ?? null,
    [females, selectedFemaleId],
  );
  const maleSelectorOptions = useMemo<ParentOption[]>(
    () =>
      males.map(item => ({
        id: item.id,
        code: item.crotal,
        name: item.speciesName ?? item.species,
        sex: 'male',
      })),
    [males],
  );
  const femaleSelectorOptions = useMemo<ParentOption[]>(
    () =>
      females.map(item => ({
        id: item.id,
        code: item.crotal,
        name: item.speciesName ?? item.species,
        sex: 'female',
      })),
    [females],
  );

  const calculate = async () => {
    if (!selectedMale || !selectedFemale) {
      Toast.show({
        type: 'info',
        text1: t('breedingMatchScreen.missingDataTitle'),
        text2: t('breedingMatchScreen.missingDataMessage'),
      });
      return;
    }

    if (isNetworkInitialized && !isOnline) {
      Toast.show({
        type: 'warning',
        text1: t('offline.banner.offlineTitle'),
        text2: t('breedingMatchScreen.errorMessage'),
      });
      return;
    }

    setLoading(true);
    try {
      const result = await featureContainer.breedings.calculateMatch({
        maleId: selectedMale.id,
        femaleId: selectedFemale.id,
      });

      navigation.navigate('MatchRiskReport', {
        male: {
          id: selectedMale.id,
          crotal: selectedMale.crotal,
        },
        female: {
          id: selectedFemale.id,
          crotal: selectedFemale.crotal,
        },
        match: result,
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('breedingMatchScreen.errorTitle'),
        text2: extractApiErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  };

  const inspectBreeding = async (breedingId: string) => {
    if (isNetworkInitialized && !isOnline) return;
    const detail = await featureContainer.breedings.getByIdFromApi(breedingId);
    if (!detail) return;
    Toast.show({
      type: 'info',
      text1: t('breedingMatchScreen.historyDetailTitle'),
      text2: detail.notes || t('breedingMatchScreen.historyDetailFallback'),
    });
  };

  const updateBreedingHistory = async (record: Breeding) => {
    if (!user?.id) return;
    const updated = await featureContainer.breedings.updateBreeding(record.id, {
      notes: record.notes
        ? `${record.notes} • ${t('breedingMatchScreen.updatedTag')}`
        : t('breedingMatchScreen.updatedTag'),
    });
    if (!updated) return;
    await featureContainer.breedings.list(user.id, { refreshFromServer: true });
    if (selectedFemaleId) {
      const history = await featureContainer.breedings.getHistory(
        selectedFemaleId,
        user?.id,
      );
      setHistoryRecords(history);
    }
  };

  const deleteBreedingHistory = (breedingId: string) => {
    if (!user?.id) return;
    Alert.alert(
      t('breedingMatchScreen.deleteTitle'),
      t('breedingMatchScreen.deleteMessage'),
      [
        { text: t('parentSelector.close'), style: 'cancel' },
        {
          text: t('breedingMatchScreen.deleteAction'),
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            const deleted = await featureContainer.breedings.deleteBreeding(breedingId);
            if (!deleted) return;
            await featureContainer.breedings.list(user.id, { refreshFromServer: true });
            if (selectedFemaleId) {
              const history = await featureContainer.breedings.getHistory(
                selectedFemaleId,
                user?.id,
              );
              setHistoryRecords(history);
            }
          },
        },
      ],
    );
  };

  const renderParentSection = () => {
    if (parentsLoading) {
      return (
        <View style={styles.feedbackCard}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.feedbackText}>{t('offline.banner.cacheDescription')}</Text>
        </View>
      );
    }

    if (parentsError) {
      return (
        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackText}>{parentsError}</Text>
          <Pressable style={styles.retryButton} onPress={loadParents}>
            <Text style={styles.retryButtonText}>{t('retry')}</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <>
        <View style={styles.parentCard}>
          <BaseParentSelectorInput
            label={t('breedingMatchScreen.sireTitle')}
            value={selectedMaleId}
            onChangeText={setSelectedMaleId}
            options={maleSelectorOptions}
            modalTitle={t('breedingMatchScreen.sireTitle')}
            searchPlaceholder={t('registerAnimal.parentSearchPlaceholder')}
          />
          {males.length === 0 ? (
            <Text style={styles.emptyHint}>{t('herd.noAnimalsText')}</Text>
          ) : null}
        </View>

        <View style={styles.parentCard}>
          <BaseParentSelectorInput
            label={t('breedingMatchScreen.damTitle')}
            value={selectedFemaleId}
            onChangeText={setSelectedFemaleId}
            options={femaleSelectorOptions}
            modalTitle={t('breedingMatchScreen.damTitle')}
            searchPlaceholder={t('registerAnimal.parentSearchPlaceholder')}
          />
          {females.length === 0 ? (
            <Text style={styles.emptyHint}>{t('herd.noAnimalsText')}</Text>
          ) : null}
        </View>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={navigation.goBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel={t('back')}
          >
            <AppIcon name="arrowLeft" size="sm" mColor={theme.colors.text} />
          </Pressable>
          <Text style={styles.title}>{t('breedingMatchScreen.title')}</Text>
        </View>

        <SyncStatusBanner showCacheHint={isUsingCachedData} />

        {renderParentSection()}

        <View style={styles.parentCard}>
          <Text style={styles.parentTitle}>{t('breedingMatchScreen.historyTitle')}</Text>
          {historyLoading ? (
            <View style={styles.historyFeedback}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={styles.feedbackText}>
                {t('breedingMatchScreen.historyLoading')}
              </Text>
            </View>
          ) : historyRecords.length === 0 ? (
            <Text style={styles.emptyHint}>{t('breedingMatchScreen.historyEmpty')}</Text>
          ) : (
            <View style={styles.historyList}>
              {historyRecords.slice(0, 3).map(record => (
                <Pressable
                  key={record.id}
                  onPress={() => inspectBreeding(record.id)}
                  style={styles.historyItem}
                >
                  <Text style={styles.historyItemTitle}>
                    COI {(record.projectedCOI * 100).toFixed(2)}%
                  </Text>
                  <Text style={styles.historyItemText}>
                    {record.notes || t('breedingMatchScreen.historyDetailFallback')}
                  </Text>
                  <View style={styles.historyActions}>
                    <Pressable
                      style={styles.historyActionButton}
                      onPress={() => updateBreedingHistory(record)}
                    >
                      <Text style={styles.historyActionText}>
                        {t('breedingMatchScreen.updateAction')}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.historyActionButton, styles.historyActionDanger]}
                      onPress={() => deleteBreedingHistory(record.id)}
                    >
                      <Text
                        style={[
                          styles.historyActionText,
                          styles.historyActionDangerText,
                        ]}
                      >
                        {t('breedingMatchScreen.deleteAction')}
                      </Text>
                    </Pressable>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.noticeCard}>
          <Text style={styles.noticeText}>{t('breedingMatchScreen.notice')}</Text>
        </View>

        <Pressable
          style={[styles.calculateButton, loading && styles.calculateButtonDisabled]}
          onPress={calculate}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={t('breedingMatchScreen.calculate')}
        >
          <AppIcon name="percent" size="sm" mColor={theme.colors.onPrimary} />
          <Text style={styles.calculateButtonText}>
            {loading
              ? t('breedingMatchScreen.calculating')
              : t('breedingMatchScreen.calculate')}
          </Text>
        </Pressable>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  backButton: {
    width: theme.spacing.xxl,
    height: theme.spacing.xxl,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
  },
  parentCard: {
    borderRadius: theme.borderRadius.xl,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  parentTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    textTransform: 'uppercase',
  },
  noticeCard: {
    borderRadius: theme.borderRadius.lg,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    backgroundColor: theme.colors.surfaceVariant,
    padding: theme.spacing.md,
  },
  noticeText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.sm,
    lineHeight: theme.typography.fontSize.lg + theme.spacing.xs,
    fontWeight: theme.typography.fontWeight.medium,
  },
  calculateButton: {
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.xs,
    minHeight: theme.spacing.xxl,
  },
  calculateButtonDisabled: {
    opacity: 0.7,
  },
  calculateButtonText: {
    color: theme.colors.onPrimary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    textTransform: 'uppercase',
  },
  feedbackCard: {
    borderRadius: theme.borderRadius.lg,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceVariant,
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
  historyFeedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  historyList: {
    gap: theme.spacing.xs,
  },
  historyItem: {
    borderRadius: theme.borderRadius.md,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceVariant,
    padding: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  historyItemTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
  },
  historyItemText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
  },
  historyActions: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  historyActionButton: {
    flex: 1,
    minHeight: theme.spacing.xl + theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyActionText: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  historyActionDanger: {
    borderColor: theme.colors.errorSoftBorder,
    backgroundColor: theme.colors.errorSoft,
  },
  historyActionDangerText: {
    color: theme.colors.errorDark,
  },
  retryButton: {
    minHeight: theme.spacing.xxl,
    minWidth: theme.spacing.xxxl + theme.spacing.xxl,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    color: theme.colors.onPrimary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    textTransform: 'uppercase',
  },
  emptyHint: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
}));

export default BreedingMatchScreen;
