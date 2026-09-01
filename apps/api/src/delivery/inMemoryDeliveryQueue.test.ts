import { describe, expect, it } from 'vitest';
import { InMemoryDeliveryQueue } from './inMemoryDeliveryQueue.js';

const job = { deliveryAttemptId: 'attempt-1', destinationId: 'destination-1', eventId: 'event-1', idempotencyKey: 'event-1:destination-1:v1', provider: 'telegram' as const, recipient: '123', message: 'Lead' };

describe('InMemoryDeliveryQueue', () => {
  it('accepts a unique delivery attempt and returns it once', () => {
    const queue = new InMemoryDeliveryQueue();
    expect(queue.enqueue(job)).toBe(true);
    expect(queue.size).toBe(1);
    expect(queue.take()).toEqual(job);
    expect(queue.size).toBe(0);
    expect(queue.take()).toBeUndefined();
  });

  it('rejects a duplicate idempotency key', () => {
    const queue = new InMemoryDeliveryQueue();
    queue.enqueue(job);
    expect(queue.enqueue({ ...job, deliveryAttemptId: 'attempt-2' })).toBe(false);
    expect(queue.size).toBe(1);
  });
});
