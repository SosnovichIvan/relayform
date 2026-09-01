import { describe, expect, it, vi } from 'vitest';
import { PostgresDeliveryRepository, type DeliveryDatabase } from './postgresDeliveryRepository.js';

function databaseWithClient(query: ReturnType<typeof vi.fn>) {
  const release = vi.fn();
  return { database: { connect: vi.fn().mockResolvedValue({ query, release }), query: vi.fn() } as DeliveryDatabase, release };
}

const input = { projectId: 'project-1', formId: 'form-1', eventId: 'event-1', destinationId: 'destination-1', idempotencyKey: 'key-1', provider: 'telegram' as const, recipient: '123', message: 'Lead' };

describe('PostgresDeliveryRepository', () => {
  it('creates submission, attempt and job in one transaction', async () => {
    const query = vi.fn().mockImplementation(async (sql: string) => sql.includes('RETURNING id') ? { rows: [{ id: 'attempt-1' }] } : { rows: [] });
    const { database, release } = databaseWithClient(query);
    await expect(new PostgresDeliveryRepository(database).accept(input)).resolves.toEqual({ attemptId: 'attempt-1', isNew: true });
    expect(query.mock.calls.map(([sql]) => sql)).toEqual(expect.arrayContaining(['BEGIN', 'COMMIT']));
    expect(query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO delivery_jobs'))).toBe(true);
    expect(release).toHaveBeenCalledOnce();
  });

  it('returns an existing attempt without creating a duplicate job', async () => {
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.startsWith('INSERT INTO delivery_attempts')) return { rows: [] };
      if (sql.startsWith('SELECT id FROM delivery_attempts')) return { rows: [{ id: 'existing-attempt' }] };
      return { rows: [] };
    });
    const { database } = databaseWithClient(query);
    await expect(new PostgresDeliveryRepository(database).accept(input)).resolves.toEqual({ attemptId: 'existing-attempt', isNew: false });
    expect(query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO delivery_jobs'))).toBe(false);
  });

  it('rolls back and releases the client after a transaction failure', async () => {
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.startsWith('INSERT INTO submissions')) throw new Error('database unavailable');
      return { rows: [] };
    });
    const { database, release } = databaseWithClient(query);
    await expect(new PostgresDeliveryRepository(database).accept(input)).rejects.toThrow('database unavailable');
    expect(query).toHaveBeenCalledWith('ROLLBACK');
    expect(release).toHaveBeenCalledOnce();
  });

  it('claims with SKIP LOCKED and persists safe outcomes', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ attemptId: 'attempt-1', provider: 'telegram', recipient: '123', message: 'Lead', attemptNumber: 1, maxAttempts: 5 }] })
      .mockResolvedValue({ rows: [] });
    const database = { query, connect: vi.fn() } as unknown as DeliveryDatabase;
    const repository = new PostgresDeliveryRepository(database);
    await expect(repository.claim('worker-1', 30_000)).resolves.toMatchObject({ attemptId: 'attempt-1', provider: 'telegram' });
    expect(query.mock.calls[0][0]).toContain('FOR UPDATE SKIP LOCKED');
    await repository.completeDelivered('attempt-1', 'message-1');
    await repository.completeFailed('attempt-2', 'providerUnavailable', true);
    await repository.rescheduleRetry('attempt-3', 'providerUnavailable', 2_000);
    expect(query.mock.calls[1][1]).toEqual(['attempt-1', 'delivered', 'message-1', '', false]);
    expect(query.mock.calls[2][1]).toEqual(['attempt-2', 'failed', '', 'providerUnavailable', true]);
    expect(query.mock.calls[3][1]).toEqual(['attempt-3', 'providerUnavailable', 2_000]);
  });

  it('loads only project-scoped sanitized status', async () => {
    const database = { query: vi.fn().mockResolvedValue({ rows: [{ id: 'attempt-1', status: 'failed', failureCode: 'providerUnavailable', isRetryable: true }] }), connect: vi.fn() } as unknown as DeliveryDatabase;
    await expect(new PostgresDeliveryRepository(database).getStatus('project-1', 'attempt-1')).resolves.toEqual({ id: 'attempt-1', status: 'failed', failureCode: 'providerUnavailable', isRetryable: true });
  });

  it('aggregates project statistics from safe grouped rows', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [
      { formId: 'form-1', provider: 'telegram', status: 'delivered', count: '2' },
      { formId: 'form-1', provider: 'telegram', status: 'failed', count: '1' },
      { formId: 'form-1', provider: 'email', status: 'queued', count: '3' },
    ] });
    const database = { query, connect: vi.fn() } as unknown as DeliveryDatabase;
    await expect(new PostgresDeliveryRepository(database).getStats('project-1', new Date('2026-01-01T00:00:00Z'))).resolves.toEqual({
      total: 6, delivered: 2, failed: 1, queued: 3,
      forms: [{ formId: 'form-1', total: 6, delivered: 2, failed: 1, queued: 3, providers: [
        { provider: 'telegram', total: 3, delivered: 2, failed: 1, queued: 0 },
        { provider: 'email', total: 3, delivered: 0, failed: 0, queued: 3 },
      ] }],
    });
    expect(query.mock.calls[0][0]).toContain('attempts.created_at >= $2');
    expect(query.mock.calls[0][1]).toEqual(['project-1', '2026-01-01T00:00:00.000Z']);
  });

  it('lists only sanitized failed delivery fields with a bounded query', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ id: 'attempt-1', formId: 'form-1', provider: 'telegram', failureCode: 'providerUnavailable', isRetryable: true, failedAt: '2026-01-01T00:00:00Z' }] });
    const database = { query, connect: vi.fn() } as unknown as DeliveryDatabase;
    await expect(new PostgresDeliveryRepository(database).listFailed('project-1', 20)).resolves.toHaveLength(1);
    expect(query.mock.calls[0][0]).not.toContain('jobs.message');
    expect(query.mock.calls[0][0]).not.toContain('jobs.recipient');
    expect(query.mock.calls[0][1]).toEqual(['project-1', 20]);
  });

  it('atomically resets and audits a failed delivery replay', async () => {
    const query = vi.fn().mockImplementation(async (sql: string) => sql.includes('FOR UPDATE')
      ? { rows: [{ status: 'failed', failureCode: 'providerUnavailable', attemptCount: 5 }] }
      : { rows: [] });
    const { database, release } = databaseWithClient(query);
    await expect(new PostgresDeliveryRepository(database).replayFailed('project-1', 'attempt-1', 'owner-1')).resolves.toBe('replayed');
    expect(query.mock.calls.map(([sql]) => String(sql))).toEqual(expect.arrayContaining(['BEGIN', 'COMMIT']));
    expect(query.mock.calls.some(([sql]) => String(sql).includes('attempt_count = 0'))).toBe(true);
    const auditCall = query.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO delivery_replay_audit'));
    expect(auditCall?.[1]?.slice(1)).toEqual(['attempt-1', 'project-1', 'owner-1', 'providerUnavailable', 5]);
    expect(release).toHaveBeenCalledOnce();
  });

  it.each([[undefined, 'notFound'], [{ status: 'queued', attemptCount: 0 }, 'notReplayable']] as const)('does not replay an unavailable state', async (row, expected) => {
    const query = vi.fn().mockImplementation(async (sql: string) => sql.includes('FOR UPDATE') ? { rows: row ? [row] : [] } : { rows: [] });
    const { database } = databaseWithClient(query);
    await expect(new PostgresDeliveryRepository(database).replayFailed('project-1', 'attempt-1', 'owner-1')).resolves.toBe(expected);
    expect(query.mock.calls.filter(([sql]) => String(sql).includes('delivery_replay_audit'))).toHaveLength(0);
  });

  it('rolls back a replay transaction failure', async () => {
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes('FOR UPDATE')) return { rows: [{ status: 'failed', failureCode: 'providerUnavailable', attemptCount: 5 }] };
      if (sql.startsWith('UPDATE delivery_attempts')) throw new Error('database unavailable');
      return { rows: [] };
    });
    const { database, release } = databaseWithClient(query);
    await expect(new PostgresDeliveryRepository(database).replayFailed('project-1', 'attempt-1', 'owner-1')).rejects.toThrow('database unavailable');
    expect(query).toHaveBeenCalledWith('ROLLBACK');
    expect(release).toHaveBeenCalledOnce();
  });
});
