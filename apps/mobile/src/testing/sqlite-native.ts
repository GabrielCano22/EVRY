// Test-only bridge: actual SQLite statements and transactions, no device files.
export function createSQLiteBridge() {
  const { DatabaseSync } = jest.requireActual('node:sqlite');
  const connections = new Map<string, ReturnType<typeof open>>();
  function open() {
    const sqlite = new DatabaseSync(':memory:');
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
      if (!connections.has(name)) connections.set(name, open());
      return connections.get(name)!;
    },
  };
}
