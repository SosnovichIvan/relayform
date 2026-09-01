export interface VkDestinationActivationStore {
  issue(ownerId: string, destinationId: string, tokenDigest: string, expiresAt: Date): Promise<void>;
  consume(tokenDigest: string, recipient: string, now: Date): Promise<boolean>;
}
