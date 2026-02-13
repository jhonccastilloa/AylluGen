import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/store/useAuthStore';
import type { RootStackParamList } from '@/presentation/navigation/StackNavigator';
import FormInput from '@/presentation/components/input/FormInput';
import FormButton from '@/presentation/components/button/FormButton';
import FormDniInput from '@/presentation/components/dni-input/FormDniInput';
import { useTranslation } from 'react-i18next';
import {
  createSignInSchema,
  type SignInFormValues,
} from '@/presentation/screens/auth/authFormSchemas';

type Props = NativeStackScreenProps<RootStackParamList, 'SignIn'>;

const SignInScreen = ({ navigation }: Props) => {
  const { t } = useTranslation();
  const login = useAuthStore(state => state.login);
  const isLoading = useAuthStore(state => state.isLoading);
  const apiError = useAuthStore(state => state.error);
  const clearError = useAuthStore(state => state.clearError);
  const signInSchema = useMemo(() => createSignInSchema(t), [t]);

  const { control, handleSubmit } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      dni: '',
      password: '',
    },
  });

  const onSubmit = async (data: SignInFormValues) => {
    clearError();
    try {
      await login(data.dni.trim(), data.password);
    } catch {
      // API error is already handled in the auth store.
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{t('auth.signInTitle')}</Text>
            <Text style={styles.subtitle}>{t('auth.signInSubtitle')}</Text>
          </View>

          <View style={styles.form}>
            <FormDniInput
              control={control}
              name="dni"
              label={t('auth.dniLabel')}
              placeholder={t('auth.dniPlaceholder')}
              onChangeValue={clearError}
            />

            <FormInput
              control={control}
              name="password"
              label={t('auth.passwordLabel')}
              placeholder={t('auth.passwordPlaceholder')}
              secureTextEntry
              onChangeValue={clearError}
            />

            {apiError && <Text style={styles.errorText}>{apiError}</Text>}

            <FormButton
              label={t('auth.signInAction')}
              loadingLabel={t('auth.signingIn')}
              loading={isLoading}
              onPress={handleSubmit(onSubmit)}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.noAccount')}</Text>
            <Pressable
              onPress={() => navigation.navigate('SignUp')}
              accessibilityRole="button"
              accessibilityLabel={t('auth.goToSignUp')}
            >
              <Text style={styles.footerLink}>{t('auth.goToSignUp')}</Text>
            </Pressable>
          </View>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  header: {
    marginTop: theme.spacing.xl,
  },
  title: {
    fontSize: theme.typography.fontSize.xxxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
  },
  form: {
    gap: theme.spacing.md,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.typography.fontSize.sm,
    marginTop: theme.spacing.xs,
  },
  footer: {
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  footerText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.sm,
  },
  footerLink: {
    color: theme.colors.primary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
}));

export default SignInScreen;
