const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('node:path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  // Workspace packages and pnpm symlink targets must be visible to Metro.
  watchFolders: [path.resolve(__dirname, '../..')],
  resolver: {
    // Babel helpers emitted for workspace files resolve from the mobile runtime.
    nodeModulesPaths: [path.resolve(__dirname, 'node_modules')],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
