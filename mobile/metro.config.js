const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable package exports for Better Auth
config.resolver.unstable_enablePackageExports = true;

// Add resolver configuration to help with Better Auth dependencies
config.resolver = {
  ...config.resolver,
  alias: {
    ...config.resolver.alias,
  },
  resolverMainFields: ['react-native', 'browser', 'main'],
};

// Add transformer configuration
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

module.exports = config; 