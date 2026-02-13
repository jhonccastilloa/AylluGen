import { DefaultTheme, type Theme as NavigationTheme } from '@react-navigation/native';
import StackNavigator from './StackNavigator';
import { useUnistyles } from 'react-native-unistyles';

const MainNavigator = () => {
  const { theme } = useUnistyles();
  const myTheme: NavigationTheme = {
    ...DefaultTheme,
    dark: theme.name === 'dark',
    colors: {
      ...DefaultTheme.colors,
      background: theme.colors.background,
      primary: theme.colors.primary,
      text: theme.colors.text,
      card: theme.colors.surface,
      border: theme.colors.border,
    },
  };
  return <StackNavigator theme={myTheme} />;
};

export default MainNavigator;
