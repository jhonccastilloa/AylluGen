import { ReactNode, useEffect } from 'react';
import {
  applyThemePreference,
  getThemePreference,
  subscribeToSystemThemeChange,
} from '@/core/theme/themePreferences';

interface ThemeProviderProps {
  children: ReactNode;
}

const ThemeProvider = ({ children }: ThemeProviderProps) => {
  useEffect(() => {
    applyThemePreference(getThemePreference());
    const unsubscribe = subscribeToSystemThemeChange(() => {
      if (getThemePreference() === 'system') {
        applyThemePreference('system');
      }
    });

    return unsubscribe;
  }, []);

  return <>{children}</>;
};

export default ThemeProvider;
