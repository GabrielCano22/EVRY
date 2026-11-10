import { spawnSync } from 'node:child_process';
import { join, normalize } from 'node:path';
import { createScriptTransformer } from '@jest/transform';
import { runInNewContext } from 'node:vm';

let transformer: Awaited<ReturnType<typeof createScriptTransformer>>;
beforeAll(async () => {
  const result = spawnSync(process.execPath, [require.resolve('jest/bin/jest'), '--showConfig'], {
    cwd: process.cwd(), encoding: 'utf8',
  });
  if (result.status !== 0) throw new Error(result.stderr);
  transformer = await createScriptTransformer(JSON.parse(result.stdout).configs[0]);
});

// A missing or over-broad optimization changes these actual normalized Jest
// decisions. No component/transformer is mocked or dependency prewarmed.
it.each(['dev', 'prod'])('executes generated ReactFabric-%s JavaScript without a redundant Babel transform', variant => {
  const filename = require.resolve(`react-native/Libraries/Renderer/implementations/ReactFabric-${variant}.js`);
  expect(spawnSync(process.execPath, ['--check', filename], { encoding: 'utf8' }).status).toBe(0);
  expect(transformer.shouldTransform(filename)).toBe(false);
});

it.each([
  'react-native/Libraries/Renderer/shims/ReactFabric.js',
  'react-native/Libraries/ReactNative/RendererImplementation.js',
  'react-native/Libraries/Components/TextInput/TextInput.js',
])('retains required native source transformation for %s', module => {
  expect(transformer.shouldTransform(require.resolve(module))).toBe(true);
});

it.each([
  'app/(tabs)/profile.tsx', 'src/profile/use-readiness-day.ts',
  'src/ReactFabric-dev.js', 'src/ReactFabric-prod.js',
  'node_modules/react-native/Libraries/Renderer/implementations/ReactFabric-dev.js.backup',
  'node_modules/react-native/Libraries/Renderer/implementations/ReactFabric-custom.js',
  'node_modules/react-native/Libraries/Renderer/implementations/ReactFabric-dev.ts',
])('does not bypass required transformation for %s', filename => {
  expect(transformer.shouldTransform(join(process.cwd(), filename))).toBe(true);
});

it('preserves the Expo preset exclusion for ordinary compiled dependencies', () => {
  expect(transformer.shouldTransform(require.resolve('react'))).toBe(false);
});

it('preserves private class state when transforming native Flow for the current mobile runtime', async () => {
  const filename = require.resolve('react-native/Libraries/Components/View/View.js');
  const source = `
    class Account {
      #credential: string = 'private-value';
      visible: number = 1;
      async value(): Promise<string> { return this.#credential; }
    }
    module.exports = async () => {
      const account = new Account();
      return { names: Object.getOwnPropertyNames(account), value: await account.value() };
    };
  `;
  const transformed = transformer.transformSource(filename, source, {
    instrument: false, supportsDynamicImport: false, supportsExportNamespaceFrom: false,
    supportsStaticESM: false, supportsTopLevelAwait: false,
  });
  const nativeModule = { exports: undefined as unknown };
  runInNewContext(transformed.code, { module: nativeModule, require });
  const inspect = nativeModule.exports as () => Promise<{ names: string[]; value: string }>;
  expect(await inspect()).toEqual({ names: ['visible'], value: 'private-value' });
});

it.each([
  '/home/runner/work/EVRY/node_modules/react-native/Libraries/Renderer/implementations/ReactFabric-dev.js',
  String.raw`D:\local\EVRY\node_modules\react-native\Libraries\Renderer\implementations\ReactFabric-prod.js`,
])('matches only generated renderer paths across supported hosts: %s', filename => {
  // Jest normalizes regex separators for its host; runtime filenames use
  // that host's canonical path representation, not foreign raw separators.
  expect(transformer.shouldTransform(normalize(filename))).toBe(false);
});
