import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import { useAuthStore } from '@/store/useAuthStore';
import {
  getThemePreference,
  setThemePreference,
  type ThemePreference,
} from '@/core/theme/themePreferences';
import { supportedLanguages, type SupportedLanguage } from '@/core/i18n/i18n';
import AppIcon from '@/presentation/components/appIcon/AppIcon';
import type { IconName } from '@/presentation/components/appIcon/iconRegistry';
import FormButton from '@/presentation/components/button/FormButton';
import BaseInput from '@/presentation/components/input/BaseInput';
import featureContainer from '@/features/container';
import { useNetworkStore } from '@/store/useNetworkStore';
import { useSyncStore } from '@/store/useSyncStore';
import SyncStatusBanner from '@/presentation/components/SyncStatusBanner';
import Toast from 'react-native-toast-message';
import { extractApiErrorMessage } from '@/core/utils/apiErrorHandler';
import type { AuthUser } from '@/application/services/AuthService.types';
import type { UserProfile } from '@/features/users/interfaces/users.types';
import type { RootStackParamList } from '@/presentation/navigation/types';

const THEME_OPTIONS: ThemePreference[] = ['system', 'light', 'dark'];
const THEME_OPTION_ICONS: Record<ThemePreference, IconName> = {
  system: 'desktop',
  light: 'sun',
  dark: 'moon',
};

const getNormalizedLanguage = (language: string): SupportedLanguage => {
  const normalizedLanguage = language.split('-')[0] as SupportedLanguage;
  if (supportedLanguages.includes(normalizedLanguage)) {
    return normalizedLanguage;
  }
  return 'en';
};

const mapToAuthUser = (
  profile: UserProfile,
  previousUser?: AuthUser | null,
): AuthUser => ({
  id: profile.id,
  dni: profile.dni,
  name: previousUser?.name,
  email: previousUser?.email,
  role: previousUser?.role,
});

