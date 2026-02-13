import { StyleSheet } from '@/infrastructure/theme';
import { View, Text, Pressable } from 'react-native';

const ResponsiveExample = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Responsive Layout</Text>
      <Text style={styles.text}>
        This component adapts to different screen sizes
      </Text>

      <View style={styles.grid}>
        <View style={styles.gridItem}>
          <Text style={styles.gridText}>Small screens</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridText}>Medium screens</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridText}>Large screens</Text>
        </View>
      </View>

      <Pressable style={styles.button}>
        <Text style={styles.buttonText}>Responsive Button</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create((theme: any, _rt: any) => ({
  container: {
    flex: 1,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  text: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  gridItem: {
    flex: 1,
    minWidth: 120,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.md,
    variants: {
      sm: {
        minWidth: 100,
      },
      md: {
        minWidth: 150,
      },
      lg: {
        minWidth: 200,
      },
    },
  },
  gridText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text,
    textAlign: 'center',
  },
  button: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    variants: {
      sm: {
        padding: theme.spacing.sm,
      },
      md: {
        padding: theme.spacing.md,
      },
      lg: {
        padding: theme.spacing.lg,
      },
    },
  },
  buttonText: {
    color: theme.colors.onPrimary,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
  },
}));

export default ResponsiveExample;
