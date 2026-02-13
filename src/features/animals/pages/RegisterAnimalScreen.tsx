import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import type { RootStackParamList } from '@/presentation/navigation/types';
import type { Animal, Sex } from '@/features/animals/interfaces/animals.types';
import type { Species as SpeciesCatalogItem } from '@/features/species/interfaces/species.types';
import featureContainer from '@/features/container';
import { useAuthStore } from '@/store/useAuthStore';
import Toast from 'react-native-toast-message';
import AppIcon from '@/presentation/components/appIcon/AppIcon';
import { useTranslation } from 'react-i18next';
import BaseInput from '@/presentation/components/input/BaseInput';
import BaseDateInput from '@/presentation/components/date-input/BaseDateInput';
import FormButton from '@/presentation/components/button/FormButton';
import SyncStatusBanner from '@/presentation/components/SyncStatusBanner';
import BaseParentSelectorInput, {
  type ParentOption,
  type ParentSelectorModalAction,
} from '@/presentation/components/parent-selector-input/BaseParentSelectorInput';
import { useNetworkStore } from '@/store/useNetworkStore';
import { extractApiErrorMessage } from '@/core/utils/apiErrorHandler';
import {
  createRegisterAnimalFormSchema,
  type RegisterAnimalFormValues,
} from '@/features/animals/schemas/registerAnimalFormSchema';

type Props = NativeStackScreenProps<RootStackParamList, 'RegisterAnimal'>;

const SEX_OPTIONS: Sex[] = ['MALE', 'FEMALE'];

const toIsoDate = (value: string): string | undefined => {
  if (!value.trim()) return undefined;
  const parsedDate = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsedDate.getTime())) return undefined;
  return parsedDate.toISOString();
};

const getSpeciesMatchKey = (animal?: Animal): string | undefined => {
  if (!animal) return undefined;
  const maybeSpeciesId =
    'speciesId' in animal
      ? (animal as Animal & { speciesId?: string | null }).speciesId
      : undefined;
  return maybeSpeciesId ?? animal.species ?? undefined;
};

