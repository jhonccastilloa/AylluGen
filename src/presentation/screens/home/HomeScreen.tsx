import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuthStore } from '@/store/useAuthStore';
import ThemeToggle from '@/presentation/components/ThemeToggle';
import type { RootStackParamList } from '@/presentation/navigation/StackNavigator';
import { useTranslation } from 'react-i18next';
import FormButton from '@/presentation/components/button/FormButton';

type Props = NativeStackScreenProps<RootStackParamList, 'HerdDashboard'>;

const HomeScreen = ({ navigation }: Props) => {
  const { t } = useTranslation();
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const isLoading = useAuthStore(state => state.isLoading);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('homeScreen.sessionStarted')}</Text>
          <Text style={styles.subtitle}>
            {t('homeScreen.userLabel')}: {user?.dni || 'N/A'}
          </Text>
        </View>

        <ThemeToggle />

        <View style={styles.actions}>
          <FormButton
            label={t('homeScreen.showcase')}
            variant="outline"
            onPress={() => navigation.navigate('InputShowcase')}
          />
          <FormButton
            label={t('logout')}
            loadingLabel={t('homeScreen.closingSession')}
            loading={isLoading}
            variant="destructive"
            onPress={logout}
          />
        </View>
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
    padding: theme.spacing.lg,
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
  },
  card: {
    marginTop: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.md,
  },
  actions: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
}));

export default HomeScreen;
