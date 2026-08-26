module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    // react-native-worklets/plugin must stay LAST — Reanimated 4 requires it
    // and it has to run after every other transform.
    plugins: ['react-native-worklets/plugin'],
  };
};
