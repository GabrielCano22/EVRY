const expoPreset = require('jest-expo/jest-preset');
const babelTransformKey = '\\.[jt]sx?$';
const [babelTransformer, babelOptions] = expoPreset.transform[babelTransformKey];

module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.expo/',
    // npm posttest runs these suites with node --test. Jest 30 also discovers
    // .cjs tests by default, but it cannot report node:test assertions.
    String.raw`[/\\]scripts[/\\](?:native-theme|maestro-safety|metro-cache)\.test\.cjs$`,
  ],
  // The upstream Jest caller omits the Hermes engine and
  // otherwise selects Expo's legacy pre-SDK-56 downlevel profile. Keep the
  // complete Expo transformer, including Flow/codegen, with the native target.
  transform: {
    ...expoPreset.transform,
    [babelTransformKey]: [babelTransformer, {
      ...babelOptions,
      caller: { ...babelOptions.caller, engine: 'hermes' },
    }],
  },
  transformIgnorePatterns: [
    ...expoPreset.transformIgnorePatterns,
    // These upstream generated implementations are already executable CJS.
    // Run their real code unchanged; Flow sources and platform shims still
    // use the Expo transformer. Keep the exception exact and path-portable.
    String.raw`[/\\]node_modules[/\\]react-native[/\\]Libraries[/\\]Renderer[/\\]implementations[/\\]ReactFabric-(?:dev|prod)\.js$`,
  ],
};
