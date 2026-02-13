import { Appearance } from 'react-native';
import StorageAdapter from '@/core/storage/StorageAdapter';
import { UnistylesRuntime } from '@/infrastructure/theme';

export type ThemePreference = 'light' | 'dark' | 'system';

const THEME_PREFERENCE_STORAGE_KEY = 'themePreference';

const isThemePreference = (value: string | null): value is ThemePreference =>
  value === 'light' || value === 'dark' || value === 'system';

const getSystemTheme = (): 'light' | 'dark' =>
  Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';

const resolveTheme = (preference: ThemePreference): 'light' | 'dark' =>
  preference === 'system' ? getSystemTheme() : preference;

export const getThemePreference = (): ThemePreference => {
  const savedPreference = StorageAdapter.getItem(THEME_PREFERENCE_STORAGE_KEY);
  if (isThemePreference(savedPreference)) {
    return savedPreference;
  }
  return 'system';
};

export const applyThemePreference = (preference: ThemePreference) => {
  UnistylesRuntime.setTheme(resolveTheme(preference));
};

export const setThemePreference = (preference: ThemePreference) => {
  StorageAdapter.setItem(THEME_PREFERENCE_STORAGE_KEY, preference);
  applyThemePreference(preference);
};

export const subscribeToSystemThemeChange = (onThemeChange: () => void) => {
  const subscription = Appearance.addChangeListener(onThemeChange);
  return () => subscription.remove();
};
