import { describe, expect, it } from 'vitest';
import { applyMigrations, type SqlExecutor } from './migrationRunner.js';

describe('applyMigrations', () => {
  it('applies only unapplied migrations in version order', async () => {
    const calls: Array<{ sql: string; values?: string[] }> = [];
    const executor: SqlExecutor = { query: async (sql, values) => {
      calls.push({ sql, values });
      return sql === 'SELECT version FROM schema_migrations' ? { rows: [{ version: '001' }] } : { rows: [] };
    } };
    await expect(applyMigrations(executor, [{ version: '002', sql: 'second' }, { version: '001', sql: 'first' }])).resolves.toEqual(['002']);
    expect(calls).toEqual([
      { sql: 'CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())' },
      { sql: 'SELECT version FROM schema_migrations' },
      { sql: 'second' },
      { sql: 'INSERT INTO schema_migrations (version) VALUES ($1)', values: ['002'] },
    ]);
  });
});
