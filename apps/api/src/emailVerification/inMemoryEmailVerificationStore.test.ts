import { describe, expect, it } from 'vitest';
import { InMemoryEmailVerificationStore } from './inMemoryEmailVerificationStore.js';

const record = (overrides = {}) => ({ id: 'verification-1', projectId: 'project-1', templateId: 'template-1', recipientEmail: 'user@example.ru', tokenDigest: 'digest', idempotencyKey: 'request-1', redirectUrl: 'https://example.ru/done', status: 'pending' as const, expiresAt: '2026-01-01T00:15:00.000Z', ...overrides });

describe('InMemoryEmailVerificationStore', () => {
  it('issues once per project idempotency key and tracks delivery', async () => {
    const store = new InMemoryEmailVerificationStore();
    expect((await store.issue(record())).isNew).toBe(true);
    await store.markSent('verification-1');
    const duplicate = await store.issue(record({ id: 'verification-2', tokenDigest: 'other' }));
    expect(duplicate).toMatchObject({ isNew: false, record: { id: 'verification-1', status: 'sent' } });
    await store.markFailed('missing');
    await store.markSent('missing');
  });

  it('consumes a sent token once', async () => {
    const store = new InMemoryEmailVerificationStore();
    await store.issue(record());
    await store.markSent('verification-1');
    await expect(store.consume('digest', new Date('2026-01-01T00:10:00Z'))).resolves.toEqual({ status: 'confirmed', redirectUrl: 'https://example.ru/done' });
    await expect(store.consume('digest', new Date('2026-01-01T00:11:00Z'))).resolves.toEqual({ status: 'alreadyUsed' });
  });

  it('distinguishes expired and unusable tokens', async () => {
    const store = new InMemoryEmailVerificationStore();
    await store.issue(record());
    expect(await store.consume('missing', new Date())).toEqual({ status: 'invalid' });
    expect(await store.consume('digest', new Date('2026-01-01T00:01:00Z'))).toEqual({ status: 'invalid' });
    await store.markSent('verification-1');
    expect(await store.consume('digest', new Date('2026-01-01T00:15:00Z'))).toEqual({ status: 'expired' });
    const failed = new InMemoryEmailVerificationStore();
    await failed.issue(record());
    await failed.markFailed('verification-1');
    expect(await failed.consume('digest', new Date('2026-01-01T00:01:00Z'))).toEqual({ status: 'invalid' });
  });
});
