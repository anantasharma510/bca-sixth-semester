module.exports = function(api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'react' }],
      '@babel/preset-typescript',
    ],
    plugins: [
      // Required for react-native-reanimated
      'react-native-reanimated/plugin',
    ],
  };
};

