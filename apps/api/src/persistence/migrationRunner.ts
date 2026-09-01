export type Migration = { version: string; sql: string };

export type SqlExecutor = {
  query(sql: string, values?: string[]): Promise<{ rows: Array<{ version: string }> }>;
};

export async function applyMigrations(executor: SqlExecutor, migrations: Migration[]): Promise<string[]> {
  await executor.query('CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const applied = new Set((await executor.query('SELECT version FROM schema_migrations')).rows.map(({ version }) => version));
  const completed: string[] = [];
  for (const migration of [...migrations].sort((left, right) => left.version.localeCompare(right.version))) {
    if (applied.has(migration.version)) continue;
    await executor.query(migration.sql);
    await executor.query('INSERT INTO schema_migrations (version) VALUES ($1)', [migration.version]);
    completed.push(migration.version);
  }
  return completed;
}
