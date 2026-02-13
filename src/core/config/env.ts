type Environment = 'development' | 'staging' | 'production';

const getEnv = (): Environment => {
  if (__DEV__) return 'development';
  return 'production';
};

const config = {
  env: getEnv(),
  apiBaseUrl: __DEV__
    ? 'https://dhyrium.online/ayllugen/api'
    : 'https://dhyrium.online/ayllugen/api',
  apiTimeout: 30000,
  enableLogging: __DEV__,
  mmkv: {
    encryptionKey: __DEV__ ? '' : 'your-encryption-key',
  },
} as const;

export default config;
