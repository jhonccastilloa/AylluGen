import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/useAuthStore';
import { useSyncStore } from '@/store/useSyncStore';
import { useNetworkStore } from '@/store/useNetworkStore';
import featureContainer from '@/features/container';
import type { RootStackParamList } from '@/presentation/navigation/types';
import type { Animal } from '@/features/animals/interfaces/animals.types';
import AppIcon from '@/presentation/components/appIcon/AppIcon';
import SyncStatusBanner from '@/presentation/components/SyncStatusBanner';
import { extractApiErrorMessage } from '@/core/utils/apiErrorHandler';
import Toast from 'react-native-toast-message';

type SexFilter = 'ALL' | 'MALE' | 'FEMALE';

const FILTERS: SexFilter[] = ['ALL', 'MALE', 'FEMALE'];

const HerdDashboardScreen = () => {
  const { theme } = useUnistyles();
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const pendingChanges = useSyncStore(state => state.pendingChanges);
  const syncStatus = useSyncStore(state => state.status);
  const isOnline = useNetworkStore(state => state.isOnline);
  const isNetworkInitialized = useNetworkStore(state => state.isInitialized);

  const [animals, setAnimals] = useState<Animal[]>([]);
  const [search, setSearch] = useState('');
  const [sexFilter, setSexFilter] = useState<SexFilter>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | undefined>(undefined);
  const [isUsingCachedData, setIsUsingCachedData] = useState(true);

  const loadLocalAnimals = useCallback(async () => {
    if (!user?.id) return;
    const records = await featureContainer.animals.listInventory(user.id);
    setAnimals(records);
    setIsUsingCachedData(true);
  }, [user?.id]);

  const refreshFromServer = useCallback(async () => {
    if (!user?.id) return;
    const records = await featureContainer.animals.listInventory(
      user.id,
      undefined,
      { refreshFromServer: true },
    );
    setAnimals(records);
    setIsUsingCachedData(false);
  }, [user?.id]);

  useEffect(() => {
    let isMounted = true;
    if (!user?.id) {
      setAnimals([]);
      setIsInitialLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const bootstrap = async () => {
      setIsInitialLoading(true);
      setLoadError(undefined);

      try {
        await loadLocalAnimals();
      } catch (error) {
        if (isMounted) {
          setLoadError(extractApiErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsInitialLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, [loadLocalAnimals, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    if (isNetworkInitialized && !isOnline) return;

    refreshFromServer().catch(error => {
      setLoadError(extractApiErrorMessage(error));
      setIsUsingCachedData(true);
    });
  }, [isNetworkInitialized, isOnline, refreshFromServer, user?.id]);

  const filteredAnimals = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return animals.filter(animal => {
      if (animal.deletedAt) return false;
      if (sexFilter !== 'ALL' && animal.sex !== sexFilter) return false;
      if (
        normalizedSearch &&
        !animal.crotal.toLowerCase().includes(normalizedSearch)
      ) {
        return false;
      }
      return true;
    });
  }, [animals, search, sexFilter]);

  const onRefresh = async () => {
    if (!user?.id) return;

    setIsRefreshing(true);
    setLoadError(undefined);

    try {
      if (isOnline || !isNetworkInitialized) {
        await featureContainer.sync.syncNow(user.id);
        await refreshFromServer();
      } else {
        await loadLocalAnimals();
      }
    } catch (error) {
      setLoadError(extractApiErrorMessage(error));
    } finally {
      setIsRefreshing(false);
    }
  };

  const inspectAnimal = async (animalId: string) => {
    if (isNetworkInitialized && !isOnline) {
      Toast.show({
        type: 'warning',
        text1: t('offline.banner.offlineTitle'),
        text2: t('herd.pedigreeOffline'),
      });
      return;
    }

    try {
      const [animalDetail, pedigree] = await Promise.all([
        featureContainer.animals.getByIdFromApi(animalId),
        featureContainer.animals.getPedigree(animalId),
      ]);

      if (!animalDetail || !pedigree) {
        Toast.show({
          type: 'info',
          text1: t('herd.pedigreeTitle'),
          text2: t('herd.pedigreeUnavailable'),
        });
        return;
      }

      Toast.show({
        type: 'info',
        text1: t('herd.pedigreeTitle'),
        text2: `${animalDetail.crotal} • ${pedigree.speciesName ?? pedigree.species} • ${pedigree.sex}`,
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('herd.pedigreeTitle'),
        text2: extractApiErrorMessage(error),
      });
    }
  };

  const toggleFounder = async (animal: Animal) => {
    if (!user?.id) return;
    const updated = await featureContainer.animals.updateAnimal(animal.id, {
      isFounder: !animal.isFounder,
    });
    if (!updated) return;

    await loadLocalAnimals();
    featureContainer.sync.syncNow(user.id).catch(() => {
      // Sync feedback is handled globally.
    });
    Toast.show({
      type: 'success',
      text1: t('herd.updateTitle'),
      text2: t('herd.updateFounderMessage'),
    });
  };

  const deleteAnimal = (animalId: string) => {
    if (!user?.id) return;
    Alert.alert(t('herd.deleteTitle'), t('herd.deleteMessage'), [
      { text: t('parentSelector.close'), style: 'cancel' },
      {
        text: t('herd.deleteAction'),
        style: 'destructive',
        onPress: async () => {
          if (!user?.id) return;
          const deleted = await featureContainer.animals.deleteAnimal(animalId);
          if (!deleted) return;
          await loadLocalAnimals();
          featureContainer.sync.syncNow(user.id).catch(() => {
            // Sync feedback is handled globally.
          });
          Toast.show({
            type: 'success',
            text1: t('herd.deleteTitle'),
            text2: t('herd.deleteSuccess'),
          });
        },
      },
    ]);
  };

  const renderAnimal = ({ item }: { item: Animal }) => (
    <Pressable style={styles.animalCard} onPress={() => inspectAnimal(item.id)}>
      <View style={styles.animalHeaderRow}>
        <View style={styles.animalTagIcon}>
          <AppIcon
            name={item.sex === 'MALE' ? 'handArrowUp' : 'handArrowDown'}
            size="sm"
            color={item.sex === 'MALE' ? 'success' : 'secondary'}
          />
        </View>

        <View style={styles.animalMainInfo}>
          <Text style={styles.animalTag}>TAG {item.crotal}</Text>
          <Text style={styles.animalMeta}>
            {item.speciesName ?? item.species} •{' '}
            {item.sex === 'MALE' ? t('herd.male') : t('herd.female')}
          </Text>
        </View>

        {item.isFounder && (
          <View style={styles.founderBadge}>
            <Text style={styles.founderBadgeText}>{t('herd.founder')}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardActions}>
        <Pressable
          style={styles.cardActionButton}
          onPress={event => {
            event.stopPropagation();
            toggleFounder(item);
          }}
        >
          <Text style={styles.cardActionText}>{t('herd.toggleFounder')}</Text>
        </Pressable>
        <Pressable
          style={[styles.cardActionButton, styles.cardActionDanger]}
          onPress={event => {
            event.stopPropagation();
            deleteAnimal(item.id);
          }}
        >
          <Text style={[styles.cardActionText, styles.cardActionDangerText]}>
            {t('herd.deleteAction')}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );

  const syncLabel =
    syncStatus === 'syncing'
      ? t('herd.syncing')
      : syncStatus === 'offline'
        ? t('offline.banner.offlineTitle')
        : t('herd.localReady');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.title}>{t('herd.title')}</Text>
            <Text style={styles.subtitle}>{t('herd.subtitle')}</Text>
          </View>
          <Pressable
            onPress={logout}
            style={styles.logoutButton}
            accessibilityRole="button"
            accessibilityLabel={t('logout')}
          >
            <AppIcon name="signOut" size="sm" mColor={theme.colors.text} />
          </Pressable>
        </View>

        <SyncStatusBanner showCacheHint={isUsingCachedData} />

        <View style={styles.statsCard}>
          <Text style={styles.statsLabel}>{t('herd.totalCount')}</Text>
          <Text style={styles.statsValue}>{filteredAnimals.length}</Text>
          <Text style={styles.statsSubValue}>
            {t('herd.pendingChanges', { count: pendingChanges })} • {syncLabel}
          </Text>
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            style={styles.primaryAction}
            onPress={() => navigation.navigate('RegisterAnimal')}
          >
            <AppIcon name="plus" size="sm" mColor={theme.colors.onPrimary} />
            <Text style={styles.primaryActionText}>{t('herd.register')}</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryAction}
            onPress={() => navigation.navigate('BreedingMatch')}
          >
            <AppIcon name="percent" size="sm" color="primary" />
            <Text style={styles.secondaryActionText}>
              {t('herd.breedingMatch')}
            </Text>
          </Pressable>
        </View>

        <View style={styles.searchContainer}>
          <AppIcon
            name="search"
            size="sm"
            mColor={theme.colors.textSecondary}
          />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('herd.searchPlaceholder')}
            placeholderTextColor={theme.colors.textSecondary}
            style={styles.searchInput}
          />
        </View>

        <View style={styles.filtersRow}>
          {FILTERS.map(filter => (
            <Pressable
              key={filter}
              style={[
                styles.filterChip,
                sexFilter === filter && styles.filterChipSelected,
              ]}
              onPress={() => setSexFilter(filter)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  sexFilter === filter && styles.filterChipTextSelected,
                ]}
              >
                {filter === 'ALL'
                  ? t('herd.filterAll')
                  : filter === 'MALE'
                    ? t('herd.filterMale')
                    : t('herd.filterFemale')}
              </Text>
            </Pressable>
          ))}
        </View>

        {isInitialLoading ? (
          <View style={styles.feedbackCard}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.feedbackTitle}>
              {t('offline.banner.cacheTitle')}
            </Text>
            <Text style={styles.feedbackDescription}>
              {t('offline.banner.cacheDescription')}
            </Text>
          </View>
        ) : loadError && filteredAnimals.length === 0 ? (
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackTitle}>
              {t('offline.banner.syncErrorTitle')}
            </Text>
            <Text style={styles.feedbackDescription}>{loadError}</Text>
            <Pressable style={styles.retryButton} onPress={onRefresh}>
              <Text style={styles.retryButtonText}>{t('retry')}</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={filteredAnimals}
            keyExtractor={item => item.id}
            renderItem={renderAnimal}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>
                  {t('herd.noAnimalsTitle')}
                </Text>
                <Text style={styles.emptyText}>{t('herd.noAnimalsText')}</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default HerdDashboardScreen;

const styles = StyleSheet.create(theme => ({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  headerTitleBlock: {
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
  logoutButton: {
    width: theme.spacing.xxl,
    height: theme.spacing.xxl,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  statsCard: {
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
    ...theme.shadows.md,
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
  actionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  primaryAction: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.xs,
    minHeight: theme.spacing.xxl,
  },
  primaryActionText: {
    color: theme.colors.onPrimary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    textTransform: 'uppercase',
  },
  secondaryAction: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.xs,
    minHeight: theme.spacing.xxl,
  },
  secondaryActionText: {
    color: theme.colors.primary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    textTransform: 'uppercase',
  },
  searchContainer: {
    borderRadius: theme.borderRadius.lg,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.xs,
    minHeight: theme.spacing.xxl,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    paddingVertical: theme.spacing.sm,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  filterChip: {
    minWidth: theme.spacing.xxxl,
    borderRadius: theme.borderRadius.full,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
  },
  filterChipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  filterChipText: {
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.bold,
    fontSize: theme.typography.fontSize.xs,
  },
  filterChipTextSelected: {
    color: theme.colors.onPrimary,
  },
  listContent: {
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  animalCard: {
    borderRadius: theme.borderRadius.xl,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  animalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  animalTagIcon: {
    width: theme.spacing.xl + theme.spacing.sm,
    height: theme.spacing.xl + theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  animalMainInfo: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  animalTag: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
  },
  animalMeta: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
  },
  founderBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.warningLight,
  },
  founderBadgeText: {
    color: theme.colors.warningDark,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    textTransform: 'uppercase',
  },
  cardActions: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  cardActionButton: {
    flex: 1,
    minHeight: theme.spacing.xl + theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  cardActionText: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  cardActionDanger: {
    borderColor: theme.colors.errorSoftBorder,
    backgroundColor: theme.colors.errorSoft,
  },
  cardActionDangerText: {
    color: theme.colors.errorDark,
  },
  emptyState: {
    marginTop: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  emptyText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  feedbackCard: {
    borderRadius: theme.borderRadius.xl,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  feedbackTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    textAlign: 'center',
  },
  feedbackDescription: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: theme.spacing.sm,
    minHeight: theme.spacing.xxl,
    minWidth: theme.spacing.xxxl + theme.spacing.xxl,
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
