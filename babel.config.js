module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Required for animations. MUST BE LAST.
      'react-native-reanimated/plugin',
    ],
  };
};