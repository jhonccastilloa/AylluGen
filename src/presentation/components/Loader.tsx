import { View, ActivityIndicator } from 'react-native';
import { useLoaderStore } from '@/store/useLoaderStore';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

const Loader = () => {
  const { isLoading } = useLoaderStore();
  const { theme } = useUnistyles();

  if (!isLoading) return null;

  return (
    <View style={styles.container}>
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create((theme: any) => ({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loaderContainer: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.lg,
  },
}));

export default Loader;
