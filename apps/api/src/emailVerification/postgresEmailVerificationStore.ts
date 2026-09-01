import type { PostgresExecutor } from '../identity/postgresIdentityStore.js';
import type { EmailVerificationStore, VerificationConsumeResult, VerificationIssue, VerificationRecord, VerificationStatus } from './emailVerificationStore.js';

type VerificationRow = {
  id: string;
  projectId: string;
  templateId: string;
  recipientEmail: string;
  tokenDigest: string;
  idempotencyKey: string;
  redirectUrl: string;
  status: VerificationStatus;
  expiresAt: string;
};

const returning = 'id, project_id AS "projectId", template_id AS "templateId", recipient_email AS "recipientEmail", token_digest AS "tokenDigest", idempotency_key AS "idempotencyKey", redirect_url AS "redirectUrl", status, expires_at AS "expiresAt"';

export class PostgresEmailVerificationStore implements EmailVerificationStore {
  constructor(private readonly database: PostgresExecutor) {}

  async issue(record: VerificationRecord): Promise<VerificationIssue> {
    const inserted = await this.database.query<VerificationRow>(
      `INSERT INTO email_verifications (id, project_id, template_id, recipient_email, token_digest, idempotency_key, redirect_url, status, expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (project_id, idempotency_key) DO NOTHING RETURNING ${returning}`,
      [record.id, record.projectId, record.templateId, record.recipientEmail, record.tokenDigest, record.idempotencyKey, record.redirectUrl, record.status, record.expiresAt],
    );
    if (inserted.rows[0]) return { record: inserted.rows[0], isNew: true };
    const existing = await this.database.query<VerificationRow>(`SELECT ${returning} FROM email_verifications WHERE project_id = $1 AND idempotency_key = $2`, [record.projectId, record.idempotencyKey]);
    return { record: existing.rows[0]!, isNew: false };
  }

  async markSent(id: string): Promise<void> {
    await this.database.query('UPDATE email_verifications SET status = $1 WHERE id = $2 AND status = $3', ['sent', id, 'pending']);
  }

  async markFailed(id: string): Promise<void> {
    await this.database.query('UPDATE email_verifications SET status = $1 WHERE id = $2 AND status = $3', ['failed', id, 'pending']);
  }

  async consume(tokenDigest: string, now: Date): Promise<VerificationConsumeResult> {
    const consumed = await this.database.query<{ redirectUrl: string }>('UPDATE email_verifications SET status = $1, confirmed_at = $2 WHERE token_digest = $3 AND status = $4 AND expires_at > $2 RETURNING redirect_url AS "redirectUrl"', ['confirmed', now.toISOString(), tokenDigest, 'sent']);
    if (consumed.rows[0]) return { status: 'confirmed', redirectUrl: consumed.rows[0].redirectUrl };
    const current = await this.database.query<{ status: VerificationStatus; expiresAt: string }>('SELECT status, expires_at AS "expiresAt" FROM email_verifications WHERE token_digest = $1', [tokenDigest]);
    const record = current.rows[0];
    if (!record || record.status === 'pending' || record.status === 'failed') return { status: 'invalid' };
    if (record.status === 'confirmed') return { status: 'alreadyUsed' };
    return { status: new Date(record.expiresAt).getTime() <= now.getTime() ? 'expired' : 'invalid' };
  }
}
