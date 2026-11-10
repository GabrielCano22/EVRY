const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { test } = require('node:test');
const { parseAllDocuments } = require('yaml');

// Parse the real executable flow. These checks do not run Maestro or touch a
// phone; they protect the package/data-preservation boundary before execution.
const documents = parseAllDocuments(readFileSync(resolve(__dirname, '../.maestro/smoke.yaml'), 'utf8'));
for (const document of documents) assert.deepEqual(document.errors, []);
assert.equal(documents.length, 2);
const [configuration, commands] = documents.map(document => document.toJS());

test('Maestro smoke targets only the separate synthetic sandbox, never the owner app', () => {
  assert.equal(configuration.appId, 'com.gabrielcano.evry.contractqa',
    'The login smoke must not launch production or the preserved validation draft');
});

test('Maestro smoke declares no storage/keychain reset, permission override, or alternative package launch', () => {
  const forbidden = ['clearState', 'clearKeychain', 'resetApp', 'uninstallApp', 'permissions', 'runScript'];
  function inspect(value) {
    if (typeof value === 'string') {
      assert(!forbidden.includes(value), `Destructive standalone command: ${value}`);
      return;
    }
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) return value.forEach(inspect);
    for (const [key, child] of Object.entries(value)) {
      assert(!forbidden.includes(key),
        `Destructive or uninspected device operation: ${key}`);
      if (key === 'launchApp' && child !== null && child !== undefined) {
        assert.equal(typeof child, 'object', 'Do not launch an alternative package');
        assert(!('appId' in child), 'The flow must retain its isolated app ID');
      }
      if (key === 'runFlow') assert(!('file' in child), 'Inspect inline subcommands rather than delegate to an unchecked flow');
      inspect(child);
    }
  }
  assert(Array.isArray(commands) && commands.length > 0);
  inspect(configuration);
  inspect(commands);
});