const SettingsScreen = () => {
  const { theme } = useUnistyles();
  const { t, i18n } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useAuthStore(state => state.user);
  const setUser = useAuthStore(state => state.setUser);
  const logout = useAuthStore(state => state.logout);
  const isLoading = useAuthStore(state => state.isLoading);
  const isOnline = useNetworkStore(state => state.isOnline);
  const isNetworkInitialized = useNetworkStore(state => state.isInitialized);
  const connectionType = useNetworkStore(state => state.connectionType);
  const syncStatus = useSyncStore(state => state.status);
  const pendingChanges = useSyncStore(state => state.pendingChanges);
  const lastSyncAt = useSyncStore(state => state.lastSyncAt);
  const syncError = useSyncStore(state => state.error);

  const [themeMode, setThemeMode] =
    useState<ThemePreference>(getThemePreference());
  const [language, setLanguage] = useState<SupportedLanguage>(() =>
    getNormalizedLanguage(i18n.resolvedLanguage ?? i18n.language),
  );
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isLanguageSheetVisible, setIsLanguageSheetVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [profileError, setProfileError] = useState<string | undefined>(
    undefined,
  );
  const canRunRemoteActions = !isNetworkInitialized || isOnline;

  useEffect(() => {
    setLanguage(getNormalizedLanguage(i18n.resolvedLanguage ?? i18n.language));
  }, [i18n.language, i18n.resolvedLanguage]);

  const loadRemoteProfile = useCallback(async () => {
    if (!user?.id || !canRunRemoteActions) return;
    setIsLoadingProfile(true);
    setProfileError(undefined);
    try {
      const previousUser = useAuthStore.getState().user;
      const me = await featureContainer.users.getMe();
      setUser(mapToAuthUser(me, previousUser));

      const byId = await featureContainer.users.getById(me.id);
      const currentUser = useAuthStore.getState().user;
      setUser(mapToAuthUser(byId, currentUser));
    } catch (error) {
      setProfileError(extractApiErrorMessage(error));
    } finally {
      setIsLoadingProfile(false);
    }
  }, [canRunRemoteActions, setUser, user?.id]);

  useEffect(() => {
    loadRemoteProfile();
  }, [loadRemoteProfile]);

  const onThemeChange = (nextTheme: ThemePreference) => {
    setThemePreference(nextTheme);
    setThemeMode(nextTheme);
  };

  const onLanguageChange = (nextLanguage: SupportedLanguage) => {
    i18n.changeLanguage(nextLanguage);
    setLanguage(nextLanguage);
  };
  const openLanguageSheet = () => setIsLanguageSheetVisible(true);
  const closeLanguageSheet = () => setIsLanguageSheetVisible(false);
  const onRequestLogout = () => {
    if (isLoading) return;
    Alert.alert(
      t('settingsScreen.logoutConfirmTitle'),
      t('settingsScreen.logoutConfirmMessage'),
      [
        { text: t('parentSelector.close'), style: 'cancel' },
        {
          text: t('logout'),
          style: 'destructive',
          onPress: () => {
            logout();
          },
        },
      ],
    );
  };

  const onUpdatePassword = async () => {
    if (!user?.id) return;
    if (newPassword.trim().length < 8) {
      Toast.show({
        type: 'info',
        text1: t('settingsScreen.passwordTooShortTitle'),
        text2: t('settingsScreen.passwordTooShortMessage'),
      });
      return;
    }

    if (isNetworkInitialized && !isOnline) {
      Toast.show({
        type: 'warning',
        text1: t('offline.banner.offlineTitle'),
        text2: t('settingsScreen.offlineRestrictedMessage'),
      });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await featureContainer.users.updatePassword(user.id, newPassword.trim());
      setNewPassword('');
      Toast.show({
        type: 'success',
        text1: t('settingsScreen.passwordUpdatedTitle'),
        text2: t('settingsScreen.passwordUpdatedMessage'),
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('settingsScreen.passwordUpdatedErrorTitle'),
        text2: extractApiErrorMessage(error),
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const profileRows = useMemo(
    () => [
      { key: 'dni', label: t('auth.dniLabel'), value: user?.dni ?? '-' },
      // { key: 'name', label: t('name'), value: user?.name ?? '-' },
      // { key: 'email', label: t('email'), value: user?.email ?? '-' },
      // { key: 'role', label: t('role'), value: user?.role ?? '-' },
    ],
    [t, user?.dni, user?.email, user?.name, user?.role],
  );
  const resolvedSyncStatusLabel = useMemo(() => {
    if (syncStatus === 'syncing') return t('settingsScreen.syncStateSyncing');
    if (syncStatus === 'error') return t('settingsScreen.syncStateError');
    if (syncStatus === 'offline') return t('settingsScreen.syncStateOffline');
    return t('settingsScreen.syncStateIdle');
  }, [syncStatus, t]);
  const resolvedNetworkLabel = useMemo(() => {
    if (isNetworkInitialized && !isOnline)
      return t('settingsScreen.networkOffline');
    if (!isNetworkInitialized || connectionType === 'unknown') {
      return t('settingsScreen.networkUnknown');
    }
    return t('settingsScreen.networkOnline');
  }, [connectionType, isNetworkInitialized, isOnline, t]);
  const lastSyncLabel = useMemo(() => {
    if (!lastSyncAt) return t('settingsScreen.syncNever');
    const parsedDate = new Date(lastSyncAt);
    if (Number.isNaN(parsedDate.getTime()))
      return t('settingsScreen.syncNever');
    return parsedDate.toLocaleString();
  }, [lastSyncAt, t]);
  const syncVisual = useMemo(() => {
    if (syncStatus === 'error') {
      return {
        icon: 'toastError' as const,
        tintColor: theme.colors.errorDark,
        backgroundColor: theme.colors.errorSoft,
        borderColor: theme.colors.errorSoftBorder,
      };
    }
    if (syncStatus === 'syncing') {
      return {
        icon: 'toastInfo' as const,
        tintColor: theme.colors.infoDark,
        backgroundColor: theme.colors.infoLight,
        borderColor: theme.colors.infoDark,
      };
    }
    if (syncStatus === 'offline' || (isNetworkInitialized && !isOnline)) {
      return {
        icon: 'toastWarning' as const,
        tintColor: theme.colors.warningDark,
        backgroundColor: theme.colors.warningSoft,
        borderColor: theme.colors.warningSoftBorder,
      };
    }
    return {
      icon: 'toastSuccess' as const,
      tintColor: theme.colors.successDark,
      backgroundColor: theme.colors.successSoft,
      borderColor: theme.colors.successSoftBorder,
    };
  }, [isNetworkInitialized, isOnline, syncStatus, theme.colors]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroHeaderRow}>
            <View style={styles.heroIcon}>
              <AppIcon
                name="slidersHorizontal"
                size="sm"
                mColor={theme.colors.primary}
              />
            </View>
            <View style={styles.heroTextBlock}>
              <Text style={styles.screenTitle}>{t('settings')}</Text>
              <Text style={styles.screenSubtitle}>
                {t('settingsScreen.subtitle')}
              </Text>
            </View>
          </View>
          <View style={styles.heroMetaRow}>
            <View style={styles.metaChip}>
              <AppIcon name="palette" size="xs" mColor={theme.colors.primary} />
              <Text style={styles.metaChipText}>{t(`theme.${themeMode}`)}</Text>
            </View>
            <View style={styles.metaChip}>
              <AppIcon name="global" size="xs" mColor={theme.colors.primary} />
              <Text style={styles.metaChipText}>
                {t(`language.${language}`)}
              </Text>
            </View>
          </View>
        </View>

        {/* <View */}
        {/*   style={[ */}
        {/*     styles.syncSummaryCard, */}
        {/*     { */}
        {/*       backgroundColor: syncVisual.backgroundColor, */}
        {/*       borderColor: syncVisual.borderColor, */}
        {/*     }, */}
        {/*   ]} */}
        {/* > */}
        {/*   <View style={styles.syncSummaryHeader}> */}
        {/*     <View style={styles.syncSummaryTitleRow}> */}
        {/*       <AppIcon */}
        {/*         name={syncVisual.icon} */}
        {/*         size="sm" */}
        {/*         mColor={syncVisual.tintColor} */}
        {/*       /> */}
        {/*       <Text */}
        {/*         style={[ */}
        {/*           styles.syncSummaryTitle, */}
        {/*           { color: syncVisual.tintColor }, */}
        {/*         ]} */}
        {/*       > */}
        {/*         {t('settingsScreen.syncHealthTitle')} */}
        {/*       </Text> */}
        {/*     </View> */}
        {/*     <View style={styles.syncStatusBadge}> */}
        {/*       <Text style={styles.syncStatusBadgeText}> */}
        {/*         {resolvedSyncStatusLabel} */}
        {/*       </Text> */}
        {/*     </View> */}
        {/*   </View> */}
        {/*   {syncStatus === 'error' && syncError ? ( */}
        {/*     <Text */}
        {/*       style={[styles.syncSummaryError, { color: syncVisual.tintColor }]} */}
        {/*     > */}
        {/*       {syncError} */}
        {/*     </Text> */}
        {/*   ) : null} */}
        {/*   <View style={styles.metricsGrid}> */}
        {/*     <View style={styles.metricCard}> */}
        {/*       <Text style={styles.metricLabel}> */}
        {/*         {t('settingsScreen.syncPendingLabel')} */}
        {/*       </Text> */}
        {/*       <Text style={styles.metricValue}>{pendingChanges}</Text> */}
        {/*     </View> */}
        {/*     <View style={styles.metricCard}> */}
        {/*       <Text style={styles.metricLabel}> */}
        {/*         {t('settingsScreen.networkLabel')} */}
        {/*       </Text> */}
        {/*       <Text style={styles.metricValue}>{resolvedNetworkLabel}</Text> */}
        {/*       <Text style={styles.metricMeta}>{connectionType}</Text> */}
        {/*     </View> */}
        {/*     <View style={styles.metricCard}> */}
        {/*       <Text style={styles.metricLabel}> */}
        {/*         {t('settingsScreen.syncLastSyncLabel')} */}
        {/*       </Text> */}
        {/*       <Text style={styles.metricValueSmall}>{lastSyncLabel}</Text> */}
        {/*     </View> */}
        {/*   </View> */}
        {/* </View> */}

        <SyncStatusBanner />

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <AppIcon name="userCircle" size="sm" color="primary" />
            <Text style={styles.sectionTitle}>{t('profile')}</Text>
            {profileError && canRunRemoteActions ? (
              <Pressable
                style={styles.inlineActionButton}
                onPress={loadRemoteProfile}
                accessibilityRole="button"
                accessibilityLabel={t('retry')}
              >
                <Text style={styles.inlineActionText}>{t('retry')}</Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.sectionDescription}>
            {t('settingsScreen.accountHint')}
          </Text>

          {isLoadingProfile ? (
            <View style={styles.profileLoading}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={styles.profileLoadingText}>
                {t('settingsScreen.loadingProfile')}
              </Text>
            </View>
          ) : (
            <>
              {profileRows.map(item => (
                <View key={item.key} style={styles.profileRow}>
                  <Text style={styles.profileLabel}>{item.label}</Text>
                  <Text style={styles.profileValue}>{item.value}</Text>
                </View>
              ))}
            </>
          )}

          {profileError ? (
            <Text style={styles.profileError}>{profileError}</Text>
          ) : null}
          {!canRunRemoteActions ? (
            <Text style={styles.offlineHint}>
              {t('settingsScreen.offlineRestrictedMessage')}
            </Text>
          ) : null}
        </View>
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <AppIcon name="palette" size="sm" color="primary" />
            <Text style={styles.sectionTitle}>
              {t('settingsScreen.preferencesTitle')}
            </Text>
          </View>

          <Text style={styles.optionGroupLabel}>{t('themeTitle')}</Text>
          <Text style={styles.sectionDescription}>
            {t('settingsScreen.themeHint')}
          </Text>
          <View style={styles.optionRow}>
            {THEME_OPTIONS.map(option => (
              <Pressable
                key={option}
                style={[
                  styles.optionButton,
                  styles.themeOption,
                  themeMode === option && styles.optionButtonActive,
                ]}
                onPress={() => onThemeChange(option)}
                accessibilityRole="button"
                accessibilityState={{ selected: themeMode === option }}
                accessibilityLabel={t(`theme.${option}`)}
              >
                <View style={styles.optionContent}>
                  <AppIcon
                    name={THEME_OPTION_ICONS[option]}
                    size="xs"
                    mColor={
                      themeMode === option
                        ? theme.colors.primary
                        : theme.colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.optionText,
                      themeMode === option && styles.optionTextActive,
                    ]}
                  >
                    {t(`theme.${option}`)}
                  </Text>
                </View>
                {themeMode === option && (
                  <View style={styles.optionIndicator} />
                )}
              </Pressable>
            ))}
          </View>

          <Text style={styles.optionGroupLabel}>{t('languageTitle')}</Text>
          <Text style={styles.sectionDescription}>
            {t('settingsScreen.languageHint')}
          </Text>
          <Pressable
            style={styles.languageShortcut}
            onPress={openLanguageSheet}
            accessibilityRole="button"
            accessibilityLabel={t('settingsScreen.languagePickerAction')}
          >
            <View style={styles.speciesShortcutTextBlock}>
              <Text style={styles.speciesShortcutText}>
                {t(`language.${language}`)}
              </Text>
              <Text style={styles.speciesShortcutHint}>
                {t('settingsScreen.languagePickerAction')}
              </Text>
            </View>
            <View style={styles.shortcutIconWrap}>
              <AppIcon name="caretRight" size="sm" color="primary" />
            </View>
          </Pressable>
        </View>
        {/* <View style={styles.sectionCard}> */}
        {/*   <View style={styles.sectionHeader}> */}
        {/*     <AppIcon name="key" size="sm" color="primary" /> */}
        {/*     <Text style={styles.sectionTitle}> */}
        {/*       {t('settingsScreen.passwordTitle')} */}
        {/*     </Text> */}
        {/*   </View> */}
        {/*   <Text style={styles.sectionDescription}> */}
        {/*     {t('settingsScreen.passwordHint')} */}
        {/*   </Text> */}
        {/**/}
        {/*   <BaseInput */}
        {/*     label={t('auth.passwordLabel')} */}
        {/*     value={newPassword} */}
        {/*     onChangeText={setNewPassword} */}
        {/*     placeholder={t('auth.passwordMinPlaceholder')} */}
        {/*     secureTextEntry */}
        {/*     autoCapitalize="none" */}
        {/*     autoCorrect={false} */}
        {/*   /> */}
        {/**/}
        {/*   <FormButton */}
        {/*     label={t('settingsScreen.updatePasswordAction')} */}
        {/*     loadingLabel={t('settingsScreen.updatingPassword')} */}
        {/*     loading={isUpdatingPassword} */}
        {/*     disabled={!canRunRemoteActions} */}
        {/*     onPress={onUpdatePassword} */}
        {/*   /> */}
        {/* </View> */}
        {/**/}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <AppIcon name="addressBook" size="sm" color="primary" />
            <Text style={styles.sectionTitle}>
              {t('settingsScreen.speciesTitle')}
            </Text>
          </View>

          <Text style={styles.sectionDescription}>
            {t('settingsScreen.speciesManageHint')}
          </Text>

          <Pressable
            style={styles.speciesShortcut}
            onPress={() => navigation.navigate('SpeciesCatalog')}
            accessibilityRole="button"
            accessibilityLabel={t('settingsScreen.speciesManageAction')}
          >
            <View style={styles.speciesShortcutTextBlock}>
              <Text style={styles.speciesShortcutText}>
                {t('settingsScreen.speciesManageAction')}
              </Text>
              <Text style={styles.speciesShortcutHint}>
                {t('settingsScreen.speciesDescription')}
              </Text>
            </View>
            <View style={styles.shortcutIconWrap}>
              <AppIcon name="caretRight" size="sm" color="primary" />
            </View>
          </Pressable>
        </View>

        <View style={styles.sessionCard}>
          <View style={styles.sectionHeader}>
            <AppIcon name="signOut" size="sm" color="primary" />
            <Text style={styles.sectionTitle}>
              {t('settingsScreen.sessionTitle')}
            </Text>
          </View>
          <Text style={styles.sectionDescription}>
            {t('settingsScreen.sessionHint')}
          </Text>

          <Pressable
            style={[
              styles.sessionActionRow,
              isLoading && styles.sessionActionRowDisabled,
            ]}
            onPress={onRequestLogout}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel={t('logout')}
          >
            <View style={styles.sessionActionLeft}>
              <View style={styles.sessionActionIconWrap}>
                {isLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.primary}
                  />
                ) : (
                  <AppIcon name="signOut" size="sm" color="primary" />
                )}
              </View>
              <View style={styles.sessionActionTextBlock}>
                <Text style={styles.sessionActionTitle}>
                  {t('settingsScreen.logoutRowTitle')}
                </Text>
                {/* <Text style={styles.sessionActionDescription}> */}
                {/*   {t('settingsScreen.logoutRowDescription')} */}
                {/* </Text> */}
              </View>
            </View>
            <AppIcon name="caretRight" size="sm" color="primary" />
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={isLanguageSheetVisible}
        animationType="slide"
        transparent
        onRequestClose={closeLanguageSheet}
      >
        <View style={styles.sheetBackdrop}>
          <Pressable
            style={styles.sheetBackdropTouch}
            onPress={closeLanguageSheet}
          />
          <View style={styles.sheetCard}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleRow}>
                <AppIcon name="global" size="sm" color="primary" />
                <Text style={styles.sheetTitle}>
                  {t('settingsScreen.languageSheetTitle')}
                </Text>
              </View>
              <Pressable
                onPress={closeLanguageSheet}
                accessibilityRole="button"
                accessibilityLabel={t('parentSelector.close')}
              >
                <Text style={styles.sheetCloseText}>
                  {t('parentSelector.close')}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.sheetDescription}>
              {t('settingsScreen.languageSheetDescription')}
            </Text>

            <ScrollView
              style={styles.sheetList}
              contentContainerStyle={styles.sheetListContent}
              showsVerticalScrollIndicator={false}
            >
              {supportedLanguages.map(option => (
                <Pressable
                  key={option}
                  style={[
                    styles.sheetOption,
                    language === option && styles.sheetOptionActive,
                  ]}
                  onPress={() => {
                    onLanguageChange(option);
                    closeLanguageSheet();
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: language === option }}
                  accessibilityLabel={t(`language.${option}`)}
                >
                  <Text
                    style={[
                      styles.sheetOptionText,
                      language === option && styles.sheetOptionTextActive,
                    ]}
                  >
                    {t(`language.${option}`)}
                  </Text>
                  {language === option ? (
                    <AppIcon
                      name="toastSuccess"
                      size="xs"
                      mColor={theme.colors.primary}
                    />
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingBottom: theme.spacing.xl,
  },
  heroCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  heroIcon: {
    width: theme.spacing.xxl,
    height: theme.spacing.xxl,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceVariant,
  },
  heroTextBlock: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  screenTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
  },
  screenSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
  heroMetaRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.full,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  metaChipText: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  syncSummaryCard: {
    borderRadius: theme.borderRadius.xl,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  syncSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  syncSummaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    flex: 1,
  },
  syncSummaryTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
  },
  syncStatusBadge: {
    borderRadius: theme.borderRadius.full,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  syncStatusBadgeText: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    textTransform: 'uppercase',
  },
  syncSummaryError: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  metricCard: {
    flex: 1,
    minWidth: 100,
    borderRadius: theme.borderRadius.md,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  metricLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    textTransform: 'uppercase',
  },
  metricValue: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
  },
  metricValueSmall: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  metricMeta: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    textTransform: 'uppercase',
  },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  inlineActionButton: {
    marginLeft: 'auto',
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceVariant,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  inlineActionText: {
    color: theme.colors.primary,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  sectionDescription: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
  speciesShortcut: {
    minHeight: theme.spacing.xxl,
    borderRadius: theme.borderRadius.md,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  speciesShortcutTextBlock: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  speciesShortcutText: {
    color: theme.colors.primary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  speciesShortcutHint: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
  },
  shortcutIconWrap: {
    width: theme.spacing.lg,
    height: theme.spacing.lg,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceVariant,
  },
  profileLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  profileLoadingText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  profileLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
  profileValue: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  profileError: {
    color: theme.colors.errorDark,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
  offlineHint: {
    color: theme.colors.warningDark,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  optionGroupLabel: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    marginTop: theme.spacing.xs,
  },
  optionRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    flexWrap: 'wrap',
  },
  optionButton: {
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: theme.spacing.xxl,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    flex: 1,
  },
  themeOption: {
    flex: 1,
    minWidth: 94,
  },
  languageOption: {
    minWidth: 110,
    flexGrow: 1,
  },
  languageShortcut: {
    minHeight: theme.spacing.xxl,
    borderRadius: theme.borderRadius.md,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  optionButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surfaceVariant,
  },
  optionText: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
  optionTextActive: {
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  optionIndicator: {
    width: theme.spacing.sm + theme.spacing.xs / 2,
    height: theme.spacing.sm + theme.spacing.xs / 2,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary,
  },
  sessionCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  sessionActionRow: {
    borderRadius: theme.borderRadius.lg,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    minHeight: theme.spacing.xxl + theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  sessionActionRowDisabled: {
    opacity: 0.7,
  },
  sessionActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  sessionActionIconWrap: {
    width: theme.spacing.xxl,
    height: theme.spacing.xxl,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionActionTextBlock: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  sessionActionTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  sessionActionDescription: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: theme.colors.overlay,
  },
  sheetBackdropTouch: {
    flex: 1,
  },
  sheetCard: {
    maxHeight: '72%',
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    flex: 1,
  },
  sheetTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
  },
  sheetCloseText: {
    color: theme.colors.primary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  sheetDescription: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
  sheetList: {
    marginTop: theme.spacing.xs,
  },
  sheetListContent: {
    gap: theme.spacing.xs,
    paddingBottom: theme.spacing.sm,
  },
  sheetOption: {
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
  sheetOptionActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surfaceVariant,
  },
  sheetOptionText: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    flex: 1,
  },
  sheetOptionTextActive: {
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
}));

export default SettingsScreen;
