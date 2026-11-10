// Test-only bridge: actual SQLite statements and transactions, no device files.
// Explicit synthetic directories support process-restart integration; the
// default remains isolated memory for existing tests.
export function createSQLiteBridge(directory?: string) {
  const { DatabaseSync } = jest.requireActual('node:sqlite');
  const connections = new Map<string, ReturnType<typeof open>>();
  function open(name: string) {
    const filename = directory ? jest.requireActual('node:path').resolve(directory, name) : ':memory:';
    const sqlite = new DatabaseSync(filename);
    return {
      execAsync: async (sql: string) => sqlite.exec(sql),
      getFirstAsync: async (sql: string, ...params: unknown[]) => sqlite.prepare(sql).get(...params) ?? null,
      getAllAsync: async (sql: string, ...params: unknown[]) => sqlite.prepare(sql).all(...params),
      runAsync: async (sql: string, ...params: unknown[]) => sqlite.prepare(sql).run(...params),
      withTransactionAsync: async (operation: () => Promise<void>) => {
        sqlite.exec('BEGIN');
        try { await operation(); sqlite.exec('COMMIT'); }
        catch (error) { sqlite.exec('ROLLBACK'); throw error; }
      },
    };
  }
  return {
    openDatabaseAsync: async (name: string) => {
      if (directory && !/^[a-zA-Z0-9_-]+\.db$/.test(name)) throw new Error('Unsafe synthetic database name.');
      if (!connections.has(name)) connections.set(name, open(name));
      return connections.get(name)!;
    },
  };
}
