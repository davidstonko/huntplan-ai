/**
 * React Native configuration for HuntPlan AI
 * @type {import('@react-native-community/cli-types').Config}
 */
module.exports = {
  // Disable codegen for this project (using old architecture)
  project: {
    ios: {
      sourceDir: './ios',
    },
    android: {
      sourceDir: './android',
    },
  },
};
