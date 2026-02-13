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
  HealthRecord,
  HealthType,
} from '@/features/health/interfaces/health.types';
import { toReadableDate } from '@/features/shared/utils/date';
import AppIcon from '@/presentation/components/appIcon/AppIcon';
import SyncStatusBanner from '@/presentation/components/SyncStatusBanner';
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

type HealthFilter = 'ALL' | HealthType;

interface UpcomingTask {
  id: string;
  animalId: string;
  animalCrotal: string;
  type: HealthType;
  dueDate: string;
  daysUntilDue: number;
  notes: string | null;
}

const HealthRecordsScreen = () => {
  const { theme } = useUnistyles();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useAuthStore(state => state.user);
  const isOnline = useNetworkStore(state => state.isOnline);
  const isNetworkInitialized = useNetworkStore(state => state.isInitialized);

  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<UpcomingTask[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingUpcoming, setIsLoadingUpcoming] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [isUsingCachedData, setIsUsingCachedData] = useState(true);
  const [filter, setFilter] = useState<HealthFilter>('ALL');

  const animalById = useMemo(
    () =>
      animals.reduce<Record<string, Animal>>((accumulator, animal) => {
        accumulator[animal.id] = animal;
        return accumulator;
      }, {}),
    [animals],
  );

  const filteredRecords = useMemo(
    () =>
      records.filter(record => (filter === 'ALL' ? true : record.type === filter)),
    [filter, records],
  );

  const pendingCount = useMemo(
    () => records.filter(record => !record.completed).length,
    [records],
  );

  const loadLocalData = useCallback(async () => {
    if (!user?.id) return;
    const [localRecords, localAnimals] = await Promise.all([
      featureContainer.health.list(user.id),
      featureContainer.animals.listInventory(user.id),
    ]);
    setRecords(localRecords);
    setAnimals(localAnimals);
    setIsUsingCachedData(true);
  }, [user?.id]);

  const refreshFromServer = useCallback(async () => {
    if (!user?.id) return;
    const [remoteRecords, remoteAnimals] = await Promise.all([
      featureContainer.health.list(user.id, true),
      featureContainer.animals.listInventory(user.id, undefined, {
        refreshFromServer: true,
      }),
    ]);
    setRecords(remoteRecords);
    setAnimals(remoteAnimals);
    setIsUsingCachedData(false);
  }, [user?.id]);

  const loadUpcoming = useCallback(async () => {
    if (!user?.id) return;
    if (isNetworkInitialized && !isOnline) {
      setUpcomingTasks([]);
      return;
    }

    setIsLoadingUpcoming(true);
    try {
      const tasks = await featureContainer.health.getUpcoming(user.id, 30);
      setUpcomingTasks(tasks);
    } catch {
      setUpcomingTasks([]);
    } finally {
      setIsLoadingUpcoming(false);
    }
  }, [isNetworkInitialized, isOnline, user?.id]);

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
        await Promise.all([refreshFromServer(), loadUpcoming()]);
      } else {
        setUpcomingTasks([]);
      }
    } catch (loadError) {
      setError(extractApiErrorMessage(loadError));
      setIsUsingCachedData(true);
    } finally {
      setIsInitialLoading(false);
    }
  }, [
    isNetworkInitialized,
    isOnline,
    loadLocalData,
    loadUpcoming,
    refreshFromServer,
    user?.id,
  ]);

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

  const onRefresh = async () => {
    if (!user?.id) return;

    setIsRefreshing(true);
    setError(undefined);
    try {
      if (!isNetworkInitialized || isOnline) {
        await featureContainer.sync.syncNow(user.id);
        await Promise.all([refreshFromServer(), loadUpcoming()]);
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
    const remoteRecord = await featureContainer.health.getByIdFromApi(recordId);
    if (!remoteRecord) return;

    Toast.show({
      type: 'info',
      text1: t('health.recordDetailTitle'),
      text2: remoteRecord.notes || t('health.recordDetailFallback'),
    });
  };

  const toggleRecordCompleted = async (record: HealthRecord) => {
    if (!user?.id) return;
    const updated = await featureContainer.health.update(record.id, {
      completed: !record.completed,
    });
    if (!updated) return;

    await loadLocalData();
    featureContainer.sync.syncNow(user.id).catch(() => {
      // Sync feedback is handled globally.
    });
  };

  const deleteRecord = (recordId: string) => {
    if (!user?.id) return;
    Alert.alert(t('health.deleteTitle'), t('health.deleteMessage'), [
      { text: t('parentSelector.close'), style: 'cancel' },
      {
        text: t('health.deleteAction'),
        style: 'destructive',
        onPress: async () => {
          if (!user?.id) return;
          const deleted = await featureContainer.health.delete(recordId);
          if (!deleted) return;
          await loadLocalData();
          featureContainer.sync.syncNow(user.id).catch(() => {
            // Sync feedback is handled globally.
          });
        },
      },
    ]);
  };

  const renderRecord = ({ item }: { item: HealthRecord }) => (
    <Pressable style={styles.recordCard} onPress={() => inspectRecord(item.id)}>
      <View style={styles.recordHeader}>
        <View style={styles.recordTitleBlock}>
          <Text style={styles.recordType}>{t(`health.types.${item.type}`)}</Text>
          <Text style={styles.recordMeta}>
            {animalById[item.animalId]?.crotal ?? item.animalId}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            item.completed ? styles.statusCompleted : styles.statusPending,
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              item.completed ? styles.statusCompletedText : styles.statusPendingText,
            ]}
          >
            {item.completed ? t('health.completed') : t('health.pending')}
          </Text>
        </View>
      </View>

      <View style={styles.recordDatesRow}>
        <Text style={styles.recordDateText}>
          {t('health.dateLabel')}: {toReadableDate(item.date)}
        </Text>
        <Text style={styles.recordDateText}>
          {t('health.nextDueDateLabel')}:{' '}
          {item.nextDueDate ? toReadableDate(item.nextDueDate) : '-'}
        </Text>
      </View>

      {item.notes ? <Text style={styles.recordNotes}>{item.notes}</Text> : null}

      <View style={styles.recordActions}>
        <Pressable
          style={styles.recordActionButton}
          onPress={event => {
            event.stopPropagation();
            toggleRecordCompleted(item);
          }}
        >
          <Text style={styles.recordActionText}>{t('health.toggleAction')}</Text>
        </Pressable>
        <Pressable
          style={[styles.recordActionButton, styles.recordActionDanger]}
          onPress={event => {
            event.stopPropagation();
            deleteRecord(item.id);
          }}
        >
          <Text style={[styles.recordActionText, styles.recordActionDangerText]}>
            {t('health.deleteAction')}
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
          <Text style={styles.feedbackTitle}>{t('health.emptyTitle')}</Text>
          <Text style={styles.feedbackText}>{t('health.emptyDescription')}</Text>
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
                <AppIcon name="calendarBlank" size="sm" mColor={theme.colors.primary} />
              </View>
              <View style={styles.headerTextBlock}>
                <Text style={styles.title}>{t('health.title')}</Text>
                <Text style={styles.subtitle}>{t('health.subtitle')}</Text>
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
                <Text style={styles.statsLabel}>{t('health.recordsTitle')}</Text>
                <Text style={styles.statsValue}>{records.length}</Text>
                <Text style={styles.statsSubValue}>
                  {t('health.pending')}: {pendingCount} • {t('health.completed')}:{' '}
                  {records.length - pendingCount}
                </Text>
              </View>
              <Pressable
                style={styles.primaryAction}
                onPress={() => navigation.navigate('HealthRecordForm')}
              >
                <AppIcon name="plus" size="sm" mColor={theme.colors.onPrimary} />
                <Text style={styles.primaryActionText}>{t('health.newRecord')}</Text>
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
              {HEALTH_TYPE_OPTIONS.map(type => (
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
                    {t(`health.types.${type}`)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{t('health.upcomingTitle')}</Text>
              {isLoadingUpcoming ? (
                <View style={styles.upcomingFeedback}>
                  <ActivityIndicator color={theme.colors.primary} />
                  <Text style={styles.feedbackText}>{t('health.upcomingLoading')}</Text>
                </View>
              ) : upcomingTasks.length === 0 ? (
                <Text style={styles.feedbackText}>{t('health.upcomingEmpty')}</Text>
              ) : (
                <View style={styles.upcomingList}>
                  {upcomingTasks.slice(0, 4).map(task => (
                    <View key={task.id} style={styles.upcomingItem}>
                      <Text style={styles.upcomingItemTitle}>
                        {task.animalCrotal} • {t(`health.types.${task.type}`)}
                      </Text>
                      <Text style={styles.upcomingItemText}>
                        {t('health.upcomingDue', {
                          date: toReadableDate(task.dueDate),
                          days: task.daysUntilDue,
                        })}
                      </Text>
                    </View>
                  ))}
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
  upcomingFeedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  upcomingList: {
    gap: theme.spacing.xs,
  },
  upcomingItem: {
    borderRadius: theme.borderRadius.md,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceVariant,
    padding: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  upcomingItemTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  upcomingItemText: {
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
  statusBadge: {
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
  },
  statusCompleted: {
    backgroundColor: theme.colors.successSoft,
    borderColor: theme.colors.successSoftBorder,
  },
  statusPending: {
    backgroundColor: theme.colors.warningSoft,
    borderColor: theme.colors.warningSoftBorder,
  },
  statusBadgeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    textTransform: 'uppercase',
  },
  statusCompletedText: {
    color: theme.colors.successDark,
  },
  statusPendingText: {
    color: theme.colors.warningDark,
  },
  recordDatesRow: {
    gap: theme.spacing.xs,
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

export default HealthRecordsScreen;
