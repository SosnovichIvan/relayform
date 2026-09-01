import { randomUUID } from 'node:crypto';
import { aggregateDeliveryStats, type AcceptDeliveryInput, type ClaimedDelivery, type DeliveryProvider, type DeliveryRepository, type DeliveryStatus, type FailedDelivery, type ReplayDeliveryResult } from './deliveryRepository.js';

type QueryResult<Row> = { rows: Row[] };
type DatabaseClient = { query<Row = Record<string, never>>(sql: string, values?: Array<string | number | boolean>): Promise<QueryResult<Row>>; release(): void };
export type DeliveryDatabase = {
  query<Row = Record<string, never>>(sql: string, values?: Array<string | number | boolean>): Promise<QueryResult<Row>>;
  connect(): Promise<DatabaseClient>;
};

export class PostgresDeliveryRepository implements DeliveryRepository {
  constructor(private readonly database: DeliveryDatabase) {}

  async accept(input: AcceptDeliveryInput) {
    const client = await this.database.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'INSERT INTO submissions (id, project_id, event_id, message) VALUES ($1, $2, $3, $4) ON CONFLICT (project_id, event_id) DO NOTHING',
        [randomUUID(), input.projectId, input.eventId, input.message],
      );
      const attemptId = randomUUID();
      const inserted = await client.query<{ id: string }>(
        'INSERT INTO delivery_attempts (id, project_id, event_id, destination_id, idempotency_key, status) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (project_id, idempotency_key) DO NOTHING RETURNING id',
        [attemptId, input.projectId, input.eventId, input.destinationId, input.idempotencyKey, 'queued'],
      );
      const isNew = Boolean(inserted.rows[0]);
      const acceptedAttemptId = inserted.rows[0]?.id ?? (await client.query<{ id: string }>('SELECT id FROM delivery_attempts WHERE project_id = $1 AND idempotency_key = $2', [input.projectId, input.idempotencyKey])).rows[0]!.id;
      if (isNew) {
        await client.query(
          'INSERT INTO delivery_jobs (delivery_attempt_id, provider, recipient, message) VALUES ($1, $2, $3, $4)',
          [acceptedAttemptId, input.provider, input.recipient, input.message],
        );
      }
      await client.query('COMMIT');
      return { attemptId: acceptedAttemptId, isNew };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async claim(workerId: string, leaseMs: number): Promise<ClaimedDelivery | undefined> {
    return (await this.database.query<ClaimedDelivery>(
      `WITH candidate AS (
        SELECT delivery_attempt_id FROM delivery_jobs
        WHERE completed_at IS NULL AND available_at <= now() AND (lease_expires_at IS NULL OR lease_expires_at <= now())
        ORDER BY available_at, created_at
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      UPDATE delivery_jobs AS jobs
      SET claimed_by = $1, lease_expires_at = now() + ($2::integer * interval '1 millisecond'), attempt_count = jobs.attempt_count + 1
      FROM candidate
      WHERE jobs.delivery_attempt_id = candidate.delivery_attempt_id
      RETURNING jobs.delivery_attempt_id AS "attemptId", jobs.provider, jobs.recipient, jobs.message, jobs.attempt_count AS "attemptNumber", jobs.max_attempts AS "maxAttempts"`,
      [workerId, leaseMs],
    )).rows[0];
  }

  async completeDelivered(attemptId: string, providerMessageId: string): Promise<void> {
    await this.complete(attemptId, 'delivered', providerMessageId, '', false);
  }

  async completeFailed(attemptId: string, failureCode: string, isRetryable: boolean): Promise<void> {
    await this.complete(attemptId, 'failed', '', failureCode, isRetryable);
  }

  async rescheduleRetry(attemptId: string, failureCode: string, delayMs: number): Promise<void> {
    await this.database.query(
      `WITH updated AS (
        UPDATE delivery_attempts SET status = 'queued', provider_message_id = NULL, failure_code = $2, is_retryable = true, updated_at = now()
        WHERE id = $1 RETURNING id
      )
      UPDATE delivery_jobs AS jobs
      SET available_at = now() + ($3::integer * interval '1 millisecond'), claimed_by = NULL, lease_expires_at = NULL
      FROM updated WHERE jobs.delivery_attempt_id = updated.id AND jobs.completed_at IS NULL`,
      [attemptId, failureCode, Math.max(0, delayMs)],
    );
  }

