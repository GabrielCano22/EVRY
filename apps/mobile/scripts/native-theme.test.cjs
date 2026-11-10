// Exercise EVRY's actual generated Android configuration, not a mocked plugin
// or a package-name assertion. Removing native appearance support must fail.
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { dirname, resolve } = require('node:path');
const { test } = require('node:test');

let firstInspection = true;
function nativeConfig() {
  const root = resolve(__dirname, '..');
  const cli = resolve(dirname(require.resolve('expo/package.json')), 'bin/cli');
  // Only the first native-tool startup on local Windows receives the approved
  // cold allowance. Keep CI and the two subsequent invocations at 30 seconds.
  const timeout = firstInspection && process.platform === 'win32' && !process.env.CI ? 120_000 : 30_000;
  firstInspection = false;
  const run = spawnSync(process.execPath, [cli, 'config', '--type', 'introspect', '--json'], {
    cwd: root, encoding: 'utf8', windowsHide: true, timeout,
    env: { ...process.env, EXPO_NO_TELEMETRY: '1' },
  });
  assert.ifError(run.error);
  assert.equal(run.status, 0, 'Expo must generate inspectable native configuration');
  return JSON.parse(run.stdout);
}

test('EVRY generates the Android dark appearance consumed by the native host', () => {
  const config = nativeConfig();
  const strings = config._internal.modResults.android.strings.resources.string;
  const appearance = strings.find(item => item.$.name === 'expo_system_ui_user_interface_style');
  assert.equal(appearance?._, 'dark', 'EVRY must not silently ignore its Android dark appearance');
});

test('EVRY keeps internal storage and haptics without requesting external storage or overlays', () => {
  const config = nativeConfig();
  const permissions = config._internal.modResults.android.manifest.manifest['uses-permission'];
  const requested = permissions.filter(item => item.$['tools:node'] !== 'remove')
    .map(item => item.$['android:name']);
  const unnecessary = ['android.permission.READ_EXTERNAL_STORAGE',
    'android.permission.WRITE_EXTERNAL_STORAGE', 'android.permission.SYSTEM_ALERT_WINDOW'];
  assert.deepEqual(requested.filter(name => unnecessary.includes(name)), [],
    'EVRY has no shared-storage or cross-application overlay feature');
  assert.ok(requested.includes('android.permission.INTERNET'), 'API synchronization must retain network access');
  assert.ok(requested.includes('android.permission.VIBRATE'), 'Native training haptics must remain available');
});

test('EVRY generates release code and resource shrinking for the Android host', () => {
  const config = nativeConfig();
  const properties = new Map(config._internal.modResults.android.gradleProperties
    .filter(item => item.type === 'property').map(item => [item.key, item.value]));
  assert.equal(properties.get('android.enableMinifyInReleaseBuilds'), 'true',
    'Release must not retain unused native code');
  assert.equal(properties.get('android.enableShrinkResourcesInReleaseBuilds'), 'true',
    'Release must not retain unused native resources');
});

test('EVRY Android releases target the installed package without a version downgrade', () => {
  const { android } = require('../app.json').expo;
  assert.equal(android.package, 'com.gabrielcano.evry.local');
  assert.ok(Number.isInteger(android.versionCode) && android.versionCode >= 3);
});
