module.exports = function(api) {
  const isTest = api.env('test');
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-paper/babel',
      ...(isTest ? [] : ['react-native-reanimated/plugin'])
    ],
  };
};
