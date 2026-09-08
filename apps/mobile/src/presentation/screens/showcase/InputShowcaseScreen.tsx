import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import ConsanguinityBadge from '@/presentation/components/consanguinity/ConsanguinityBadge';
import type { ParentOption } from '@/presentation/components/parent-selector-input/BaseParentSelectorInput';
import FormBirthDateInput from '@/presentation/components/birth-date-input/FormBirthDateInput';
import FormButton from '@/presentation/components/button/FormButton';
import FormCurrencyInput from '@/presentation/components/currency-input/FormCurrencyInput';
import FormDniInput from '@/presentation/components/dni-input/FormDniInput';
import FormEmailInput from '@/presentation/components/email-input/FormEmailInput';
import FormInput from '@/presentation/components/input/FormInput';
import FormNumericInput from '@/presentation/components/numeric-input/FormNumericInput';
import FormParentSelectorInput from '@/presentation/components/parent-selector-input/FormParentSelectorInput';
import FormPercentageInput from '@/presentation/components/percentage-input/FormPercentageInput';
import FormPhoneInput from '@/presentation/components/phone-input/FormPhoneInput';
import FormSexInput from '@/presentation/components/sex-input/FormSexInput';
import type { RootStackParamList } from '@/presentation/navigation/StackNavigator';
import { StyleSheet } from 'react-native-unistyles';

const isValidBirthDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const candidateDate = new Date(year, month - 1, day);
  const isSameDate =
    candidateDate.getFullYear() === year &&
    candidateDate.getMonth() === month - 1 &&
    candidateDate.getDate() === day;

  if (!isSameDate) {
    return false;
  }

  return candidateDate <= new Date();
};

type ShowcaseFormValues = {
  fullName: string;
  email: string;
  dni: string;
  birthDate: string;
  sex: 'male' | 'female' | 'unknown';
  age: string;
  amount: string;
  percentage: string;
  phone: string;
  sireId: string;
  damId: string;
};
type Props = NativeStackScreenProps<RootStackParamList, 'InputShowcase'>;

const parentCatalog: ParentOption[] = [
  { id: 'A-001', code: 'A-001', name: 'Rayo', sex: 'male', breed: 'Angus' },
  {
    id: 'A-002',
    code: 'A-002',
    name: 'Trueno',
    sex: 'male',
    breed: 'Hereford',
  },
  { id: 'A-010', code: 'A-010', name: 'Luna', sex: 'female', breed: 'Angus' },
  {
    id: 'A-011',
    code: 'A-011',
    name: 'Estrella',
    sex: 'female',
    breed: 'Brangus',
  },
  {
    id: 'A-099',
    code: 'A-099',
    name: 'Sin dato',
    sex: 'unknown',
    breed: 'Mixta',
  },
];

