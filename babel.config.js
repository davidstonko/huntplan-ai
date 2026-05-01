module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // react-native-dotenv loads `.env` at build time and exposes named
    // imports under `@env`. We use it for secrets that must not be
    // committed (Mapbox token, future API keys). The `.env` file is
    // gitignored — see project root .gitignore.
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
        safe: false,
        allowUndefined: false, // throw at import time if a key is missing
      },
    ],
  ],
};
