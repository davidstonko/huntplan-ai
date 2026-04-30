/**
 * React Native configuration for HuntPlan AI / MDHuntFishOutdoors
 * @type {import('@react-native-community/cli-types').Config}
 */
const path = require('path');

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

  // Vector-icons fonts copied into iOS bundle at link time
  assets: ['./node_modules/react-native-vector-icons/Fonts'],

  // ── 2026-04-26: explicit autolinking overrides ──
  //
  // RN 0.76's stricter autolinker SKIPS packages that don't declare a
  // `react-native` config block in their own package.json. The 3 packages
  // below are older / unmaintained npm modules that pre-date that
  // requirement, but they each ship a working .podspec — we just have to
  // tell autolinking to use it.
  //
  // Without these overrides, the iOS binary builds but `RNFSManager`,
  // `ImagePickerManager`, and `RNShare` are all null on the native side.
  // Top-level imports (`import RNFS from 'react-native-fs'` etc.) then
  // try to construct `new NativeEventEmitter(null)` and crash the app at
  // boot — captured in the screenshot 2026-04-26.
  //
  // If a package later adopts proper RN config, drop its entry here.
  dependencies: {
    'react-native-fs': {
      platforms: {
        ios: {
          podspecPath: path.join(__dirname, 'node_modules/react-native-fs/RNFS.podspec'),
        },
      },
    },
    'react-native-image-picker': {
      platforms: {
        ios: {
          podspecPath: path.join(
            __dirname,
            'node_modules/react-native-image-picker/react-native-image-picker.podspec',
          ),
        },
      },
    },
    'react-native-share': {
      platforms: {
        ios: {
          podspecPath: path.join(__dirname, 'node_modules/react-native-share/RNShare.podspec'),
        },
      },
    },
  },
};
