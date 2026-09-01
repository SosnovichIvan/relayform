import { describe, expect, it, vi } from 'vitest';
import type { PostgresExecutor } from '../identity/postgresIdentityStore.js';
import { PostgresEmailVerificationStore } from './postgresEmailVerificationStore.js';

const record = { id: 'verification-1', projectId: 'project-1', templateId: 'template-1', recipientEmail: 'user@example.ru', tokenDigest: 'digest', idempotencyKey: 'request-1', redirectUrl: 'https://example.ru/done', status: 'pending' as const, expiresAt: '2026-01-01T00:15:00.000Z' };

describe('PostgresEmailVerificationStore', () => {
  it('inserts a new verification and updates delivery state', async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [record] }).mockResolvedValue({ rows: [] });
    const store = new PostgresEmailVerificationStore({ query } as PostgresExecutor);
    await expect(store.issue(record)).resolves.toEqual({ record, isNew: true });
    await store.markSent(record.id);
    await store.markFailed(record.id);
    expect(query.mock.calls[0][0]).toContain('ON CONFLICT');
    expect(query.mock.calls[1][1]).toEqual(['sent', record.id, 'pending']);
    expect(query.mock.calls[2][1]).toEqual(['failed', record.id, 'pending']);
  });

  it('returns an existing idempotent verification', async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ ...record, status: 'sent' }] });
    const store = new PostgresEmailVerificationStore({ query } as PostgresExecutor);
    await expect(store.issue(record)).resolves.toMatchObject({ isNew: false, record: { status: 'sent' } });
  });

  it('atomically consumes and classifies non-consumable tokens', async () => {
    const now = new Date('2026-01-01T00:10:00Z');
    const successful = new PostgresEmailVerificationStore({ query: vi.fn().mockResolvedValue({ rows: [{ redirectUrl: 'https://example.ru/done' }] }) } as PostgresExecutor);
    await expect(successful.consume('digest', now)).resolves.toEqual({ status: 'confirmed', redirectUrl: 'https://example.ru/done' });
    for (const [row, status] of [
      [undefined, 'invalid'],
      [{ status: 'pending', expiresAt: '2026-01-01T00:15:00Z' }, 'invalid'],
      [{ status: 'failed', expiresAt: '2026-01-01T00:15:00Z' }, 'invalid'],
      [{ status: 'confirmed', expiresAt: '2026-01-01T00:15:00Z' }, 'alreadyUsed'],
      [{ status: 'sent', expiresAt: '2026-01-01T00:05:00Z' }, 'expired'],
      [{ status: 'sent', expiresAt: '2026-01-01T00:15:00Z' }, 'invalid'],
    ] as const) {
      const query = vi.fn().mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: row ? [row] : [] });
      await expect(new PostgresEmailVerificationStore({ query } as PostgresExecutor).consume('digest', now)).resolves.toEqual({ status });
    }
  });
});
