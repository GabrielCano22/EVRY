// Cold test-fixture preparation, not an API or application performance budget.
export function waitForBackendReady(child, { platform = process.platform, ci = process.env.CI } = {}) {
  return new Promise((accept, reject) => {
    // Owner-authorized local Windows allowance; every CI and other OS stays 30s.
    const timeout = platform === 'win32' && !ci ? 120000 : 30000;
    const timer = setTimeout(() => reject(new Error('Compiled backend initialization timed out.')), timeout);
    child.once('exit', () => { clearTimeout(timer); reject(new Error('Compiled backend exited before readiness.')); });
    child.once('message', (message) => {
      clearTimeout(timer);
      if (!message?.ready) reject(new Error('Compiled backend failed to initialize.'));
      else accept(message.ready);
    });
  });
}
