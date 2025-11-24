const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getSentryExpoConfig(__dirname);

// Configure SVG transformer
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

config.resolver = {
  ...config.resolver,
  assetExts: config.resolver.assetExts.filter(ext => ext !== 'svg'),
  sourceExts: [...config.resolver.sourceExts, 'svg'],

  // Resolve shared packages correctly and ensure single React instance
  extraNodeModules: new Proxy(
    {},
    {
      get: (target, name) => {
        if (name === 'react' || name === 'react-native') {
          // Force all packages to use the mobile app's React/React Native
          return path.join(__dirname, `node_modules/${name}`);
        }
        return path.join(__dirname, `node_modules/${name}`);
      },
    }
  ),
};

// Watch workspace packages
config.watchFolders = [path.resolve(__dirname, '../..')];

module.exports = config;
