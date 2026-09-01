import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { FixedWindowRateLimiter } from '../security/fixedWindowRateLimiter.js';

async function setup(app: ReturnType<typeof createApp>) {
  const registration = await app.inject({ method: 'POST', url: '/v1/auth/register', payload: { email: `owner-${crypto.randomUUID()}@relayform.ru`, password: 'password1' } });
  const authorization = `Bearer ${registration.json().sessionToken as string}`;
  const project = await app.inject({ method: 'POST', url: '/v1/projects', headers: { authorization }, payload: { name: 'Verification' } });
  const template = await app.inject({ method: 'POST', url: `/v1/projects/${project.json().id}/email-templates`, headers: { authorization }, payload: { subject: 'Confirm', body: 'Confirm <account>', theme: 'light', redirectUrl: 'https://example.ru/done' } });
  return { authorization, project: project.json() as { id: string; apiKey: string }, templateId: template.json().id as string };
}

function tokenFrom(send: ReturnType<typeof vi.fn>): string {
  const html = send.mock.calls[0][0].html as string;
  const encoded = html.match(/token=([A-Za-z0-9_-]{43})/)?.[1];
  if (!encoded) throw new Error('token not found');
  return encoded;
}

describe('email verification API', () => {
  const apps: Array<ReturnType<typeof createApp>> = [];
  afterEach(async () => { await Promise.all(apps.splice(0).map((app) => app.close())); });

  it('sends once, hides sensitive values and consumes the token once', async () => {
    const send = vi.fn().mockResolvedValue({ providerMessageId: 'mail-1' });
    const app = createApp({ confirmationEmailSender: { send }, publicAppUrl: 'https://relayform.ru' });
    apps.push(app);
    const context = await setup(app);
    const request = { method: 'POST' as const, url: '/v1/email-verifications', headers: { 'x-api-key': context.project.apiKey, 'x-idempotency-key': 'signup-1' }, payload: { templateId: context.templateId, email: ' User@Example.RU ' } };
    const first = await app.inject(request);
    expect(first.statusCode).toBe(202);
    expect(first.json()).toEqual({ verificationId: expect.any(String), status: 'sent' });
    expect(first.body).not.toContain('User@Example');
    expect(first.body).not.toContain('token');
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: 'user@example.ru', subject: 'Confirm', html: expect.stringContaining('Confirm &lt;account&gt;') }));
    const duplicate = await app.inject(request);
    expect(duplicate.statusCode).toBe(200);
    expect(duplicate.json()).toEqual({ verificationId: first.json().verificationId, status: 'sent' });
    expect(send).toHaveBeenCalledOnce();
    const token = tokenFrom(send);
    const confirmed = await app.inject({ method: 'POST', url: '/v1/email-verifications/confirm', payload: { token } });
    expect(confirmed.json()).toEqual({ status: 'confirmed', redirectUrl: 'https://example.ru/done' });
    expect((await app.inject({ method: 'POST', url: '/v1/email-verifications/confirm', payload: { token } })).json()).toEqual({ error: 'verificationAlreadyUsed' });
  });

  it('validates authentication, ownership and public token input', async () => {
    const send = vi.fn().mockResolvedValue({ providerMessageId: 'mail-1' });
    const app = createApp({ confirmationEmailSender: { send }, publicAppUrl: 'https://relayform.ru' });
    apps.push(app);
    const context = await setup(app);
    expect((await app.inject({ method: 'POST', url: '/v1/email-verifications', payload: {} })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/v1/email-verifications', headers: { 'x-api-key': context.project.apiKey }, payload: { templateId: context.templateId, email: 'bad' } })).json()).toEqual({ error: 'invalidVerificationRequest' });
    expect((await app.inject({ method: 'POST', url: '/v1/email-verifications', headers: { 'x-api-key': context.project.apiKey, 'x-idempotency-key': 'x'.repeat(129) }, payload: { templateId: context.templateId, email: 'user@example.ru' } })).statusCode).toBe(400);
    const other = await app.inject({ method: 'POST', url: '/v1/projects', headers: { authorization: context.authorization }, payload: { name: 'Other' } });
    expect((await app.inject({ method: 'POST', url: '/v1/email-verifications', headers: { 'x-api-key': other.json().apiKey, 'x-idempotency-key': 'foreign' }, payload: { templateId: context.templateId, email: 'user@example.ru' } })).statusCode).toBe(404);
    expect((await app.inject({ method: 'POST', url: '/v1/email-verifications/confirm', payload: {} })).statusCode).toBe(400);
    expect((await app.inject({ method: 'POST', url: '/v1/email-verifications/confirm', payload: { token: 'x'.repeat(43) } })).json()).toEqual({ error: 'verificationNotFound' });
    expect(send).not.toHaveBeenCalled();
  });

  it('returns expired for a delivered token after its lifetime', async () => {
    let current = new Date('2026-01-01T00:00:00Z');
    const send = vi.fn().mockResolvedValue({ providerMessageId: 'mail-1' });
    const app = createApp({ confirmationEmailSender: { send }, publicAppUrl: 'https://relayform.ru', now: () => current });
    apps.push(app);
    const context = await setup(app);
    await app.inject({ method: 'POST', url: '/v1/email-verifications', headers: { 'x-api-key': context.project.apiKey, 'x-idempotency-key': 'expires' }, payload: { templateId: context.templateId, email: 'user@example.ru' } });
    current = new Date('2026-01-01T00:15:00Z');
    const response = await app.inject({ method: 'POST', url: '/v1/email-verifications/confirm', payload: { token: tokenFrom(send) } });
    expect(response.statusCode).toBe(410);
    expect(response.json()).toEqual({ error: 'verificationExpired' });
  });

  it('returns a stable failure and marks a provider-rejected request unusable', async () => {
    const send = vi.fn().mockRejectedValue(new Error('secret provider detail'));
    const app = createApp({ confirmationEmailSender: { send }, publicAppUrl: 'https://relayform.ru' });
    apps.push(app);
    const context = await setup(app);
    const failed = await app.inject({ method: 'POST', url: '/v1/email-verifications', headers: { 'x-api-key': context.project.apiKey, 'x-idempotency-key': 'failed' }, payload: { templateId: context.templateId, email: 'user@example.ru' } });
    expect(failed.statusCode).toBe(503);
    expect(failed.json()).toEqual({ error: 'emailDeliveryUnavailable' });
    expect(failed.body).not.toContain('secret');
    expect((await app.inject({ method: 'POST', url: '/v1/email-verifications/confirm', payload: { token: tokenFrom(send) } })).statusCode).toBe(404);
  });

  it('requires complete delivery configuration and rate limits by project', async () => {
    const unavailable = createApp({ publicAppUrl: 'invalid' });
    apps.push(unavailable);
    const unavailableContext = await setup(unavailable);
    expect((await unavailable.inject({ method: 'POST', url: '/v1/email-verifications', headers: { 'x-api-key': unavailableContext.project.apiKey, 'x-idempotency-key': 'no-provider' }, payload: { templateId: unavailableContext.templateId, email: 'user@example.ru' } })).statusCode).toBe(503);

    const send = vi.fn().mockResolvedValue({ providerMessageId: 'mail-1' });
    const limited = createApp({ confirmationEmailSender: { send }, publicAppUrl: 'https://relayform.ru', emailVerificationRateLimiter: new FixedWindowRateLimiter(1, 10_000, () => 1_000) });
    apps.push(limited);
    const context = await setup(limited);
    const headers = { 'x-api-key': context.project.apiKey, 'x-idempotency-key': 'first' };
    await limited.inject({ method: 'POST', url: '/v1/email-verifications', headers, payload: { templateId: context.templateId, email: 'user@example.ru' } });
    const response = await limited.inject({ method: 'POST', url: '/v1/email-verifications', headers: { ...headers, 'x-idempotency-key': 'second' }, payload: { templateId: context.templateId, email: 'other@example.ru' } });
    expect(response.statusCode).toBe(429);
    expect(response.headers['retry-after']).toBe('10');
    expect(send).toHaveBeenCalledOnce();
  });
});
