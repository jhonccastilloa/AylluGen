export const colors = {
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
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const icon = {
  size: {
    xs: 16,
    sm: 24,
    md: 32,
    lg: 40,
    xl: 48,
    xxl: 56,
    xxxl: 64,
  },
} as const;
export const typography = {
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
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;

export const breakpoints = {
  sm: 375,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

export type Spacing = (typeof spacing)[keyof typeof spacing];
export type BorderRadius = (typeof borderRadius)[keyof typeof borderRadius];
export type Color = (typeof colors)[keyof typeof colors];
export type FontSize =
  (typeof typography.fontSize)[keyof typeof typography.fontSize];
export type FontWeight =
  (typeof typography.fontWeight)[keyof typeof typography.fontWeight];

export type IconSizeTheme = keyof typeof icon.size;
export type ColorTheme = keyof typeof colors;
