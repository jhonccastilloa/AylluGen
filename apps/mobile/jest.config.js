module.exports = {
  preset: 'react-native',
  modulePaths: ['<rootDir>/node_modules'],
  // pnpm resolves React Native through node_modules/.pnpm before its package path.
  transformIgnorePatterns: ['node_modules/(?!\\.pnpm/|@?react-native|@nozbe/)'],
};
