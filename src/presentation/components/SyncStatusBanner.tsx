import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useTranslation } from 'react-i18next';
import AppIcon from '@/presentation/components/appIcon/AppIcon';
import { useNetworkStore } from '@/store/useNetworkStore';
import { useSyncStore } from '@/store/useSyncStore';

interface SyncStatusBannerProps {
  showCacheHint?: boolean;
}

type BannerVariant = 'info' | 'warning' | 'error' | 'success';

interface BannerConfig {
  variant: BannerVariant;
  icon: 'toastInfo' | 'toastWarning' | 'toastError' | 'toastSuccess';
  title: string;
  description: string;
}

const SyncStatusBanner = ({ showCacheHint = false }: SyncStatusBannerProps) => {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const { isOnline, isInitialized } = useNetworkStore();
  const { status, pendingChanges, lastSyncAt, error } = useSyncStore();

  const banner = useMemo<BannerConfig | null>(() => {
    if (isInitialized && !isOnline) {
      return {
        variant: 'warning',
        icon: 'toastWarning',
        title: t('offline.banner.offlineTitle'),
        description:
          pendingChanges > 0
            ? t('offline.banner.offlineWithPending', { count: pendingChanges })
            : t('offline.banner.offlineDescription'),
      };
    }

    if (status === 'error' && error) {
      return {
        variant: 'error',
        icon: 'toastError',
        title: t('offline.banner.syncErrorTitle'),
        description: error,
      };
    }

    if (status === 'syncing') {
      return {
        variant: 'info',
        icon: 'toastInfo',
        title: t('offline.banner.syncingTitle'),
        description:
          pendingChanges > 0
            ? t('offline.banner.pendingChanges', { count: pendingChanges })
            : t('offline.banner.syncingDescription'),
      };
    }

    if (pendingChanges > 0) {
      return {
        variant: 'warning',
        icon: 'toastWarning',
        title: t('offline.banner.pendingTitle'),
        description: t('offline.banner.pendingChanges', { count: pendingChanges }),
      };
    }

    if (showCacheHint) {
      return {
        variant: 'success',
        icon: 'toastSuccess',
        title: t('offline.banner.cacheTitle'),
        description: t('offline.banner.cacheDescription'),
      };
    }

    return null;
  }, [error, isInitialized, isOnline, pendingChanges, showCacheHint, status, t]);

  const lastSyncLabel = useMemo(() => {
    if (!lastSyncAt) return null;
    const parsed = new Date(lastSyncAt);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleString();
  }, [lastSyncAt]);

  if (!banner) return null;

  const iconColorByVariant: Record<BannerVariant, string> = {
    info: theme.colors.infoDark,
    warning: theme.colors.warningDark,
    error: theme.colors.errorDark,
    success: theme.colors.successDark,
  };

  return (
    <View style={[styles.container, stylesByVariant[banner.variant]]}>
      <View style={styles.headerRow}>
        <AppIcon
          name={banner.icon}
          size="sm"
          mColor={iconColorByVariant[banner.variant]}
        />
        <Text style={[styles.title, stylesByText[banner.variant]]}>{banner.title}</Text>
      </View>
      <Text style={[styles.description, stylesByText[banner.variant]]}>
        {banner.description}
      </Text>
      {lastSyncLabel && (
        <Text style={[styles.caption, stylesByText[banner.variant]]}>
          {t('offline.banner.lastSync', { date: lastSyncLabel })}
        </Text>
      )}
    </View>
  );
};

const stylesByVariant = StyleSheet.create(theme => ({
  info: {
    backgroundColor: theme.colors.infoLight,
    borderColor: theme.colors.infoDark,
  },
  warning: {
    backgroundColor: theme.colors.warningSoft,
    borderColor: theme.colors.warningSoftBorder,
  },
  error: {
    backgroundColor: theme.colors.errorSoft,
    borderColor: theme.colors.errorSoftBorder,
  },
  success: {
    backgroundColor: theme.colors.successSoft,
    borderColor: theme.colors.successSoftBorder,
  },
}));

const stylesByText = StyleSheet.create(theme => ({
  info: { color: theme.colors.infoDark },
  warning: { color: theme.colors.warningDark },
  error: { color: theme.colors.errorDark },
  success: { color: theme.colors.successDark },
}));

const styles = StyleSheet.create(theme => ({
  container: {
    borderRadius: theme.borderRadius.lg,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  title: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
  },
  description: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
  caption: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.regular,
  },
}));

export default SyncStatusBanner;
