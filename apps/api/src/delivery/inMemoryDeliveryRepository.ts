import { randomUUID } from 'node:crypto';
import { aggregateDeliveryStats, type AcceptDeliveryInput, type ClaimedDelivery, type DeliveryRepository, type DeliveryStatus, type DeliveryStatsRow, type FailedDelivery, type ReplayDeliveryResult } from './deliveryRepository.js';

type StoredAttempt = DeliveryStatus & { projectId: string; formId: string; provider: AcceptDeliveryInput['provider']; idempotencyKey: string; createdAt: number; updatedAt: number };
type ReplayAudit = { attemptId: string; projectId: string; requestedBy: string; previousFailureCode: string; previousAttemptCount: number };
type StoredJob = Omit<ClaimedDelivery, 'attemptNumber'> & {
  attemptCount: number;
  availableAt: number;
  claimedBy?: string;
  leaseExpiresAt?: number;
  isCompleted: boolean;
};

export class InMemoryDeliveryRepository implements DeliveryRepository {
  private readonly attempts = new Map<string, StoredAttempt>();
  private readonly attemptIdsByKey = new Map<string, string>();
  private readonly jobs = new Map<string, StoredJob>();
  private readonly replayAudit: ReplayAudit[] = [];

  constructor(private readonly now: () => number = Date.now) {}

  async accept(input: AcceptDeliveryInput) {
    const scopedKey = `${input.projectId}:${input.idempotencyKey}`;
    const existingId = this.attemptIdsByKey.get(scopedKey);
    if (existingId) return { attemptId: existingId, isNew: false };
    const attemptId = randomUUID();
    const createdAt = this.now();
    this.attempts.set(attemptId, { id: attemptId, projectId: input.projectId, formId: input.formId, provider: input.provider, idempotencyKey: input.idempotencyKey, status: 'queued', createdAt, updatedAt: createdAt });
    this.attemptIdsByKey.set(scopedKey, attemptId);
    this.jobs.set(attemptId, { attemptId, provider: input.provider, recipient: input.recipient, message: input.message, attemptCount: 0, maxAttempts: 5, availableAt: this.now(), isCompleted: false });
    return { attemptId, isNew: true };
  }

  async claim(workerId: string, leaseMs: number): Promise<ClaimedDelivery | undefined> {
    const currentTime = this.now();
    const job = [...this.jobs.values()].find((candidate) => !candidate.isCompleted && candidate.availableAt <= currentTime && (!candidate.leaseExpiresAt || candidate.leaseExpiresAt <= currentTime));
    if (!job) return undefined;
    job.attemptCount += 1;
    job.claimedBy = workerId;
    job.leaseExpiresAt = currentTime + leaseMs;
    return { attemptId: job.attemptId, provider: job.provider, recipient: job.recipient, message: job.message, attemptNumber: job.attemptCount, maxAttempts: job.maxAttempts };
  }

  async completeDelivered(attemptId: string, providerMessageId: string): Promise<void> {
    const attempt = this.attempts.get(attemptId);
    const job = this.jobs.get(attemptId);
    if (attempt) Object.assign(attempt, { status: 'delivered', providerMessageId, failureCode: undefined, isRetryable: undefined, updatedAt: this.now() });
    if (job) job.isCompleted = true;
  }

  async completeFailed(attemptId: string, failureCode: string, isRetryable: boolean): Promise<void> {
    const attempt = this.attempts.get(attemptId);
    const job = this.jobs.get(attemptId);
    if (attempt) Object.assign(attempt, { status: 'failed', failureCode, isRetryable, providerMessageId: undefined, updatedAt: this.now() });
    if (job) job.isCompleted = true;
  }

  async rescheduleRetry(attemptId: string, failureCode: string, delayMs: number): Promise<void> {
    const attempt = this.attempts.get(attemptId);
    const job = this.jobs.get(attemptId);
    if (attempt) Object.assign(attempt, { status: 'queued', failureCode, isRetryable: true, providerMessageId: undefined, updatedAt: this.now() });
    if (job && !job.isCompleted) {
      job.availableAt = this.now() + Math.max(0, delayMs);
      job.claimedBy = undefined;
      job.leaseExpiresAt = undefined;
    }
  }

  async getStatus(projectId: string, attemptId: string): Promise<DeliveryStatus | undefined> {
    const attempt = this.attempts.get(attemptId);
    if (!attempt || attempt.projectId !== projectId) return undefined;
    const { id, status, providerMessageId, failureCode, isRetryable } = attempt;
    return { id, status, ...(providerMessageId ? { providerMessageId } : {}), ...(failureCode ? { failureCode, isRetryable } : {}) };
  }

  async getStats(projectId: string, since: Date) {
    const grouped = new Map<string, DeliveryStatsRow>();
    for (const attempt of this.attempts.values()) {
      if (attempt.projectId !== projectId || attempt.createdAt < since.getTime()) continue;
      const key = `${attempt.formId}:${attempt.provider}:${attempt.status}`;
      const row = grouped.get(key) ?? { formId: attempt.formId, provider: attempt.provider, status: attempt.status, count: 0 };
      row.count += 1;
      grouped.set(key, row);
    }
    return aggregateDeliveryStats([...grouped.values()]);
  }

  async listFailed(projectId: string, limit: number): Promise<FailedDelivery[]> {
    return [...this.attempts.values()]
      .filter((attempt) => attempt.projectId === projectId && attempt.status === 'failed')
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .slice(0, Math.max(0, limit))
      .map((attempt) => ({ id: attempt.id, formId: attempt.formId, provider: attempt.provider, failureCode: attempt.failureCode ?? 'unknownFailure', isRetryable: attempt.isRetryable ?? false, failedAt: new Date(attempt.updatedAt).toISOString() }));
  }

  async replayFailed(projectId: string, attemptId: string, requestedBy: string): Promise<ReplayDeliveryResult> {
    const attempt = this.attempts.get(attemptId);
    if (!attempt || attempt.projectId !== projectId) return 'notFound';
    if (attempt.status !== 'failed') return 'notReplayable';
    const job = this.jobs.get(attemptId);
    if (!job) return 'notFound';
    this.replayAudit.push({ attemptId, projectId, requestedBy, previousFailureCode: attempt.failureCode ?? 'unknownFailure', previousAttemptCount: job.attemptCount });
    Object.assign(attempt, { status: 'queued', providerMessageId: undefined, failureCode: undefined, isRetryable: undefined, updatedAt: this.now() });
    Object.assign(job, { attemptCount: 0, availableAt: this.now(), claimedBy: undefined, leaseExpiresAt: undefined, isCompleted: false });
    return 'replayed';
  }

  getReplayAudit(): readonly ReplayAudit[] { return this.replayAudit; }
}
