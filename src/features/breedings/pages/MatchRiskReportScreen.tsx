import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/presentation/navigation/types';
import featureContainer from '@/features/container';
import { useAuthStore } from '@/store/useAuthStore';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import type { Theme } from '@/infrastructure/theme/themes';
import SyncStatusBanner from '@/presentation/components/SyncStatusBanner';
import { useNetworkStore } from '@/store/useNetworkStore';
import { extractApiErrorMessage } from '@/core/utils/apiErrorHandler';
import AppIcon from '@/presentation/components/appIcon/AppIcon';

type Props = NativeStackScreenProps<RootStackParamList, 'MatchRiskReport'>;

const getRiskStyles = (
  riskLevel: 'GREEN' | 'YELLOW' | 'RED',
  labels: { safe: string; medium: string; high: string },
  theme: Theme,
) => {
  if (riskLevel === 'GREEN') {
    return {
      label: labels.safe,
      color: theme.colors.success,
      softBackground: theme.colors.successSoft,
      ringColor: theme.colors.successLight,
    };
  }

  if (riskLevel === 'YELLOW') {
    return {
      label: labels.medium,
      color: theme.colors.warning,
      softBackground: theme.colors.warningSoft,
      ringColor: theme.colors.warningLight,
    };
  }

  return {
    label: labels.high,
    color: theme.colors.error,
    softBackground: theme.colors.errorSoft,
    ringColor: theme.colors.errorLight,
  };
};

const MatchRiskReportScreen = ({ route, navigation }: Props) => {
  const { theme } = useUnistyles();
  const { t } = useTranslation();
  const user = useAuthStore(state => state.user);
  const isOnline = useNetworkStore(state => state.isOnline);
  const isNetworkInitialized = useNetworkStore(state => state.isInitialized);
  const { male, female, match } = route.params;
  const [isSaving, setIsSaving] = useState(false);

  const coiPercent = Number((match.coi * 100).toFixed(2));
  const riskStyles = useMemo(
    () =>
      getRiskStyles(
        match.riskLevel,
        {
          safe: t('matchRiskReport.safeMatch'),
          medium: t('matchRiskReport.mediumRisk'),
          high: t('matchRiskReport.highRisk'),
        },
        theme,
      ),
    [match.riskLevel, t, theme],
  );

  const confirmBreeding = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      await featureContainer.breedings.createBreeding(user.id, {
        maleId: male.id,
        femaleId: female.id,
        projectedCOI: match.coi,
        riskLevel: match.riskLevel,
        breedingDate: new Date().toISOString(),
        notes: match.recommendation,
      });

      featureContainer.sync.syncNow(user.id).catch(() => {
        // Background sync failures are exposed through sync status banner.
      });

      Toast.show({
        type: 'success',
        text1: t('matchRiskReport.successTitle'),
        text2:
          isOnline || !isNetworkInitialized
            ? t('matchRiskReport.successMessage')
            : t('matchRiskReport.errorMessage'),
      });
      navigation.navigate('HerdDashboard');
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('matchRiskReport.errorTitle'),
        text2: extractApiErrorMessage(error),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={navigation.goBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel={t('back')}
          >
            <AppIcon name="arrowLeft" size="sm" mColor={theme.colors.text} />
          </Pressable>
          <Text style={styles.title}>{t('matchRiskReport.title')}</Text>
        </View>

        <SyncStatusBanner />

        <View style={styles.gaugeCard}>
          <View style={[styles.gaugeRing, { borderColor: riskStyles.ringColor }]}>
            <Text style={styles.gaugeValue}>{coiPercent}%</Text>
            <Text style={styles.gaugeCaption}>{t('matchRiskReport.inbreeding')}</Text>
          </View>
          <Text style={[styles.riskStatus, { color: riskStyles.color }]}>
            {riskStyles.label}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('matchRiskReport.selectedParents')}</Text>
          <Text style={styles.sectionText}>
            {t('registerAnimal.sire')}: {male.crotal}
          </Text>
          <Text style={styles.sectionText}>
            {t('registerAnimal.dam')}: {female.crotal}
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: riskStyles.softBackground }]}>
          <Text style={styles.sectionTitle}>{t('matchRiskReport.relationshipInsight')}</Text>
          <Text style={styles.sectionText}>{match.relationship}</Text>
          <Text style={styles.sectionText}>{match.recommendation}</Text>
        </View>

        <Pressable
          style={[styles.confirmButton, isSaving && styles.confirmButtonDisabled]}
          onPress={confirmBreeding}
          disabled={isSaving}
          accessibilityRole="button"
          accessibilityLabel={t('matchRiskReport.confirmBreeding')}
        >
          <Text style={styles.confirmButtonText}>
            {isSaving
              ? t('matchRiskReport.saving')
              : t('matchRiskReport.confirmBreeding')}
          </Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={t('matchRiskReport.tryDifferentSire')}
        >
          <Text style={styles.secondaryButtonText}>
            {t('matchRiskReport.tryDifferentSire')}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create(theme => ({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  header: {
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
  gaugeCard: {
    borderRadius: theme.borderRadius.xl,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  gaugeRing: {
    width: theme.spacing.xxxl + theme.spacing.xxxl + theme.spacing.xxl,
    height: theme.spacing.xxxl + theme.spacing.xxxl + theme.spacing.xxl,
    borderRadius: theme.borderRadius.full,
    borderWidth: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
  },
  gaugeValue: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.xxxl,
    fontWeight: theme.typography.fontWeight.bold,
  },
  gaugeCaption: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    textTransform: 'uppercase',
  },
  riskStatus: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    textTransform: 'uppercase',
  },
  section: {
    borderRadius: theme.borderRadius.xl,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    textTransform: 'uppercase',
  },
  sectionText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.fontSize.lg + theme.spacing.xs,
  },
  confirmButton: {
    marginTop: 'auto',
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.success,
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    minHeight: theme.spacing.xxl,
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.75,
  },
  confirmButtonText: {
    color: theme.colors.onSecondary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    textTransform: 'uppercase',
  },
  secondaryButton: {
    borderRadius: theme.borderRadius.lg,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.text,
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    minHeight: theme.spacing.xxl,
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    textTransform: 'uppercase',
  },
}));

export default MatchRiskReportScreen;
