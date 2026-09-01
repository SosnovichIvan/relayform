export type EmailDestinationActivationResult =
  | { status: 'confirmed' }
  | { status: 'invalid' | 'expired' | 'alreadyUsed' };

export interface EmailDestinationActivationStore {
  issue(ownerId: string, destinationId: string, tokenDigest: string, expiresAt: Date): Promise<void>;
  invalidate(destinationId: string): Promise<void>;
  consume(tokenDigest: string, now: Date): Promise<EmailDestinationActivationResult>;
}