const InputShowcaseScreen = (_props: Props) => {
  const { t } = useTranslation();
  const [submittedData, setSubmittedData] = useState<ShowcaseFormValues | null>(
    null,
  );
  const showcaseSchema = useMemo(
    () =>
      z.object({
        fullName: z.string().min(2, t('validation.fullNameRequired')),
        email: z.string().email(t('validation.emailInvalid')),
        dni: z.string().length(8, t('validation.dniExact')),
        birthDate: z
          .string()
          .refine(isValidBirthDate, t('validation.birthDateInvalid')),
        sex: z.enum(['male', 'female', 'unknown'], {
          message: t('validation.sexRequired'),
        }),
        age: z
          .string()
          .regex(/^\d+$/, t('validation.ageInteger'))
          .refine(value => Number(value) >= 18, t('validation.ageMin')),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/, t('validation.amountInvalid')),
        percentage: z
          .string()
          .regex(/^\d+(\.\d{1,2})?$/, t('validation.percentageInvalid'))
          .refine(value => Number(value) <= 100, t('validation.percentageMax')),
        phone: z.string().min(7, t('validation.phoneInvalid')),
        sireId: z.string().min(1, t('validation.sireRequired')),
        damId: z.string().min(1, t('validation.damRequired')),
      }),
    [t],
  );

  const { control, handleSubmit, reset, watch } = useForm<ShowcaseFormValues>({
    resolver: zodResolver(showcaseSchema),
    defaultValues: {
      fullName: '',
      email: '',
      dni: '',
      birthDate: '',
      sex: 'unknown',
      age: '',
      amount: '',
      percentage: '',
      phone: '',
      sireId: '',
      damId: '',
    },
  });

  const sireOptions = useMemo(
    () => parentCatalog.filter(option => option.sex === 'male'),
    [],
  );
  const damOptions = useMemo(
    () => parentCatalog.filter(option => option.sex === 'female'),
    [],
  );
  const watchedPercentage = watch('percentage');

  const onSubmit = (data: ShowcaseFormValues) => {
    setSubmittedData(data);
  };

  const onReset = () => {
    reset();
    setSubmittedData(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>{t('showcase.title')}</Text>
            <Text style={styles.subtitle}>{t('showcase.subtitle')}</Text>
          </View>

          <View style={styles.badgeRow}>
            <Text style={styles.badgeLabel}>{t('showcase.estimatedConsanguinity')}</Text>
            <ConsanguinityBadge value={watchedPercentage} />
          </View>

          <View style={styles.form}>
            <FormInput
              control={control}
              name="fullName"
              label={t('showcase.fullNameLabel')}
              placeholder={t('showcase.fullNamePlaceholder')}
            />

            <FormEmailInput
              control={control}
              name="email"
              label={t('showcase.emailLabel')}
              placeholder={t('showcase.emailPlaceholder')}
            />

            <FormDniInput
              control={control}
              name="dni"
              label={t('showcase.dniLabel')}
              placeholder={t('showcase.dniPlaceholder')}
            />

            <FormBirthDateInput
              control={control}
              name="birthDate"
              label={t('showcase.birthDateLabel')}
              placeholder={t('showcase.birthDatePlaceholder')}
            />

            <FormSexInput control={control} name="sex" label={t('showcase.sexLabel')} />

            <FormParentSelectorInput
              control={control}
              name="sireId"
              label={t('showcase.sireLabel')}
              placeholder={t('showcase.sirePlaceholder')}
              options={sireOptions}
              modalTitle={t('showcase.sireModalTitle')}
              searchPlaceholder={t('showcase.sireSearchPlaceholder')}
            />

            <FormParentSelectorInput
              control={control}
              name="damId"
              label={t('showcase.damLabel')}
              placeholder={t('showcase.damPlaceholder')}
              options={damOptions}
              modalTitle={t('showcase.damModalTitle')}
              searchPlaceholder={t('showcase.damSearchPlaceholder')}
            />

            <FormNumericInput
              control={control}
              name="age"
              label={t('showcase.ageLabel')}
              placeholder={t('showcase.agePlaceholder')}
            />

            <FormCurrencyInput
              control={control}
              name="amount"
              label={t('showcase.amountLabel')}
              placeholder={t('showcase.amountPlaceholder')}
              currencySymbol="$"
            />

            <FormPercentageInput
              control={control}
              name="percentage"
              label={t('showcase.discountLabel')}
              placeholder={t('showcase.discountPlaceholder')}
            />

            <FormPhoneInput
              control={control}
              name="phone"
              label={t('showcase.phoneLabel')}
              placeholder={t('showcase.phonePlaceholder')}
            />

            <FormButton
              label={t('showcase.saveExample')}
              onPress={handleSubmit(onSubmit)}
            />
            <FormButton
              label={t('showcase.clear')}
              variant="outline"
              onPress={onReset}
            />
          </View>

          {submittedData && (
            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>{t('showcase.dataSent')}</Text>
              <Text style={styles.resultText}>
                {JSON.stringify(submittedData, null, 2)}
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  header: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  badgeRow: {
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  badgeLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.sm,
  },
  form: {
    gap: theme.spacing.md,
  },
  resultCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  resultTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  resultText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.sm,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
}));

export default InputShowcaseScreen;
