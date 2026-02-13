import { toast } from '@/shared/utils/toastUtilities';
import { HeartIcon } from 'phosphor-react-native';
import { View, Text, TouchableOpacity } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

const ExampleComponent = () => {
  const { theme } = useUnistyles();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Theme: {theme.name}</Text>
      <Text style={styles.text}>Colors</Text>
      <View style={styles.colorRow}>
        <View style={styles.colorBox} />
        <TouchableOpacity
          onPress={() => {
            console.log('asdentre');
            toast.info('BORROW');
          }}
        >
          <View
            style={[
              styles.colorBox,
              { backgroundColor: theme.colors.secondary },
            ]}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            console.log('asdentre');
            toast.error('BORROW');
          }}
        >
          <View
            style={[styles.colorBox, { backgroundColor: theme.colors.success }]}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            console.log('asdentre');
            toast.success('BORROW');
          }}
        >
          <View
            style={[styles.colorBox, { backgroundColor: theme.colors.warning }]}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            console.log('asdentre');
            toast.warning('BORROW');
          }}
        >
          <View
            style={[styles.colorBox, { backgroundColor: theme.colors.error }]}
          />
        </TouchableOpacity>
      </View>
      <HeartIcon color={theme.colors.primaryDark} weight="fill" size={32} />
      <Text style={styles.text}>Responsive Spacing</Text>
      <View style={styles.spacingBox}>
        <Text style={styles.spacingText}>Padding: {theme.spacing.md}px</Text>
      </View>
      <TouchableOpacity style={styles.button} onPress={() => {}}>
        <Text style={styles.buttonText}>Press Me</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create((theme: any) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  text: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  colorBox: {
    width: 60,
    height: 60,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
  },
  spacingBox: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
  },
  spacingText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  buttonText: {
    color: theme.colors.background,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
  },
}));

export default ExampleComponent;
