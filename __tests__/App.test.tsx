/**
 * @format
 */

jest.mock('react-native-unistyles', () => {
  const theme = {
    colors: {
      background: '#ffffff',
      surface: '#f8fafc',
      surfaceVariant: '#f1f5f9',
      overlay: 'rgba(15, 23, 42, 0.45)',
      text: '#0f172a',
      textSecondary: '#475569',
      textDisabled: '#94a3b8',
      inputPlaceholder: '#94a3b8',
      border: '#e2e8f0',
      divider: '#f1f5f9',
      onPrimary: '#ffffff',
      onSecondary: '#ffffff',
      onError: '#ffffff',
      successSoft: 'rgba(16, 185, 129, 0.16)',
      successSoftBorder: 'rgba(16, 185, 129, 0.36)',
      warningSoft: 'rgba(245, 158, 11, 0.16)',
      warningSoftBorder: 'rgba(245, 158, 11, 0.36)',
      errorSoft: 'rgba(239, 68, 68, 0.16)',
      errorSoftBorder: 'rgba(239, 68, 68, 0.36)',
      primary: '#1d4ed8',
      primaryLight: '#3b82f6',
      primaryDark: '#1e40af',
      secondary: '#16a34a',
      secondaryLight: '#22c55e',
      secondaryDark: '#15803d',
      success: '#10b981',
      successLight: '#34d399',
      successDark: '#059669',
      warning: '#f59e0b',
      warningLight: '#fbbf24',
      warningDark: '#d97706',
      error: '#ef4444',
      errorLight: '#f87171',
      errorDark: '#dc2626',
      info: '#3b82f6',
      infoLight: '#60a5fa',
      infoDark: '#2563eb',
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
      xxl: 48,
      xxxl: 64,
    },
    borderRadius: {
      sm: 4,
      md: 8,
      lg: 12,
      xl: 16,
      full: 9999,
    },
    typography: {
      fontSize: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
        xl: 20,
        xxl: 24,
        xxxl: 32,
        display: 48,
      },
      fontWeight: {
        regular: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
    },
    breakpoints: {
      sm: 375,
      md: 768,
      lg: 1024,
      xl: 1280,
    },
    shadows: {
      xs: {},
      sm: {},
      md: {},
      lg: {},
      xl: {},
    },
    icon: {
      size: {
        xs: 16,
        sm: 24,
        md: 32,
        lg: 40,
        xl: 48,
        xxl: 56,
        xxxl: 64,
      },
    },
    name: 'light',
  };

  return {
    StyleSheet: {
      create: (factory: (arg: unknown) => unknown) =>
        factory({ ...theme, theme }),
      configure: jest.fn(),
    },
    useUnistyles: () => ({ theme }),
    UnistylesRuntime: {
      setTheme: jest.fn(),
    },
  };
});

jest.mock('@react-native-community/netinfo', () => {
  const state = {
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  };

  const fetch = jest.fn(async () => state);
  const addEventListener = jest.fn(
    (listener: (snapshot: typeof state) => void) => {
      listener(state);
      return () => undefined;
    },
  );

  return {
    __esModule: true,
    default: {
      fetch,
      addEventListener,
    },
    fetch,
    addEventListener,
  };
});

jest.mock('react-native-mmkv', () => ({
  createMMKV: () => ({
    getString: jest.fn(() => null),
    set: jest.fn(),
    remove: jest.fn(),
  }),
  MMKV: class {},
}));

jest.mock('react-native-toast-message', () => {
  const Toast = () => null;
  Toast.show = jest.fn();
  return Toast;
});

jest.mock('@react-navigation/native', () => {
  return {
    DefaultTheme: {
      dark: false,
      colors: {
        background: '#fff',
        primary: '#1d4ed8',
        text: '#0f172a',
        card: '#f8fafc',
        border: '#e2e8f0',
        notification: '#ef4444',
      },
    },
    NavigationContainer: ({ children }: { children: unknown }) => children,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
    }),
  };
});

jest.mock('@react-navigation/native-stack', () => {
  return {
    createNativeStackNavigator: () => ({
      Navigator: ({ children }: { children: unknown }) => children,
      Screen: ({ children }: { children?: unknown }) => children ?? null,
    }),
  };
});

jest.mock('@react-navigation/bottom-tabs', () => {
  return {
    createBottomTabNavigator: () => ({
      Navigator: ({ children }: { children: unknown }) => children,
      Screen: ({ children }: { children?: unknown }) => children ?? null,
    }),
  };
});

const mockFeatureContainer = {
  animals: {
    listInventory: jest.fn(async () => []),
    registerAnimal: jest.fn(async () => ({
      id: 'animal-1',
      crotal: 'TEST-1',
      sex: 'MALE',
      species: 'ALPACA',
    })),
  },
  breedings: {
    calculateMatch: jest.fn(async () => ({
      coi: 0.01,
      riskLevel: 'GREEN',
      relationship: 'none',
      recommendation: 'ok',
    })),
    createBreeding: jest.fn(async () => ({ id: 'breeding-1' })),
  },
  sync: {
    hydrateSyncState: jest.fn(async () => undefined),
    syncNow: jest.fn(async () => undefined),
  },
  health: {},
  production: {},
  users: {},
};

jest.mock('@/features/container', () => ({
  __esModule: true,
  default: mockFeatureContainer,
  featureContainer: mockFeatureContainer,
}));

jest.mock('@/features/getFeatureContainer', () => ({
  getFeatureContainer: () => mockFeatureContainer,
}));

jest.mock('../src/presentation/providers/BackendHealthProvider', () => () => null);

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../src/App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
