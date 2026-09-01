import { InMemoryDeliveryQueue } from './inMemoryDeliveryQueue.js';
import { InMemoryDeliveryAttemptStore, type DeliveryAttempt } from './inMemoryDeliveryAttemptStore.js';

export type { DeliveryAttempt } from './inMemoryDeliveryAttemptStore.js';

export class MockDeliveryWorker {
  constructor(private readonly queue: InMemoryDeliveryQueue, private readonly attempts: InMemoryDeliveryAttemptStore) {}

  runOne(): DeliveryAttempt | undefined {
    const job = this.queue.take();
    if (!job) return undefined;
    const attempt = this.attempts.get(job.deliveryAttemptId);
    if (!attempt) return undefined;
    attempt.status = 'delivered';
    attempt.providerMessageId = `mock_${job.deliveryAttemptId}`;
    return attempt;
  }
}