const RegisterAnimalScreen = ({ navigation }: Props) => {
  const { theme } = useUnistyles();
  const { t } = useTranslation();
  const user = useAuthStore(state => state.user);
  const isOnline = useNetworkStore(state => state.isOnline);
  const isNetworkInitialized = useNetworkStore(state => state.isInitialized);
  const registerAnimalFormSchema = useMemo(
    () => createRegisterAnimalFormSchema(t),
    [t],
  );
  const { control, getValues, handleSubmit, setValue, watch } =
    useForm<RegisterAnimalFormValues>({
      resolver: zodResolver(registerAnimalFormSchema),
      defaultValues: {
        crotal: '',
        sex: 'MALE',
        speciesSelectionId: '',
        birthDate: '',
        isFounder: false,
        fatherId: '',
        motherId: '',
      },
    });

  const selectedSex = watch('sex');
  const selectedSpeciesId = watch('speciesSelectionId');
  const selectedFatherId = watch('fatherId');
  const selectedMotherId = watch('motherId');
  const isFounder = watch('isFounder');

  const [speciesOptions, setSpeciesOptions] = useState<SpeciesCatalogItem[]>(
    [],
  );
  const [isLoadingSpecies, setIsLoadingSpecies] = useState(true);
  const [speciesError, setSpeciesError] = useState<string | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState(false);
  const [parentsLoading, setParentsLoading] = useState(true);
  const [parentsError, setParentsError] = useState<string | undefined>(
    undefined,
  );
  const [males, setMales] = useState<Animal[]>([]);
  const [females, setFemales] = useState<Animal[]>([]);
  const [foundersCount, setFoundersCount] = useState(0);
  const [isUsingCachedData, setIsUsingCachedData] = useState(true);
  const [isQuickCreateModalVisible, setIsQuickCreateModalVisible] =
    useState(false);
  const [newSpeciesCode, setNewSpeciesCode] = useState('');
  const [newSpeciesName, setNewSpeciesName] = useState('');
  const [newSpeciesDescription, setNewSpeciesDescription] = useState('');
  const [isSavingQuickSpecies, setIsSavingQuickSpecies] = useState(false);

  const selectedSpecies = useMemo(
    () => speciesOptions.find(option => option.id === selectedSpeciesId),
    [selectedSpeciesId, speciesOptions],
  );
  const selectedFather = useMemo(
    () => males.find(animal => animal.id === selectedFatherId),
    [males, selectedFatherId],
  );
  const selectedMother = useMemo(
    () => females.find(animal => animal.id === selectedMotherId),
    [females, selectedMotherId],
  );

  const loadParentsFromLocal = useCallback(async () => {
    if (!user?.id) return;
    const [localMales, localFemales] = await Promise.all([
      featureContainer.animals.listInventory(user.id, { sex: 'MALE' }),
      featureContainer.animals.listInventory(user.id, { sex: 'FEMALE' }),
    ]);
    const localFounders = await featureContainer.animals.listInventory(
      user.id,
      {
        isFounder: true,
      },
    );
    setMales(localMales);
    setFemales(localFemales);
    setFoundersCount(localFounders.length);
    setIsUsingCachedData(true);
  }, [user?.id]);

  const refreshParentsFromServer = useCallback(async () => {
    if (!user?.id) return;
    const [remoteMales, remoteFemales, remoteFounders] = await Promise.all([
      featureContainer.animals.getMales(user.id),
      featureContainer.animals.getFemales(user.id),
      featureContainer.animals.getFounders(user.id),
    ]);
    setMales(remoteMales);
    setFemales(remoteFemales);
    setFoundersCount(remoteFounders.length);
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

  const loadSpecies = useCallback(async () => {
    setIsLoadingSpecies(true);
    setSpeciesError(undefined);
    try {
      const speciesCatalog = await featureContainer.species.list();
      setSpeciesOptions(speciesCatalog);

      const previousSelectionId = getValues('speciesSelectionId');
      const nextSelectionId = speciesCatalog.some(
        item => item.id === previousSelectionId,
      )
        ? previousSelectionId
        : (speciesCatalog[0]?.id ?? '');

      setValue('speciesSelectionId', nextSelectionId, {
        shouldValidate: true,
      });
    } catch (error) {
      setSpeciesError(extractApiErrorMessage(error));
    } finally {
      setIsLoadingSpecies(false);
    }
  }, [getValues, setValue]);

  useFocusEffect(
    useCallback(() => {
      loadSpecies();
    }, [loadSpecies]),
  );

  const closeQuickCreateModal = useCallback(() => {
    setIsQuickCreateModalVisible(false);
    setNewSpeciesCode('');
    setNewSpeciesName('');
    setNewSpeciesDescription('');
  }, []);

  const openQuickCreateModal = useCallback(
    (seedQuery?: string) => {
      if (isNetworkInitialized && !isOnline) {
        Toast.show({
          type: 'warning',
          text1: t('offline.banner.offlineTitle'),
          text2: t('settingsScreen.offlineRestrictedMessage'),
        });
        return;
      }

      const normalizedSeed = (seedQuery ?? '').trim();
      const suggestedCode = normalizedSeed
        .toUpperCase()
        .replace(/\s+/g, '_')
        .replace(/[^A-Z0-9_]/g, '');
      setNewSpeciesCode(suggestedCode);
      setNewSpeciesName(normalizedSeed);
      setNewSpeciesDescription('');
      setIsQuickCreateModalVisible(true);
    },
    [isNetworkInitialized, isOnline, t],
  );

  const onQuickCreateSpecies = async () => {
    if (!newSpeciesCode.trim() || !newSpeciesName.trim()) {
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

    setIsSavingQuickSpecies(true);
    try {
      const created = await featureContainer.species.create({
        code: newSpeciesCode,
        name: newSpeciesName,
        description: newSpeciesDescription,
      });
      await loadSpecies();
      setValue('speciesSelectionId', created.id, { shouldValidate: true });
      closeQuickCreateModal();
      Toast.show({
        type: 'success',
        text1: t('settingsScreen.speciesSavedTitle'),
        text2: t('registerAnimal.speciesQuickCreateSuccess'),
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('settingsScreen.speciesErrorTitle'),
        text2: extractApiErrorMessage(error),
      });
    } finally {
      setIsSavingQuickSpecies(false);
    }
  };

  const speciesSelectorOptions = useMemo<ParentOption[]>(
    () =>
      speciesOptions.map(option => ({
        id: option.id,
        code: option.code,
        name: option.name,
      })),
    [speciesOptions],
  );
  const maleSelectorOptions = useMemo<ParentOption[]>(
    () =>
      males.map(animal => ({
        id: animal.id,
        code: animal.crotal,
        name: animal.speciesName ?? animal.species,
        sex: 'male',
      })),
    [males],
  );
  const compatibleFemales = useMemo(() => {
    const fatherSpeciesKey = getSpeciesMatchKey(selectedFather);
    if (!fatherSpeciesKey) return [];
    return females.filter(
      item => getSpeciesMatchKey(item) === fatherSpeciesKey,
    );
  }, [females, selectedFather]);
  const femaleSelectorOptions = useMemo<ParentOption[]>(
    () =>
      compatibleFemales.map(animal => ({
        id: animal.id,
        code: animal.crotal,
        name: animal.speciesName ?? animal.species,
        sex: 'female',
      })),
    [compatibleFemales],
  );
  const motherSelectionDisabled = !selectedFather;

  useEffect(() => {
    if (!selectedFather) {
      if (selectedMotherId) {
        setValue('motherId', '', { shouldValidate: true });
      }
      return;
    }

    const fatherSpeciesKey = getSpeciesMatchKey(selectedFather);
    const motherSpeciesKey = getSpeciesMatchKey(selectedMother);
    if (
      selectedMother &&
      fatherSpeciesKey &&
      motherSpeciesKey &&
      motherSpeciesKey !== fatherSpeciesKey
    ) {
      setValue('motherId', '', { shouldValidate: true });
    }
  }, [selectedFather, selectedMother, selectedMotherId, setValue]);

  useEffect(() => {
    if (!isFounder) return;

    if (selectedFatherId) {
      setValue('fatherId', '', { shouldValidate: true });
    }
    if (selectedMotherId) {
      setValue('motherId', '', { shouldValidate: true });
    }
  }, [isFounder, selectedFatherId, selectedMotherId, setValue]);

  const speciesModalActions = useMemo<ParentSelectorModalAction[]>(
    () => [
      {
        id: 'createSpecies',
        label: t('registerAnimal.addSpeciesAction'),
        variant: 'primary',
        disabled: isNetworkInitialized && !isOnline,
        onPress: query => openQuickCreateModal(query),
      },
      {
        id: 'manageSpecies',
        label: t('registerAnimal.viewAllSpeciesAction'),
        onPress: () => navigation.navigate('SpeciesCatalog'),
      },
    ],
    [isNetworkInitialized, isOnline, navigation, openQuickCreateModal, t],
  );

  const submit = async (values: RegisterAnimalFormValues) => {
    if (!user?.id) return;

    const species = speciesOptions.find(
      option => option.id === values.speciesSelectionId,
    );

    if (!species) {
      Toast.show({
        type: 'error',
        text1: t('registerAnimal.errorTitle'),
        text2: t('registerAnimal.incompleteDataMessage'),
      });
      return;
    }

    setLoading(true);

    try {
      const animal = await featureContainer.animals.registerAnimal(user.id, {
        crotal: values.crotal.trim().toUpperCase(),
        sex: values.sex,
        species: species.code,
        speciesCode: species.code,
        speciesId: species.id.startsWith('fallback-') ? undefined : species.id,
        birthDate: toIsoDate(values.birthDate),
        isFounder: values.isFounder,
        fatherId: values.isFounder ? undefined : values.fatherId || undefined,
        motherId: values.isFounder ? undefined : values.motherId || undefined,
      });

      featureContainer.sync.syncNow(user.id).catch(() => {
        // Background sync failures are exposed through sync status banner.
      });

      Toast.show({
        type: 'success',
        text1: t('registerAnimal.successTitle'),
        text2:
          isOnline || !isNetworkInitialized
            ? t('registerAnimal.successMessage', { tag: animal.crotal })
            : t('registerAnimal.errorMessage'),
      });

      navigation.goBack();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('registerAnimal.errorTitle'),
        text2: extractApiErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  };

  const parentSelectorContent = () => {
    if (parentsLoading) {
      return (
        <View style={styles.feedbackCard}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.feedbackText}>
            {t('offline.banner.cacheDescription')}
          </Text>
        </View>
      );
    }

    if (parentsError) {
      return (
        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackText}>{parentsError}</Text>
          <Pressable style={styles.retryButton} onPress={loadParents}>
            <Text style={styles.retryButtonText}>{t('save')}</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <>
        <Controller
          control={control}
          name="fatherId"
          render={({ field: { onChange, value } }) => (
            <BaseParentSelectorInput
              label={t('registerAnimal.selectSire')}
              value={value}
              onChangeText={onChange}
              options={maleSelectorOptions}
              modalTitle={t('registerAnimal.selectSire')}
              searchPlaceholder={t('registerAnimal.parentSearchPlaceholder')}
            />
          )}
        />
        {males.length === 0 ? (
          <Text style={styles.emptyHint}>{t('herd.noAnimalsText')}</Text>
        ) : null}

        <Controller
          control={control}
          name="motherId"
          render={({ field: { onChange, value } }) => (
            <BaseParentSelectorInput
              label={t('registerAnimal.selectDam')}
              value={value}
              onChangeText={onChange}
              options={femaleSelectorOptions}
              modalTitle={t('registerAnimal.selectDam')}
              searchPlaceholder={t('registerAnimal.parentSearchPlaceholder')}
              disabled={motherSelectionDisabled}
              // disabledMessage={t('registerAnimal.selectFatherFirstHint')}
            />
          )}
        />
        {/* {motherSelectionDisabled ? ( */}
        {/*   <Text style={styles.emptyHint}> */}
        {/*     {t('registerAnimal.selectFatherFirstHint')} */}
        {/*   </Text> */}
        {/* ) : compatibleFemales.length === 0 ? ( */}
        {/*   <Text style={styles.emptyHint}> */}
        {/*     {t('registerAnimal.noCompatibleMothersHint')} */}
        {/*   </Text> */}
        {/* ) : females.length === 0 ? ( */}
        {/*   <Text style={styles.emptyHint}>{t('herd.noAnimalsText')}</Text> */}
        {/* ) : null} */}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={navigation.goBack} style={styles.backButton}>
            <AppIcon name="arrowLeft" size="sm" mColor={theme.colors.text} />
          </Pressable>
          <View style={styles.headerTextBlock}>
            <Text style={styles.title}>{t('registerAnimal.title')}</Text>
            <Text style={styles.subtitle}>{t('registerAnimal.subtitle')}</Text>
          </View>
        </View>

        <SyncStatusBanner showCacheHint={isUsingCachedData} />

        <View style={styles.card}>
          <Controller
            control={control}
            name="crotal"
            render={({ field: { onBlur, onChange, value }, fieldState }) => (
              <BaseInput
                label={t('registerAnimal.earTagId')}
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                errorMessage={fieldState.error?.message}
                placeholder="840 2201"
                autoCapitalize="characters"
                autoCorrect={false}
              />
            )}
          />

          <Controller
            control={control}
            name="sex"
            render={({ field: { onChange, value }, fieldState }) => (
              <>
                <Text style={styles.label}>
                  {t('registerAnimal.sexSelection')}
                </Text>
                <View style={styles.optionRow}>
                  {SEX_OPTIONS.map(option => (
                    <Pressable
                      key={option}
                      style={[
                        styles.optionCard,
                        value === option && styles.optionCardSelected,
                      ]}
                      onPress={() => onChange(option)}
                    >
                      <Text
                        style={[
                          styles.optionTitle,
                          value === option && styles.optionTitleSelected,
                        ]}
                      >
                        {option === 'MALE' ? t('herd.male') : t('herd.female')}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {fieldState.error ? (
                  <Text style={styles.formErrorText}>
                    {fieldState.error.message}
                  </Text>
                ) : null}
              </>
            )}
          />

          <Text style={styles.label}>{t('registerAnimal.species')}</Text>

          {isLoadingSpecies ? (
            <View style={styles.inlineFeedback}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={styles.feedbackText}>
                {t('registerAnimal.speciesLoading')}
              </Text>
            </View>
          ) : speciesError ? (
            <View style={styles.feedbackCard}>
              <Text style={styles.feedbackText}>{speciesError}</Text>
              <Pressable style={styles.retryButton} onPress={loadSpecies}>
                <Text style={styles.retryButtonText}>{t('save')}</Text>
              </Pressable>
            </View>
          ) : (
            <Controller
              control={control}
              name="speciesSelectionId"
              render={({ field: { onChange, value }, fieldState }) => (
                <BaseParentSelectorInput
                  label={t('registerAnimal.speciesSelectorLabel')}
                  value={value}
                  onChangeText={onChange}
                  options={speciesSelectorOptions}
                  errorMessage={fieldState.error?.message}
                  allowClear={false}
                  modalTitle={t('registerAnimal.speciesModalTitle')}
                  searchPlaceholder={t(
                    'registerAnimal.speciesSearchPlaceholder',
                  )}
                  modalActions={speciesModalActions}
                />
              )}
            />
          )}

          {isNetworkInitialized && !isOnline ? (
            <Text style={styles.emptyHint}>
              {t('registerAnimal.speciesOfflineHint')}
            </Text>
          ) : null}

          <Controller
            control={control}
            name="birthDate"
            render={({ field: { onBlur, onChange, value }, fieldState }) => (
              <BaseDateInput
                label={t('registerAnimal.birthDate')}
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                errorMessage={fieldState.error?.message}
                allowClear
              />
            )}
          />

          <Controller
            control={control}
            name="isFounder"
            render={({ field: { onChange, value } }) => (
              <View style={styles.switchRow}>
                <View style={styles.switchTextGroup}>
                  <Text style={styles.label}>
                    {t('registerAnimal.founderAnimal')}
                  </Text>
                  <Text style={styles.switchHint}>
                    {t('registerAnimal.founderHint')} •{' '}
                    {t('registerAnimal.foundersAvailable', {
                      count: foundersCount,
                    })}
                  </Text>
                </View>
                <Switch value={value} onValueChange={onChange} />
              </View>
            )}
          />

          {!isFounder && parentSelectorContent()}

          {/*   <View style={styles.summaryCard}> */}
          {/*     <Text style={styles.summaryTitle}> */}
          {/*       {t('registerAnimal.summary')} */}
          {/*     </Text> */}
          {/*     <Text style={styles.summaryItem}> */}
          {/*       {t('registerAnimal.sire')}: {selectedFather?.crotal ?? '-'} */}
          {/*     </Text> */}
          {/*     <Text style={styles.summaryItem}> */}
          {/*       {t('registerAnimal.dam')}: {selectedMother?.crotal ?? '-'} */}
          {/*     </Text> */}
          {/*     <Text style={styles.summaryItem}> */}
          {/*     {t('registerAnimal.species')}: {selectedSpecies?.name ?? '-'} */}
          {/*   </Text> */}
          {/*   <Text style={styles.summaryItem}> */}
          {/*     {t('registerAnimal.sexSelection')}:{' '} */}
          {/*     {selectedSex === 'MALE' ? t('herd.male') : t('herd.female')} */}
          {/*   </Text> */}
          {/* </View> */}

          <FormButton
            label={t('registerAnimal.submit')}
            loadingLabel={t('registerAnimal.submitting')}
            loading={loading}
            onPress={handleSubmit(submit)}
          />
        </View>
      </ScrollView>

      <Modal
        visible={isQuickCreateModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeQuickCreateModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t('registerAnimal.quickCreateSpeciesTitle')}
              </Text>
              <Pressable onPress={closeQuickCreateModal}>
                <Text style={styles.modalCloseText}>
                  {t('parentSelector.close')}
                </Text>
              </Pressable>
            </View>

            <BaseInput
              label={t('settingsScreen.speciesCodeLabel')}
              value={newSpeciesCode}
              onChangeText={setNewSpeciesCode}
              placeholder={t('settingsScreen.speciesCodePlaceholder')}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <BaseInput
              label={t('settingsScreen.speciesNameLabel')}
              value={newSpeciesName}
              onChangeText={setNewSpeciesName}
              placeholder={t('settingsScreen.speciesNamePlaceholder')}
            />
            <BaseInput
              label={t('settingsScreen.speciesDescriptionLabel')}
              value={newSpeciesDescription}
              onChangeText={setNewSpeciesDescription}
              placeholder={t('settingsScreen.speciesDescriptionPlaceholder')}
              multiline
            />

            <FormButton
              label={t('registerAnimal.addSpeciesAction')}
              loadingLabel={t('settingsScreen.speciesSaving')}
              loading={isSavingQuickSpecies}
              onPress={onQuickCreateSpecies}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default RegisterAnimalScreen;

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
  headerTextBlock: {
    flex: 1,
    gap: theme.spacing.xs,
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
  card: {
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  label: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  optionRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  optionCard: {
    flex: 1,
    borderRadius: theme.borderRadius.lg,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceVariant,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    minHeight: theme.spacing.xxl + theme.spacing.sm,
    justifyContent: 'center',
  },
  optionCardSelected: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.successSoft,
  },
  optionTitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    textTransform: 'uppercase',
  },
  optionTitleSelected: {
    color: theme.colors.success,
  },
  formErrorText: {
    color: theme.colors.error,
    fontSize: theme.typography.fontSize.sm,
  },
  inlineFeedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  switchRow: {
    marginTop: theme.spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  switchTextGroup: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  switchHint: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
  },
  summaryCard: {
    marginTop: theme.spacing.xs,
    borderRadius: theme.borderRadius.lg,
    borderWidth: theme.spacing.xs / theme.spacing.xs,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceVariant,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  summaryTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    textTransform: 'uppercase',
  },
  summaryItem: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  modalCard: {
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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  modalTitle: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
  },
  modalCloseText: {
    color: theme.colors.primary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
}));
