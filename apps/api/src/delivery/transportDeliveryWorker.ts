import { randomUUID } from 'node:crypto';
import type { DeliveryProvider, DeliveryRepository, DeliveryStatus } from './deliveryRepository.js';
import { RetryPolicy } from './retryPolicy.js';
import { DeliveryTransportError, type TextDeliveryTransport } from './transports/textDeliveryTransport.js';

export type TransportRegistry = Partial<Record<DeliveryProvider, TextDeliveryTransport>>;

export class TransportDeliveryWorker {
  constructor(
    private readonly repository: DeliveryRepository,
    private readonly transports: TransportRegistry,
    private readonly workerId: string = randomUUID(),
    private readonly leaseMs = 30_000,
    private readonly retryPolicy = new RetryPolicy(),
  ) {}

  async runOne(): Promise<DeliveryStatus | undefined> {
    const job = await this.repository.claim(this.workerId, this.leaseMs);
    if (!job) return undefined;
    const transport = this.transports[job.provider];
    if (!transport) return this.fail(job, 'transportNotConfigured', false);
    try {
      const result = await transport.send({ recipient: job.recipient, message: job.message });
      await this.repository.completeDelivered(job.attemptId, result.providerMessageId);
      return { id: job.attemptId, status: 'delivered', providerMessageId: result.providerMessageId };
    } catch (error) {
      if (error instanceof DeliveryTransportError) return this.fail(job, error.code, error.isRetryable, error.retryAfterMs);
      return this.fail(job, 'unexpectedTransportFailure', true);
    }
  }

  private async fail(job: Awaited<ReturnType<DeliveryRepository['claim']>> & {}, failureCode: string, isRetryable: boolean, retryAfterMs?: number): Promise<DeliveryStatus> {
    if (isRetryable && job.attemptNumber < job.maxAttempts) {
      await this.repository.rescheduleRetry(job.attemptId, failureCode, this.retryPolicy.delay(job.attemptNumber, retryAfterMs));
      return { id: job.attemptId, status: 'queued', failureCode, isRetryable: true };
    }
    await this.repository.completeFailed(job.attemptId, failureCode, isRetryable);
    return { id: job.attemptId, status: 'failed', failureCode, isRetryable };
  }
}
