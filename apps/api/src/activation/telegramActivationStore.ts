import { createHash, randomBytes } from 'node:crypto';

type ActivationRecord = { ownerId: string; destinationId: string; expiresAt: number };

export class TelegramActivationStore {
  private readonly recordsByDigest = new Map<string, ActivationRecord>();

  constructor(
    private readonly ttlMs = 15 * 60_000,
    private readonly now: () => number = Date.now,
    private readonly createCode: () => string = () => randomBytes(24).toString('base64url'),
  ) {
    if (!Number.isInteger(ttlMs) || ttlMs <= 0) throw new Error('ttlMs must be a positive integer');
  }

  issue(ownerId: string, destinationId: string): { code: string; expiresAt: number } {
    const code = this.createCode();
    const expiresAt = this.now() + this.ttlMs;
    this.recordsByDigest.set(this.digest(code), { ownerId, destinationId, expiresAt });
    return { code, expiresAt };
  }

  consume(code: string): ActivationRecord | undefined {
    const digest = this.digest(code);
    const record = this.recordsByDigest.get(digest);
    if (!record) return undefined;
    this.recordsByDigest.delete(digest);
    return record.expiresAt > this.now() ? record : undefined;
  }

  private digest(code: string): string { return createHash('sha256').update(code).digest('hex'); }
}
