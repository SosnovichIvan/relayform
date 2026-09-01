import { randomUUID } from 'node:crypto';

export type DeliveryAttempt = {
  id: string;
  projectId: string;
  eventId: string;
  destinationId: string;
  idempotencyKey: string;
  status: 'queued' | 'delivered' | 'failed';
  providerMessageId?: string;
  failureCode?: string;
  isRetryable?: boolean;
};

export class InMemoryDeliveryAttemptStore {
  private readonly attempts = new Map<string, DeliveryAttempt>();
  private readonly attemptIdsByKey = new Map<string, string>();

  createQueued(projectId: string, eventId: string, destinationId: string, idempotencyKey: string): { attempt: DeliveryAttempt; isNew: boolean } {
    const existingId = this.attemptIdsByKey.get(idempotencyKey);
    if (existingId) return { attempt: this.attempts.get(existingId)!, isNew: false };
    const attempt = { id: randomUUID(), projectId, eventId, destinationId, idempotencyKey, status: 'queued' as const };
    this.attempts.set(attempt.id, attempt);
    this.attemptIdsByKey.set(idempotencyKey, attempt.id);
    return { attempt, isNew: true };
  }

  get(id: string): DeliveryAttempt | undefined { return this.attempts.get(id); }

  getStatus(projectId: string, id: string) {
    const attempt = this.attempts.get(id);
    if (!attempt || attempt.projectId !== projectId) return undefined;
    return {
      id: attempt.id,
      status: attempt.status,
      ...(attempt.providerMessageId ? { providerMessageId: attempt.providerMessageId } : {}),
      ...(attempt.failureCode ? { failureCode: attempt.failureCode, isRetryable: attempt.isRetryable } : {}),
    };
  }
}
