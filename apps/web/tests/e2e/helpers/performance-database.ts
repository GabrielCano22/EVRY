export function assertLocalPerformanceDatabase(testUrl: string | undefined, runtimeUrl: string | undefined) {
  if (!testUrl?.trim()) throw new Error('TEST_DATABASE_URL is required');
  const localHosts = new Set(['127.0.0.1', 'localhost', '[::1]']);
  const parse = (value: string) => {
    const parsed = new URL(value);
    const database = decodeURIComponent(parsed.pathname.slice(1)).toLowerCase();
    if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !database || database.includes('/') || parsed.hash) {
      throw new Error('Invalid PostgreSQL fixture identity');
    }
    for (const [key, value] of parsed.searchParams) {
      if (key !== 'schema' || value !== 'public') throw new Error('Connection overrides are forbidden');
    }
    return { host: parsed.hostname.toLowerCase().replace(/\.$/, ''), port: parsed.port || '5432', database };
  };
  const test = parse(testUrl.trim());
  if (!localHosts.has(test.host) || !/(^|[^a-z0-9])test([^a-z0-9]|$)/.test(test.database)) {
    throw new Error('Requires an explicit loopback test database');
  }
  if (runtimeUrl?.trim()) {
    const runtime = parse(runtimeUrl.trim());
    if (localHosts.has(runtime.host) && runtime.port === test.port && runtime.database === test.database) {
      throw new Error('TEST_DATABASE_URL must be different from DATABASE_URL, including loopback aliases');
    }
  }
  return testUrl.trim();
}
