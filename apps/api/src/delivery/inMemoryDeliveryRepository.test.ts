import { describe, expect, it } from 'vitest';
import { InMemoryDeliveryRepository } from './inMemoryDeliveryRepository.js';

const input = { projectId: 'project-1', formId: 'form-1', eventId: 'event-1', destinationId: 'destination-1', idempotencyKey: 'key-1', provider: 'telegram' as const, recipient: '123', message: 'Lead' };

describe('InMemoryDeliveryRepository', () => {
  it('accepts atomically and suppresses a project-scoped duplicate', async () => {
    const repository = new InMemoryDeliveryRepository();
    const first = await repository.accept(input);
    expect(first.isNew).toBe(true);
    await expect(repository.accept(input)).resolves.toEqual({ attemptId: first.attemptId, isNew: false });
    await expect(repository.accept({ ...input, projectId: 'project-2' })).resolves.toMatchObject({ isNew: true });
  });

  it('leases, recovers and completes jobs', async () => {
    let currentTime = 1_000;
    const repository = new InMemoryDeliveryRepository(() => currentTime);
    const accepted = await repository.accept(input);
    await expect(repository.claim('worker-1', 5_000)).resolves.toMatchObject({ attemptId: accepted.attemptId, recipient: '123', message: 'Lead', attemptNumber: 1, maxAttempts: 5 });
    await expect(repository.claim('worker-2', 5_000)).resolves.toBeUndefined();
    currentTime = 6_000;
    await expect(repository.claim('worker-2', 5_000)).resolves.toMatchObject({ attemptId: accepted.attemptId, attemptNumber: 2 });
    await repository.completeDelivered(accepted.attemptId, 'message-1');
    await expect(repository.getStatus('project-1', accepted.attemptId)).resolves.toEqual({ id: accepted.attemptId, status: 'delivered', providerMessageId: 'message-1' });
    await expect(repository.claim('worker-3', 5_000)).resolves.toBeUndefined();
  });

  it('reschedules a retry for future availability with safe status', async () => {
    let currentTime = 1_000;
    const repository = new InMemoryDeliveryRepository(() => currentTime);
    const accepted = await repository.accept(input);
    await repository.claim('worker-1', 5_000);
    await repository.rescheduleRetry(accepted.attemptId, 'providerUnavailable', 2_000);
    await expect(repository.getStatus('project-1', accepted.attemptId)).resolves.toEqual({ id: accepted.attemptId, status: 'queued', failureCode: 'providerUnavailable', isRetryable: true });
    currentTime = 2_999;
    await expect(repository.claim('worker-2', 5_000)).resolves.toBeUndefined();
    currentTime = 3_000;
    await expect(repository.claim('worker-2', 5_000)).resolves.toMatchObject({ attemptNumber: 2 });
  });

  it('persists safe failures and isolates status by project', async () => {
    const repository = new InMemoryDeliveryRepository();
    const accepted = await repository.accept(input);
    await repository.completeFailed(accepted.attemptId, 'providerUnavailable', true);
    await expect(repository.getStatus('project-1', accepted.attemptId)).resolves.toEqual({ id: accepted.attemptId, status: 'failed', failureCode: 'providerUnavailable', isRetryable: true });
    await expect(repository.getStatus('project-2', accepted.attemptId)).resolves.toBeUndefined();
    await expect(repository.getStatus('project-1', 'missing')).resolves.toBeUndefined();
  });

  it('ignores completion for an unknown attempt', async () => {
    const repository = new InMemoryDeliveryRepository();
    await expect(repository.completeDelivered('missing', 'message')).resolves.toBeUndefined();
    await expect(repository.completeFailed('missing', 'failure', false)).resolves.toBeUndefined();
    await expect(repository.rescheduleRetry('missing', 'failure', 1_000)).resolves.toBeUndefined();
  });

  it('aggregates only project attempts inside the requested period', async () => {
    let currentTime = 1_000;
    const repository = new InMemoryDeliveryRepository(() => currentTime);
    const old = await repository.accept({ ...input, idempotencyKey: 'old', eventId: 'old' });
    await repository.completeDelivered(old.attemptId, 'old-message');
    currentTime = 10_000;
    const delivered = await repository.accept({ ...input, idempotencyKey: 'delivered', eventId: 'delivered' });
    await repository.completeDelivered(delivered.attemptId, 'message-1');
    const failed = await repository.accept({ ...input, formId: 'form-2', provider: 'email', destinationId: 'destination-2', idempotencyKey: 'failed', eventId: 'failed' });
    await repository.completeFailed(failed.attemptId, 'providerUnavailable', false);
    await repository.accept({ ...input, idempotencyKey: 'queued', eventId: 'queued' });
    await repository.accept({ ...input, projectId: 'project-2', idempotencyKey: 'foreign', eventId: 'foreign' });
    await expect(repository.getStats('project-1', new Date(5_000))).resolves.toEqual({
      total: 3, delivered: 1, failed: 1, queued: 1,
      forms: [
        { formId: 'form-1', total: 2, delivered: 1, failed: 0, queued: 1, providers: [{ provider: 'telegram', total: 2, delivered: 1, failed: 0, queued: 1 }] },
        { formId: 'form-2', total: 1, delivered: 0, failed: 1, queued: 0, providers: [{ provider: 'email', total: 1, delivered: 0, failed: 1, queued: 0 }] },
      ],
    });
  });

  it('lists recent failures safely and replays one with an audit record', async () => {
    let currentTime = 1_000;
    const repository = new InMemoryDeliveryRepository(() => currentTime);
    const first = await repository.accept(input);
    await repository.claim('worker', 5_000);
    await repository.completeFailed(first.attemptId, 'providerUnavailable', true);
    currentTime = 2_000;
    const second = await repository.accept({ ...input, eventId: 'event-2', idempotencyKey: 'key-2', provider: 'email', formId: 'form-2' });
    await repository.claim('worker', 5_000);
    await repository.completeFailed(second.attemptId, 'providerRejected', false);
    await expect(repository.listFailed('project-1', 1)).resolves.toEqual([{ id: second.attemptId, formId: 'form-2', provider: 'email', failureCode: 'providerRejected', isRetryable: false, failedAt: new Date(2_000).toISOString() }]);
    await expect(repository.listFailed('project-2', 20)).resolves.toEqual([]);
    await expect(repository.replayFailed('project-1', second.attemptId, 'owner-1')).resolves.toBe('replayed');
    expect(repository.getReplayAudit()).toEqual([{ attemptId: second.attemptId, projectId: 'project-1', requestedBy: 'owner-1', previousFailureCode: 'providerRejected', previousAttemptCount: 1 }]);
    await expect(repository.getStatus('project-1', second.attemptId)).resolves.toEqual({ id: second.attemptId, status: 'queued' });
    await expect(repository.claim('worker-2', 5_000)).resolves.toMatchObject({ attemptId: second.attemptId, attemptNumber: 1 });
    await expect(repository.replayFailed('project-1', second.attemptId, 'owner-1')).resolves.toBe('notReplayable');
    await expect(repository.replayFailed('project-2', first.attemptId, 'owner-2')).resolves.toBe('notFound');
    await expect(repository.replayFailed('project-1', 'missing', 'owner-1')).resolves.toBe('notFound');
  });
});
