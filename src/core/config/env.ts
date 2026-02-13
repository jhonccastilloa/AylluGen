type Environment = 'development' | 'staging' | 'production';

const getEnv = (): Environment => {
  if (__DEV__) return 'development';
  return 'production';
};

const config = {
  env: getEnv(),
  apiBaseUrl: __DEV__
    ? 'http://192.168.6.102:3000/api'
    : 'https://dhyrium.online/allugen/api',
  apiTimeout: 30000,
  enableLogging: __DEV__,
  mmkv: {
    encryptionKey: __DEV__ ? '' : 'your-encryption-key',
  },
} as const;

export default config;
