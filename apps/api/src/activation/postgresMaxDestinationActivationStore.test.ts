import { describe, expect, it, vi } from 'vitest';
import type { PostgresExecutor } from '../identity/postgresIdentityStore.js';
import { PostgresMaxDestinationActivationStore } from './postgresMaxDestinationActivationStore.js';

describe('PostgresMaxDestinationActivationStore', () => {
  it('upserts an activation and atomically activates a MAX destination', async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ id: 'destination' }] });
    const store = new PostgresMaxDestinationActivationStore({ query } as PostgresExecutor);
    await store.issue('owner', 'destination', 'digest', new Date('2026-01-01T00:15:00Z'));
    await expect(store.consume('digest', '100', new Date('2026-01-01T00:00:00Z'))).resolves.toBe(true);
    expect(query.mock.calls[0]?.[0]).toContain('ON CONFLICT (destination_id)');
    expect(query.mock.calls[1]?.[0]).toContain("destinations.provider = 'max'");
  });

  it('reports an unknown or expired digest', async () => {
    const store = new PostgresMaxDestinationActivationStore({ query: vi.fn().mockResolvedValue({ rows: [] }) } as PostgresExecutor);
    await expect(store.consume('missing', '100', new Date())).resolves.toBe(false);
  });
});
