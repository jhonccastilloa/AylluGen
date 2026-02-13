import { View, Text, TouchableOpacity } from 'react-native';
import {
  StyleSheet,
  UnistylesRuntime,
  useUnistyles,
} from 'react-native-unistyles';

const ThemeToggle = () => {
  const { theme } = useUnistyles();

  const toggleTheme = () => {
    UnistylesRuntime.setTheme(theme.name === 'light' ? 'dark' : 'light');
  };

  const cycleThemes = () => {
    UnistylesRuntime.setTheme(theme.name === 'light' ? 'dark' : 'light');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Current: {theme.name}</Text>
      <TouchableOpacity style={styles.button} onPress={toggleTheme}>
        <Text style={styles.buttonText}>Toggle Theme Mode</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, styles.secondaryButton]}
        onPress={cycleThemes}
      >
        <Text style={styles.buttonText}>Switch {theme.name}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create(theme => ({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
  },
  text: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.md,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  secondaryButton: {
    backgroundColor: theme.colors.secondary,
    marginLeft: theme.spacing.sm,
  },
  buttonText: {
    color: theme.colors.onPrimary,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
  },
}));

export default ThemeToggle;
