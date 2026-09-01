import { describe, expect, it } from 'vitest';
import { InMemoryDeliveryQueue } from './inMemoryDeliveryQueue.js';
import { InMemoryDeliveryAttemptStore } from './inMemoryDeliveryAttemptStore.js';
import { MockDeliveryWorker } from './mockDeliveryWorker.js';

describe('MockDeliveryWorker', () => {
  it('marks a queued attempt delivered once', () => {
    const queue = new InMemoryDeliveryQueue();
    const attempts = new InMemoryDeliveryAttemptStore();
    const attempt = attempts.createQueued('project-1', 'event-1', 'destination-1', 'event-1:destination-1:v1').attempt;
    queue.enqueue({ deliveryAttemptId: attempt.id, destinationId: 'destination-1', eventId: 'event-1', idempotencyKey: 'event-1:destination-1:v1', provider: 'telegram', recipient: '123', message: 'Lead' });
    const worker = new MockDeliveryWorker(queue, attempts);
    expect(worker.runOne()).toEqual({ ...attempt, status: 'delivered', providerMessageId: `mock_${attempt.id}` });
    expect(worker.runOne()).toBeUndefined();
  });

  it('does not invent an attempt when queue metadata is stale', () => {
    const queue = new InMemoryDeliveryQueue();
    queue.enqueue({ deliveryAttemptId: 'missing', destinationId: 'destination-1', eventId: 'event-1', idempotencyKey: 'missing', provider: 'telegram', recipient: '123', message: 'Lead' });
    expect(new MockDeliveryWorker(queue, new InMemoryDeliveryAttemptStore()).runOne()).toBeUndefined();
  });
});
