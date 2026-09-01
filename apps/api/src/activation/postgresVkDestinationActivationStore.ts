import type { PostgresExecutor } from '../identity/postgresIdentityStore.js';
import type { VkDestinationActivationStore } from './vkDestinationActivationStore.js';

export class PostgresVkDestinationActivationStore implements VkDestinationActivationStore {
  constructor(private readonly database: PostgresExecutor) {}

  async issue(ownerId: string, destinationId: string, tokenDigest: string, expiresAt: Date): Promise<void> {
    await this.database.query(
      `INSERT INTO vk_destination_activations (destination_id, owner_id, token_digest, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (destination_id) DO UPDATE SET owner_id = EXCLUDED.owner_id, token_digest = EXCLUDED.token_digest, expires_at = EXCLUDED.expires_at, updated_at = now()`,
      [destinationId, ownerId, tokenDigest, expiresAt.toISOString()],
    );
  }

  async consume(tokenDigest: string, recipient: string, now: Date): Promise<boolean> {
    const result = await this.database.query<{ id: string }>(
      `WITH activation AS (
         DELETE FROM vk_destination_activations
         WHERE token_digest = $1 AND expires_at > $3
         RETURNING destination_id
       )
       UPDATE destinations SET recipient = $2, status = 'active'
       FROM activation
       WHERE destinations.id = activation.destination_id AND destinations.provider = 'vk'
       RETURNING destinations.id`,
      [tokenDigest, recipient, now.toISOString()],
    );
    return Boolean(result.rows[0]);
  }
}
