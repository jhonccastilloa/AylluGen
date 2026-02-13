import { View, Text, Pressable } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

const ExampleResponsiveComponent = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Responsive Example</Text>
      <Pressable style={styles.button}>
        <Text style={styles.buttonText}>Click Me</Text>
      </Pressable>
      <View style={styles.grid}>
        <View style={styles.gridItem}>
          <Text>Item 1</Text>
        </View>
        <View style={styles.gridItem}>
          <Text>Item 2</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create(theme => ({
  container: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  button: {
    padding: theme.spacing.md,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
  },
  buttonText: {
    color: theme.colors.onPrimary,
    textAlign: 'center',
    fontSize: 16,
  },
  grid: {
    flexDirection: 'row',
    gap: 8,
  },
  gridItem: {
    flex: 1,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
  },
}));

export default ExampleResponsiveComponent;
