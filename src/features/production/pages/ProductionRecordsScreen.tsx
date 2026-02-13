import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import featureContainer from '@/features/container';
import type { Animal } from '@/features/animals/interfaces/animals.types';
import type {
  ProductionRecord,
  ProductionSummary,
  ProductionType,
} from '@/features/production/interfaces/production.types';
import { toReadableDate } from '@/features/shared/utils/date';
import AppIcon from '@/presentation/components/appIcon/AppIcon';
import BaseParentSelectorInput, {
  type ParentOption,
} from '@/presentation/components/parent-selector-input/BaseParentSelectorInput';
import SyncStatusBanner from '@/presentation/components/SyncStatusBanner';
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

type ProductionFilter = 'ALL' | ProductionType;

const ProductionRecordsScreen = () => {
  const { theme } = useUnistyles();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useAuthStore(state => state.user);
  const isOnline = useNetworkStore(state => state.isOnline);
  const isNetworkInitialized = useNetworkStore(state => state.isInitialized);

  const [records, setRecords] = useState<ProductionRecord[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [isUsingCachedData, setIsUsingCachedData] = useState(true);
  const [filter, setFilter] = useState<ProductionFilter>('ALL');

  const [selectedAnimalId, setSelectedAnimalId] = useState('');
  const [selectedInsightType, setSelectedInsightType] =
    useState<ProductionType>('WEIGHT');
  const [summary, setSummary] = useState<ProductionSummary | null>(null);
  const [recentRemote, setRecentRemote] = useState<ProductionRecord[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  const animalById = useMemo(
    () =>
      animals.reduce<Record<string, Animal>>((accumulator, animal) => {
        accumulator[animal.id] = animal;
        return accumulator;
      }, {}),
    [animals],
  );

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

  const filteredRecords = useMemo(
    () => records.filter(record => (filter === 'ALL' ? true : record.type === filter)),
    [filter, records],
  );

  const loadLocalData = useCallback(async () => {
    if (!user?.id) return;
    const [localRecords, localAnimals] = await Promise.all([
      featureContainer.production.list(user.id),
      featureContainer.animals.listInventory(user.id),
    ]);
    setRecords(localRecords);
    setAnimals(localAnimals);
    setIsUsingCachedData(true);
  }, [user?.id]);

  const refreshFromServer = useCallback(async () => {
    if (!user?.id) return;
    const [remoteRecords, remoteAnimals] = await Promise.all([
      featureContainer.production.list(user.id, true),
      featureContainer.animals.listInventory(user.id, undefined, {
        refreshFromServer: true,
      }),
    ]);
    setRecords(remoteRecords);
    setAnimals(remoteAnimals);
    setIsUsingCachedData(false);
  }, [user?.id]);

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setIsInitialLoading(false);
      return;
    }

    setError(undefined);
    setIsInitialLoading(true);
    try {
      await loadLocalData();
      if (!isNetworkInitialized || isOnline) {
        await refreshFromServer();
      }
    } catch (loadError) {
      setError(extractApiErrorMessage(loadError));
      setIsUsingCachedData(true);
    } finally {
      setIsInitialLoading(false);
    }
  }, [isNetworkInitialized, isOnline, loadLocalData, refreshFromServer, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadLocalData().catch(() => {
        // Refresh-only background call.
      });
    }, [loadLocalData]),
  );

  useEffect(() => {
    if (!selectedAnimalId && animals.length > 0) {
      setSelectedAnimalId(animals[0].id);
    }
  }, [animals, selectedAnimalId]);

  const loadInsights = useCallback(async () => {
    if (!selectedAnimalId) {
      setSummary(null);
      setRecentRemote([]);
      return;
    }
    if (isNetworkInitialized && !isOnline) {
      setSummary(null);
      setRecentRemote([]);
      return;
    }

    setIsLoadingInsights(true);
    try {
      const [remoteSummary, remoteRecent] = await Promise.all([
        featureContainer.production.getSummary(selectedAnimalId, selectedInsightType),
        featureContainer.production.getRecent(selectedAnimalId, 5),
      ]);
      setSummary(remoteSummary);
      setRecentRemote(remoteRecent);
    } catch {
      setSummary(null);
      setRecentRemote([]);
    } finally {
      setIsLoadingInsights(false);
    }
  }, [isNetworkInitialized, isOnline, selectedAnimalId, selectedInsightType]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  const onRefresh = async () => {
    if (!user?.id) return;

    setIsRefreshing(true);
    setError(undefined);
    try {
      if (!isNetworkInitialized || isOnline) {
        await featureContainer.sync.syncNow(user.id);
        await Promise.all([refreshFromServer(), loadInsights()]);
      } else {
        await loadLocalData();
      }
    } catch (refreshError) {
      setError(extractApiErrorMessage(refreshError));
      setIsUsingCachedData(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  const inspectRecord = async (recordId: string) => {
    if (isNetworkInitialized && !isOnline) return;
    const remoteRecord = await featureContainer.production.getByIdFromApi(recordId);
    if (!remoteRecord) return;

    Toast.show({
      type: 'info',
      text1: t('production.recordDetailTitle'),
      text2: remoteRecord.notes || t('production.recordDetailFallback'),
    });
  };

  const updateRecord = async (record: ProductionRecord) => {
    if (!user?.id) return;
    const updated = await featureContainer.production.update(record.id, {
      notes: record.notes
        ? `${record.notes} • ${t('production.updatedTag')}`
        : t('production.updatedTag'),
    });
    if (!updated) return;

    await loadLocalData();
    featureContainer.sync.syncNow(user.id).catch(() => {
      // Sync feedback is handled globally.
    });
  };

  const deleteRecord = (recordId: string) => {
    if (!user?.id) return;
    Alert.alert(t('production.deleteTitle'), t('production.deleteMessage'), [
      { text: t('parentSelector.close'), style: 'cancel' },
      {
        text: t('production.deleteAction'),
        style: 'destructive',
        onPress: async () => {
          if (!user?.id) return;
          const deleted = await featureContainer.production.delete(recordId);
          if (!deleted) return;
          await loadLocalData();
          featureContainer.sync.syncNow(user.id).catch(() => {
            // Sync feedback is handled globally.
          });
        },
      },
    ]);
  };

  const renderRecord = ({ item }: { item: ProductionRecord }) => (
    <Pressable style={styles.recordCard} onPress={() => inspectRecord(item.id)}>
      <View style={styles.recordHeader}>
        <View style={styles.recordTitleBlock}>
          <Text style={styles.recordType}>{t(`production.types.${item.type}`)}</Text>
          <Text style={styles.recordMeta}>
            {animalById[item.animalId]?.crotal ?? item.animalId}
          </Text>
        </View>
        <View style={styles.valueBadge}>
          <Text style={styles.valueBadgeText}>
            {item.value} {item.unit}
          </Text>
        </View>
      </View>

      <Text style={styles.recordDateText}>
        {t('production.dateLabel')}: {toReadableDate(item.date)}
      </Text>
      <Text style={styles.recordDateText}>
        {t('production.qualityLabel')}:{' '}
        {item.qualityScore !== null ? `${item.qualityScore}%` : '-'}
      </Text>

      {item.notes ? <Text style={styles.recordNotes}>{item.notes}</Text> : null}

      <View style={styles.recordActions}>
        <Pressable
          style={styles.recordActionButton}
          onPress={event => {
            event.stopPropagation();
            updateRecord(item);
          }}
        >
          <Text style={styles.recordActionText}>{t('production.updateAction')}</Text>
        </Pressable>
        <Pressable
          style={[styles.recordActionButton, styles.recordActionDanger]}
          onPress={event => {
            event.stopPropagation();
            deleteRecord(item.id);
          }}
        >
          <Text style={[styles.recordActionText, styles.recordActionDangerText]}>
            {t('production.deleteAction')}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );

  const renderEmptyState = () => {
    if (isInitialLoading) {
      return (
        <View style={styles.feedbackCard}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.feedbackText}>{t('offline.banner.cacheDescription')}</Text>
        </View>
      );
    }

    if (records.length === 0) {
      return (
        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackTitle}>{t('production.emptyTitle')}</Text>
          <Text style={styles.feedbackText}>{t('production.emptyDescription')}</Text>
        </View>
      );
    }

    return (
      <View style={styles.feedbackCard}>
        <Text style={styles.feedbackTitle}>{t('noResults')}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={filteredRecords}
        keyExtractor={item => item.id}
        renderItem={renderRecord}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <AppIcon name="currencyDolar" size="sm" mColor={theme.colors.primary} />
              </View>
              <View style={styles.headerTextBlock}>
                <Text style={styles.title}>{t('production.title')}</Text>
                <Text style={styles.subtitle}>{t('production.subtitle')}</Text>
              </View>
            </View>

            <SyncStatusBanner showCacheHint={isUsingCachedData} />

            {error ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable style={styles.retryButton} onPress={loadData}>
                  <Text style={styles.retryButtonText}>{t('retry')}</Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.statsCard}>
              <View style={styles.statsTextBlock}>
                <Text style={styles.statsLabel}>{t('production.recordsTitle')}</Text>
                <Text style={styles.statsValue}>{records.length}</Text>
                <Text style={styles.statsSubValue}>
                  {t('production.typeLabel')}: {t(`production.types.${selectedInsightType}`)}
                </Text>
              </View>
              <Pressable
                style={styles.primaryAction}
                onPress={() => navigation.navigate('ProductionRecordForm')}
              >
                <AppIcon name="plus" size="sm" mColor={theme.colors.onPrimary} />
                <Text style={styles.primaryActionText}>{t('production.newRecord')}</Text>
              </Pressable>
            </View>

            <View style={styles.filterRow}>
              <Pressable
                style={[styles.filterChip, filter === 'ALL' && styles.filterChipSelected]}
                onPress={() => setFilter('ALL')}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filter === 'ALL' && styles.filterChipTextSelected,
                  ]}
                >
                  {t('herd.filterAll')}
                </Text>
              </Pressable>
              {PRODUCTION_TYPE_OPTIONS.map(type => (
                <Pressable
                  key={type}
                  style={[
                    styles.filterChip,
                    filter === type && styles.filterChipSelected,
                  ]}
                  onPress={() => setFilter(type)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filter === type && styles.filterChipTextSelected,
                    ]}
                  >
                    {t(`production.types.${type}`)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{t('production.insightsTitle')}</Text>

              <BaseParentSelectorInput
                label={t('production.animalLabel')}
                value={selectedAnimalId}
                onChangeText={setSelectedAnimalId}
                options={animalOptions}
              />

              <Text style={styles.formLabel}>{t('production.typeLabel')}</Text>
              <View style={styles.typeRow}>
                {PRODUCTION_TYPE_OPTIONS.map(type => (
                  <Pressable
                    key={type}
                    style={[
                      styles.typeChip,
                      selectedInsightType === type && styles.typeChipSelected,
                    ]}
                    onPress={() => setSelectedInsightType(type)}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        selectedInsightType === type && styles.typeChipTextSelected,
                      ]}
                    >
                      {t(`production.types.${type}`)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {isLoadingInsights ? (
                <View style={styles.insightsFeedback}>
                  <ActivityIndicator color={theme.colors.primary} />
                  <Text style={styles.feedbackText}>{t('production.insightsLoading')}</Text>
                </View>
              ) : !summary ? (
                <Text style={styles.feedbackText}>{t('production.insightsEmpty')}</Text>
              ) : (
                <View style={styles.insightsContent}>
                  <Text style={styles.insightsMainText}>
                    {t('production.summaryLine', {
                      average: summary.averageValue,
                      total: summary.totalRecords,
                    })}
                  </Text>
                  <Text style={styles.insightsSubText}>
                    {t('production.trendLabel')}: {summary.trend}
                  </Text>
                  <View style={styles.recentList}>
                    {recentRemote.slice(0, 3).map(record => (
                      <Text key={record.id} style={styles.recentItemText}>
                        {toReadableDate(record.date)} • {record.value} {record.unit}
                      </Text>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={renderEmptyState}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create(theme => ({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContent: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.xxl,
  },
  headerContent: {
    gap: theme.spacing.md,
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
  statsCard: {
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    ...theme.shadows.md,
  },
  statsTextBlock: {
    gap: theme.spacing.xs,
  },
  statsLabel: {
    color: theme.colors.onPrimary,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    textTransform: 'uppercase',
  },
  statsValue: {
    color: theme.colors.onPrimary,
    fontSize: theme.typography.fontSize.display,
    fontWeight: theme.typography.fontWeight.bold,
  },
  statsSubValue: {
    color: theme.colors.onPrimary,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
  },
  primaryAction: {
    minHeight: theme.spacing.xxl,
    borderRadius: theme.borderRadius.lg,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.onPrimary,
    backgroundColor: theme.colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    flexDirection: 'row',
  },
  primaryActionText: {
    color: theme.colors.onPrimary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    textTransform: 'uppercase',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  filterChip: {
    borderRadius: theme.borderRadius.full,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  filterChipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  filterChipText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
  },
  filterChipTextSelected: {
    color: theme.colors.onPrimary,
  },
  card: {
    borderRadius: theme.borderRadius.xl,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
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
  insightsFeedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  insightsContent: {
    gap: theme.spacing.xs,
  },
  insightsMainText: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  insightsSubText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
  },
  recentList: {
    marginTop: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  recentItemText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
  },
  recordCard: {
    borderRadius: theme.borderRadius.lg,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  recordTitleBlock: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  recordType: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
  },
  recordMeta: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
  },
  valueBadge: {
    borderRadius: theme.borderRadius.full,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.primaryLight,
    backgroundColor: theme.colors.infoLight,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  valueBadgeText: {
    color: theme.colors.infoDark,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
  },
  recordDateText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
  recordNotes: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.regular,
  },
  recordActions: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  recordActionButton: {
    flex: 1,
    minHeight: theme.spacing.xl + theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordActionText: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  recordActionDanger: {
    borderColor: theme.colors.errorSoftBorder,
    backgroundColor: theme.colors.errorSoft,
  },
  recordActionDangerText: {
    color: theme.colors.errorDark,
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
  feedbackTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    textAlign: 'center',
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

export default ProductionRecordsScreen;
