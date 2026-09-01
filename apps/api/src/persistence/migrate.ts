import { readdir, readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { applyMigrations, type Migration } from './migrationRunner.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required for migrations');

const migrationsDirectory = new URL('../../migrations/', import.meta.url);
const migrationFiles = (await readdir(migrationsDirectory)).filter((file) => /^\d+_.+\.sql$/.test(file)).sort();
const migrations: Migration[] = await Promise.all(migrationFiles.map(async (file) => ({
  version: file.slice(0, file.indexOf('_')),
  sql: await readFile(new URL(`../../migrations/${file}`, import.meta.url), 'utf8'),
})));
const pool = new Pool({ connectionString: databaseUrl });
try {
  const applied = await applyMigrations(pool, migrations);
  console.log(`Applied ${applied.length} Relayform migration(s).`);
} finally {
  await pool.end();
}
