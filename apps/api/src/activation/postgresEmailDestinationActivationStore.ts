import type { PostgresExecutor } from '../identity/postgresIdentityStore.js';
import type { EmailDestinationActivationResult, EmailDestinationActivationStore } from './emailDestinationActivationStore.js';

export class PostgresEmailDestinationActivationStore implements EmailDestinationActivationStore {
  constructor(private readonly database: PostgresExecutor) {}

  async issue(ownerId: string, destinationId: string, tokenDigest: string, expiresAt: Date): Promise<void> {
    await this.database.query(
      `INSERT INTO email_destination_activations (destination_id, owner_id, token_digest, status, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (destination_id) DO UPDATE SET owner_id = EXCLUDED.owner_id, token_digest = EXCLUDED.token_digest, status = EXCLUDED.status, expires_at = EXCLUDED.expires_at, confirmed_at = NULL, updated_at = now()`,
      [destinationId, ownerId, tokenDigest, 'pending', expiresAt.toISOString()],
    );
  }

  async invalidate(destinationId: string): Promise<void> {
    await this.database.query('UPDATE email_destination_activations SET status = $1, updated_at = now() WHERE destination_id = $2 AND status = $3', ['failed', destinationId, 'pending']);
  }

  async consume(tokenDigest: string, now: Date): Promise<EmailDestinationActivationResult> {
    const activated = await this.database.query<{ id: string }>(
      `WITH activation AS (
         UPDATE email_destination_activations SET status = 'confirmed', confirmed_at = $2, updated_at = now()
         WHERE token_digest = $1 AND status = 'pending' AND expires_at > $2
         RETURNING destination_id
       )
       UPDATE destinations SET status = 'active'
       FROM activation
       WHERE destinations.id = activation.destination_id AND destinations.provider = 'email'
       RETURNING destinations.id`,
      [tokenDigest, now.toISOString()],
    );
    if (activated.rows[0]) return { status: 'confirmed' };
    const current = await this.database.query<{ status: 'pending' | 'confirmed' | 'failed'; expiresAt: string }>('SELECT status, expires_at AS "expiresAt" FROM email_destination_activations WHERE token_digest = $1', [tokenDigest]);
    const record = current.rows[0];
    if (!record || record.status === 'failed') return { status: 'invalid' };
    if (record.status === 'confirmed') return { status: 'alreadyUsed' };
    return { status: new Date(record.expiresAt).getTime() <= now.getTime() ? 'expired' : 'invalid' };
  }
}
