import type { EmailDestinationActivationResult, EmailDestinationActivationStore } from './emailDestinationActivationStore.js';

type ActivationRecord = { ownerId: string; destinationId: string; tokenDigest: string; status: 'pending' | 'confirmed' | 'failed'; expiresAt: number };

export class InMemoryEmailDestinationActivationStore implements EmailDestinationActivationStore {
  private readonly recordsByDestination = new Map<string, ActivationRecord>();

  constructor(private readonly activateDestination: (ownerId: string, destinationId: string) => Promise<boolean> | boolean) {}

  async issue(ownerId: string, destinationId: string, tokenDigest: string, expiresAt: Date): Promise<void> {
    this.recordsByDestination.set(destinationId, { ownerId, destinationId, tokenDigest, status: 'pending', expiresAt: expiresAt.getTime() });
  }

  async invalidate(destinationId: string): Promise<void> {
    const record = this.recordsByDestination.get(destinationId);
    if (record?.status === 'pending') record.status = 'failed';
  }

  async consume(tokenDigest: string, now: Date): Promise<EmailDestinationActivationResult> {
    const record = [...this.recordsByDestination.values()].find((candidate) => candidate.tokenDigest === tokenDigest);
    if (!record || record.status === 'failed') return { status: 'invalid' };
    if (record.status === 'confirmed') return { status: 'alreadyUsed' };
    if (record.expiresAt <= now.getTime()) return { status: 'expired' };
    if (!await this.activateDestination(record.ownerId, record.destinationId)) return { status: 'invalid' };
    record.status = 'confirmed';
    return { status: 'confirmed' };
  }
}
