export type DeliveryJob = {
  deliveryAttemptId: string;
  destinationId: string;
  eventId: string;
  idempotencyKey: string;
  provider: 'telegram' | 'vk' | 'max' | 'email';
  recipient: string;
  message: string;
};

export class InMemoryDeliveryQueue {
  private readonly jobs = new Map<string, DeliveryJob>();

  enqueue(job: DeliveryJob): boolean {
    if (this.jobs.has(job.idempotencyKey)) return false;
    this.jobs.set(job.idempotencyKey, job);
    return true;
  }

  take(): DeliveryJob | undefined {
    const first = this.jobs.entries().next().value as [string, DeliveryJob] | undefined;
    if (!first) return undefined;
    this.jobs.delete(first[0]);
    return first[1];
  }

  get size(): number { return this.jobs.size; }
}
