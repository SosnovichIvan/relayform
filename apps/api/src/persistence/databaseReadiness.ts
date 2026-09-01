import { Pool } from 'pg';

type Queryable = { query(sql: string): Promise<unknown>; end(): Promise<void> };

export function createDatabaseReadiness(databaseUrl: string | undefined, createPool: (connectionString: string) => Queryable = (connectionString) => new Pool({ connectionString })) {
  if (!databaseUrl) return { check: async () => true, close: async () => undefined };
  const pool = createPool(databaseUrl);
  return {
    check: async () => {
      try {
        await pool.query('SELECT 1');
        return true;
      } catch {
        return false;
      }
    },
    close: async () => pool.end(),
  };
}
