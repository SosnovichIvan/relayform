import { describe, expect, it, vi } from 'vitest';
import { InMemoryDeliveryRepository } from './inMemoryDeliveryRepository.js';
import { TransportDeliveryWorker } from './transportDeliveryWorker.js';
import { DeliveryTransportError } from './transports/textDeliveryTransport.js';
import { RetryPolicy } from './retryPolicy.js';

const immediateRetry = new RetryPolicy({ baseDelayMs: 0, maxDelayMs: 0, random: () => 0 });

async function setup(transport?: { send(input: { recipient: string; message: string }): Promise<{ providerMessageId: string }> }) {
  const repository = new InMemoryDeliveryRepository();
  const attempt = await repository.accept({ projectId: 'project-1', formId: 'form-1', eventId: 'event-1', destinationId: 'destination-1', idempotencyKey: 'key-1', provider: 'telegram', recipient: '123', message: 'Lead' });
  return { worker: new TransportDeliveryWorker(repository, transport ? { telegram: transport } : {}, 'worker-1', 30_000, immediateRetry), attempt, repository };
}

describe('TransportDeliveryWorker', () => {
  it('dispatches through the selected provider and records delivery', async () => {
    const send = vi.fn().mockResolvedValue({ providerMessageId: 'telegram-42' });
    const { worker } = await setup({ send });
    await expect(worker.runOne()).resolves.toMatchObject({ status: 'delivered', providerMessageId: 'telegram-42' });
    expect(send).toHaveBeenCalledWith({ recipient: '123', message: 'Lead' });
    await expect(worker.runOne()).resolves.toBeUndefined();
  });

  it('reschedules a classified temporary failure without sensitive details', async () => {
    const { worker } = await setup({ send: vi.fn().mockRejectedValue(new DeliveryTransportError('providerUnavailable', true)) });
    await expect(worker.runOne()).resolves.toMatchObject({ status: 'queued', failureCode: 'providerUnavailable', isRetryable: true });
  });

  it('uses a provider retry hint when it is longer than exponential backoff', async () => {
    const repository = new InMemoryDeliveryRepository();
    await repository.accept({ projectId: 'project-1', formId: 'form-1', eventId: 'event-1', destinationId: 'destination-1', idempotencyKey: 'key-1', provider: 'telegram', recipient: '123', message: 'Lead' });
    const reschedule = vi.spyOn(repository, 'rescheduleRetry');
    const worker = new TransportDeliveryWorker(
      repository,
      { telegram: { send: vi.fn().mockRejectedValue(new DeliveryTransportError('providerUnavailable', true, 7_000)) } },
      'worker-1',
      30_000,
      new RetryPolicy({ baseDelayMs: 1_000, maxDelayMs: 10_000, random: () => 0 }),
    );
    await worker.runOne();
    expect(reschedule).toHaveBeenCalledWith(expect.any(String), 'providerUnavailable', 7_000);
  });

  it('finalizes a retryable failure after the attempt budget is exhausted', async () => {
    const { worker } = await setup({ send: vi.fn().mockRejectedValue(new DeliveryTransportError('providerUnavailable', true)) });
    for (let attempt = 1; attempt < 5; attempt += 1) await expect(worker.runOne()).resolves.toMatchObject({ status: 'queued' });
    await expect(worker.runOne()).resolves.toMatchObject({ status: 'failed', failureCode: 'providerUnavailable', isRetryable: true });
  });

  it('records missing adapters and unexpected errors with stable codes', async () => {
    await expect((await setup()).worker.runOne()).resolves.toMatchObject({ status: 'failed', failureCode: 'transportNotConfigured', isRetryable: false });
    await expect((await setup({ send: vi.fn().mockRejectedValue(new Error('secret recipient')) })).worker.runOne()).resolves.toMatchObject({ status: 'queued', failureCode: 'unexpectedTransportFailure', isRetryable: true });
  });

  it('returns no outcome when no job is available', async () => {
    const repository = new InMemoryDeliveryRepository();
    await expect(new TransportDeliveryWorker(repository, {}, 'worker-1').runOne()).resolves.toBeUndefined();
  });
});
