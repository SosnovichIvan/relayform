import { describe, expect, it, vi } from 'vitest';
import type { PostgresExecutor } from '../identity/postgresIdentityStore.js';
import { PostgresEmailDestinationActivationStore } from './postgresEmailDestinationActivationStore.js';

describe('PostgresEmailDestinationActivationStore', () => {
  it('upserts and invalidates an activation', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const store = new PostgresEmailDestinationActivationStore({ query } as PostgresExecutor);
    await store.issue('owner-1', 'destination-1', 'digest', new Date('2026-01-01T00:15:00Z'));
    await store.invalidate('destination-1');
    expect(query.mock.calls[0][0]).toContain('ON CONFLICT (destination_id)');
    expect(query.mock.calls[0][1]).toEqual(['destination-1', 'owner-1', 'digest', 'pending', '2026-01-01T00:15:00.000Z']);
    expect(query.mock.calls[1][1]).toEqual(['failed', 'destination-1', 'pending']);
  });

  it('atomically activates a current token', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ id: 'destination-1' }] });
    const store = new PostgresEmailDestinationActivationStore({ query } as PostgresExecutor);
    await expect(store.consume('digest', new Date('2026-01-01T00:01:00Z'))).resolves.toEqual({ status: 'confirmed' });
    expect(query.mock.calls[0][0]).toContain("UPDATE destinations SET status = 'active'");
  });

  it.each([
    [undefined, 'invalid'],
    [{ status: 'failed', expiresAt: '2026-01-01T00:15:00Z' }, 'invalid'],
    [{ status: 'confirmed', expiresAt: '2026-01-01T00:15:00Z' }, 'alreadyUsed'],
    [{ status: 'pending', expiresAt: '2026-01-01T00:00:00Z' }, 'expired'],
    [{ status: 'pending', expiresAt: '2026-01-01T00:15:00Z' }, 'invalid'],
  ] as const)('classifies %o as %s', async (row, status) => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: row ? [row] : [] });
    const store = new PostgresEmailDestinationActivationStore({ query } as PostgresExecutor);
    await expect(store.consume('digest', new Date('2026-01-01T00:01:00Z'))).resolves.toEqual({ status });
  });
});
