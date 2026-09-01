import type { MaxDestinationActivationStore } from './maxDestinationActivationStore.js';

type ActivationRecord = { ownerId: string; destinationId: string; tokenDigest: string; expiresAt: number };

export class InMemoryMaxDestinationActivationStore implements MaxDestinationActivationStore {
  private readonly recordsByDestination = new Map<string, ActivationRecord>();

  constructor(private readonly activateDestination: (ownerId: string, destinationId: string, recipient: string) => Promise<boolean> | boolean) {}

  async issue(ownerId: string, destinationId: string, tokenDigest: string, expiresAt: Date): Promise<void> {
    this.recordsByDestination.set(destinationId, { ownerId, destinationId, tokenDigest, expiresAt: expiresAt.getTime() });
  }

  async consume(tokenDigest: string, recipient: string, now: Date): Promise<boolean> {
    const record = [...this.recordsByDestination.values()].find((candidate) => candidate.tokenDigest === tokenDigest);
    if (!record || record.expiresAt <= now.getTime()) return false;
    if (!await this.activateDestination(record.ownerId, record.destinationId, recipient)) return false;
    this.recordsByDestination.delete(record.destinationId);
    return true;
  }
}
