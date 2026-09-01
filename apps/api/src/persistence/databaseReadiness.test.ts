import { describe, expect, it, vi } from 'vitest';
import { createDatabaseReadiness } from './databaseReadiness.js';

describe('createDatabaseReadiness', () => {
  it('does not require a database in isolated in-memory runtime', async () => {
    await expect(createDatabaseReadiness(undefined).check()).resolves.toBe(true);
  });

  it('checks and closes a configured database pool', async () => {
    const query = vi.fn().mockResolvedValue({});
    const end = vi.fn().mockResolvedValue(undefined);
    const readiness = createDatabaseReadiness('postgresql://relayform', () => ({ query, end }));
    await expect(readiness.check()).resolves.toBe(true);
    await readiness.close();
    expect(query).toHaveBeenCalledWith('SELECT 1');
    expect(end).toHaveBeenCalledOnce();
  });

  it('reports an unavailable configured database without leaking the failure', async () => {
    const readiness = createDatabaseReadiness('postgresql://relayform', () => ({ query: vi.fn().mockRejectedValue(new Error('password=secret')), end: vi.fn().mockResolvedValue(undefined) }));
    await expect(readiness.check()).resolves.toBe(false);
  });
});
