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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import featureContainer from '@/features/container';
import type { Species } from '@/features/species/interfaces/species.types';
import type { RootStackParamList } from '@/presentation/navigation/types';
import AppIcon from '@/presentation/components/appIcon/AppIcon';
import BaseInput from '@/presentation/components/input/BaseInput';
import FormButton from '@/presentation/components/button/FormButton';
import SyncStatusBanner from '@/presentation/components/SyncStatusBanner';
import { extractApiErrorMessage } from '@/core/utils/apiErrorHandler';
import { useNetworkStore } from '@/store/useNetworkStore';

const SpeciesCatalogScreen = () => {
  const { theme } = useUnistyles();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isOnline = useNetworkStore(state => state.isOnline);
  const isNetworkInitialized = useNetworkStore(state => state.isInitialized);

  const [speciesList, setSpeciesList] = useState<Species[]>([]);
  const [isLoadingSpecies, setIsLoadingSpecies] = useState(false);
  const [isSavingSpecies, setIsSavingSpecies] = useState(false);
  const [speciesError, setSpeciesError] = useState<string | undefined>(undefined);
  const [editingSpeciesId, setEditingSpeciesId] = useState<string | null>(null);
  const [speciesCodeInput, setSpeciesCodeInput] = useState('');
  const [speciesNameInput, setSpeciesNameInput] = useState('');
  const [speciesDescriptionInput, setSpeciesDescriptionInput] = useState('');
  const [isUsingCachedData, setIsUsingCachedData] = useState(true);

  const loadSpecies = useCallback(async () => {
    setIsLoadingSpecies(true);
    setSpeciesError(undefined);
    try {
      const catalog = await featureContainer.species.list();
      setSpeciesList(catalog);
      setIsUsingCachedData(catalog.some(item => item.id.startsWith('fallback-')));
    } catch (error) {
      setSpeciesError(extractApiErrorMessage(error));
      setIsUsingCachedData(true);
    } finally {
      setIsLoadingSpecies(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSpecies();
    }, [loadSpecies]),
  );

  const resetSpeciesForm = useCallback(() => {
    setEditingSpeciesId(null);
    setSpeciesCodeInput('');
    setSpeciesNameInput('');
    setSpeciesDescriptionInput('');
  }, []);

  const selectedSpecies = useMemo(
    () => speciesList.find(item => item.id === editingSpeciesId),
    [editingSpeciesId, speciesList],
  );

  useEffect(() => {
    if (!selectedSpecies) return;
    setSpeciesCodeInput(selectedSpecies.code);
    setSpeciesNameInput(selectedSpecies.name);
    setSpeciesDescriptionInput(selectedSpecies.description ?? '');
  }, [selectedSpecies]);

  const onSaveSpecies = async () => {
    if (!speciesCodeInput.trim() || !speciesNameInput.trim()) {
      Toast.show({
        type: 'info',
        text1: t('settingsScreen.speciesRequiredTitle'),
        text2: t('settingsScreen.speciesRequiredMessage'),
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

    setIsSavingSpecies(true);
    try {
      if (editingSpeciesId) {
        await featureContainer.species.update(editingSpeciesId, {
          code: speciesCodeInput,
          name: speciesNameInput,
          description: speciesDescriptionInput,
        });
      } else {
        await featureContainer.species.create({
          code: speciesCodeInput,
          name: speciesNameInput,
          description: speciesDescriptionInput,
        });
      }

      await loadSpecies();
      resetSpeciesForm();
      Toast.show({
        type: 'success',
        text1: t('settingsScreen.speciesSavedTitle'),
        text2: t('settingsScreen.speciesSavedMessage'),
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('settingsScreen.speciesErrorTitle'),
        text2: extractApiErrorMessage(error),
      });
    } finally {
      setIsSavingSpecies(false);
    }
  };

  const onDeleteSpecies = (speciesItem: Species) => {
    Alert.alert(
      t('settingsScreen.speciesDeleteTitle'),
      t('settingsScreen.speciesDeleteMessage', { name: speciesItem.name }),
      [
        { text: t('parentSelector.close'), style: 'cancel' },
        {
          text: t('settingsScreen.speciesDeleteAction'),
          style: 'destructive',
          onPress: async () => {
            if (isNetworkInitialized && !isOnline) {
              Toast.show({
                type: 'warning',
                text1: t('offline.banner.offlineTitle'),
                text2: t('settingsScreen.offlineRestrictedMessage'),
              });
              return;
            }

            try {
              await featureContainer.species.delete(speciesItem.id);
              if (editingSpeciesId === speciesItem.id) {
                resetSpeciesForm();
              }
              await loadSpecies();
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: t('settingsScreen.speciesErrorTitle'),
                text2: extractApiErrorMessage(error),
              });
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable
            onPress={navigation.goBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel={t('back')}
          >
            <AppIcon name="arrowLeft" size="sm" mColor={theme.colors.text} />
          </Pressable>
          <View style={styles.headerTextBlock}>
            <Text style={styles.title}>{t('settingsScreen.speciesTitle')}</Text>
            <Text style={styles.subtitle}>{t('settingsScreen.speciesDescription')}</Text>
          </View>
        </View>

        <SyncStatusBanner showCacheHint={isUsingCachedData} />

        <View style={styles.sectionCard}>
          {isNetworkInitialized && !isOnline ? (
            <Text style={styles.sectionDescription}>
              {t('settingsScreen.speciesOfflineHint')}
            </Text>
          ) : null}

          {isLoadingSpecies ? (
            <View style={styles.profileLoading}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={styles.profileLoadingText}>
                {t('settingsScreen.speciesLoading')}
              </Text>
            </View>
          ) : speciesList.length === 0 ? (
            <Text style={styles.profileLoadingText}>{t('settingsScreen.speciesEmpty')}</Text>
          ) : (
            <View style={styles.speciesList}>
              {speciesList.map(item => (
                <View key={item.id} style={styles.speciesItem}>
                  <View style={styles.speciesItemTextBlock}>
                    <Text style={styles.speciesName}>{item.name}</Text>
                    <Text style={styles.speciesCode}>{item.code}</Text>
                    {item.description ? (
                      <Text style={styles.speciesDescriptionText}>{item.description}</Text>
                    ) : null}
                  </View>
                  <View style={styles.speciesActions}>
                    <Pressable
                      style={styles.speciesActionButton}
                      onPress={() => setEditingSpeciesId(item.id)}
                    >
                      <Text style={styles.speciesActionText}>
                        {t('settingsScreen.speciesEditAction')}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.speciesActionButton, styles.speciesActionButtonDanger]}
                      onPress={() => onDeleteSpecies(item)}
                    >
                      <Text style={[styles.speciesActionText, styles.speciesActionTextDanger]}>
                        {t('settingsScreen.speciesDeleteAction')}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}

          {speciesError ? <Text style={styles.profileError}>{speciesError}</Text> : null}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.formTitle}>
            {editingSpeciesId
              ? t('settingsScreen.speciesUpdateAction')
              : t('settingsScreen.speciesCreateAction')}
          </Text>

          <BaseInput
            label={t('settingsScreen.speciesCodeLabel')}
            value={speciesCodeInput}
            onChangeText={setSpeciesCodeInput}
            placeholder={t('settingsScreen.speciesCodePlaceholder')}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <BaseInput
            label={t('settingsScreen.speciesNameLabel')}
            value={speciesNameInput}
            onChangeText={setSpeciesNameInput}
            placeholder={t('settingsScreen.speciesNamePlaceholder')}
          />
          <BaseInput
            label={t('settingsScreen.speciesDescriptionLabel')}
            value={speciesDescriptionInput}
            onChangeText={setSpeciesDescriptionInput}
            placeholder={t('settingsScreen.speciesDescriptionPlaceholder')}
            multiline
          />

          <FormButton
            label={
              editingSpeciesId
                ? t('settingsScreen.speciesUpdateAction')
                : t('settingsScreen.speciesCreateAction')
            }
            loadingLabel={t('settingsScreen.speciesSaving')}
            loading={isSavingSpecies}
            onPress={onSaveSpecies}
          />

          {editingSpeciesId ? (
            <Pressable style={styles.speciesCancelButton} onPress={resetSpeciesForm}>
              <Text style={styles.speciesCancelText}>
                {t('settingsScreen.speciesCancelAction')}
              </Text>
            </Pressable>
          ) : null}
        </View>
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
  backButton: {
    width: theme.spacing.xxl,
    height: theme.spacing.xxl,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
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
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  sectionDescription: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
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
  profileError: {
    color: theme.colors.errorDark,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
  formTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  speciesList: {
    gap: theme.spacing.xs,
  },
  speciesItem: {
    borderRadius: theme.borderRadius.md,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceVariant,
    padding: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  speciesItemTextBlock: {
    gap: theme.spacing.xs,
  },
  speciesName: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  speciesCode: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
  },
  speciesDescriptionText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
  },
  speciesActions: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  speciesActionButton: {
    flex: 1,
    minHeight: theme.spacing.xl + theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  speciesActionButtonDanger: {
    borderColor: theme.colors.errorSoftBorder,
    backgroundColor: theme.colors.errorSoft,
  },
  speciesActionText: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  speciesActionTextDanger: {
    color: theme.colors.errorDark,
  },
  speciesCancelButton: {
    minHeight: theme.spacing.xl + theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  speciesCancelText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    textTransform: 'uppercase',
  },
}));

export default SpeciesCatalogScreen;
