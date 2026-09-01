import type { EmailVerificationStore, VerificationConsumeResult, VerificationIssue, VerificationRecord } from './emailVerificationStore.js';

export class InMemoryEmailVerificationStore implements EmailVerificationStore {
  private readonly records = new Map<string, VerificationRecord>();

  async issue(record: VerificationRecord): Promise<VerificationIssue> {
    const existing = [...this.records.values()].find((candidate) => candidate.projectId === record.projectId && candidate.idempotencyKey === record.idempotencyKey);
    if (existing) return { record: { ...existing }, isNew: false };
    this.records.set(record.id, { ...record });
    return { record: { ...record }, isNew: true };
  }

  async markSent(id: string): Promise<void> {
    const record = this.records.get(id);
    if (record) record.status = 'sent';
  }

  async markFailed(id: string): Promise<void> {
    const record = this.records.get(id);
    if (record) record.status = 'failed';
  }

  async consume(tokenDigest: string, now: Date): Promise<VerificationConsumeResult> {
    const record = [...this.records.values()].find((candidate) => candidate.tokenDigest === tokenDigest);
    if (!record || record.status === 'failed' || record.status === 'pending') return { status: 'invalid' };
    if (record.status === 'confirmed') return { status: 'alreadyUsed' };
    if (new Date(record.expiresAt).getTime() <= now.getTime()) return { status: 'expired' };
    record.status = 'confirmed';
    return { status: 'confirmed', redirectUrl: record.redirectUrl };
  }
}