  async getStatus(projectId: string, attemptId: string): Promise<DeliveryStatus | undefined> {
    return (await this.database.query<DeliveryStatus>(
      'SELECT id, status, provider_message_id AS "providerMessageId", failure_code AS "failureCode", is_retryable AS "isRetryable" FROM delivery_attempts WHERE project_id = $1 AND id = $2',
      [projectId, attemptId],
    )).rows[0];
  }

  async getStats(projectId: string, since: Date) {
    const rows = (await this.database.query<{ formId: string; provider: DeliveryProvider; status: DeliveryStatus['status']; count: string }>(
      `SELECT destinations.form_id AS "formId", jobs.provider, attempts.status, count(*)::text AS count
       FROM delivery_attempts AS attempts
       JOIN destinations ON destinations.id = attempts.destination_id
       JOIN delivery_jobs AS jobs ON jobs.delivery_attempt_id = attempts.id
       WHERE attempts.project_id = $1 AND attempts.created_at >= $2
       GROUP BY destinations.form_id, jobs.provider, attempts.status`,
      [projectId, since.toISOString()],
    )).rows;
    return aggregateDeliveryStats(rows.map((row) => ({ ...row, count: Number(row.count) })));
  }

  async listFailed(projectId: string, limit: number): Promise<FailedDelivery[]> {
    return (await this.database.query<FailedDelivery>(
      `SELECT attempts.id, destinations.form_id AS "formId", jobs.provider,
              COALESCE(attempts.failure_code, 'unknownFailure') AS "failureCode",
              COALESCE(attempts.is_retryable, false) AS "isRetryable",
              attempts.updated_at AS "failedAt"
       FROM delivery_attempts AS attempts
       JOIN destinations ON destinations.id = attempts.destination_id
       JOIN delivery_jobs AS jobs ON jobs.delivery_attempt_id = attempts.id
       WHERE attempts.project_id = $1 AND attempts.status = 'failed'
       ORDER BY attempts.updated_at DESC
       LIMIT $2`,
      [projectId, Math.max(0, limit)],
    )).rows;
  }

  async replayFailed(projectId: string, attemptId: string, requestedBy: string): Promise<ReplayDeliveryResult> {
    const client = await this.database.connect();
    try {
      await client.query('BEGIN');
      const current = (await client.query<{ status: DeliveryStatus['status']; failureCode?: string; attemptCount: number }>(
        `SELECT attempts.status, attempts.failure_code AS "failureCode", jobs.attempt_count AS "attemptCount"
         FROM delivery_attempts AS attempts
         JOIN delivery_jobs AS jobs ON jobs.delivery_attempt_id = attempts.id
         WHERE attempts.id = $1 AND attempts.project_id = $2
         FOR UPDATE OF attempts, jobs`,
        [attemptId, projectId],
      )).rows[0];
      if (!current) {
        await client.query('COMMIT');
        return 'notFound';
      }
      if (current.status !== 'failed') {
        await client.query('COMMIT');
        return 'notReplayable';
      }
      await client.query(
        `UPDATE delivery_attempts
         SET status = 'queued', provider_message_id = NULL, failure_code = NULL, is_retryable = NULL, updated_at = now()
         WHERE id = $1 AND project_id = $2`,
        [attemptId, projectId],
      );
      await client.query(
        `UPDATE delivery_jobs
         SET attempt_count = 0, available_at = now(), claimed_by = NULL, lease_expires_at = NULL, completed_at = NULL
         WHERE delivery_attempt_id = $1`,
        [attemptId],
      );
      await client.query(
        `INSERT INTO delivery_replay_audit (id, delivery_attempt_id, project_id, requested_by, previous_failure_code, previous_attempt_count)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [randomUUID(), attemptId, projectId, requestedBy, current.failureCode ?? 'unknownFailure', current.attemptCount],
      );
      await client.query('COMMIT');
      return 'replayed';
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async complete(attemptId: string, status: 'delivered' | 'failed', providerMessageId: string, failureCode: string, isRetryable: boolean): Promise<void> {
    await this.database.query(
      `WITH updated AS (
        UPDATE delivery_attempts SET status = $2, provider_message_id = NULLIF($3, ''), failure_code = NULLIF($4, ''), is_retryable = $5, updated_at = now()
        WHERE id = $1 RETURNING id
      )
      UPDATE delivery_jobs AS jobs SET completed_at = now(), claimed_by = NULL, lease_expires_at = NULL
      FROM updated WHERE jobs.delivery_attempt_id = updated.id`,
      [attemptId, status, providerMessageId, failureCode, isRetryable],
    );
  }
}
