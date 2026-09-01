import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';

async function setup(app: ReturnType<typeof createApp>, email = `stats-${crypto.randomUUID()}@relayform.ru`) {
  const registration = await app.inject({ method: 'POST', url: '/v1/auth/register', payload: { email, password: 'password1' } });
  const authorization = `Bearer ${registration.json().sessionToken as string}`;
  const project = await app.inject({ method: 'POST', url: '/v1/projects', headers: { authorization }, payload: { name: 'Stats' } });
  const form = await app.inject({ method: 'POST', url: `/v1/projects/${project.json().id}/forms`, headers: { authorization }, payload: { name: 'Lead form', siteUrl: 'https://example.ru' } });
  return { authorization, project: project.json() as { id: string; apiKey: string }, formId: form.json().id as string };
}

describe('delivery statistics API', () => {
  const apps: Array<ReturnType<typeof createApp>> = [];
  afterEach(async () => { await Promise.all(apps.splice(0).map((app) => app.close())); });

  it('returns safe 30-day project and form aggregates', async () => {
    const send = vi.fn().mockResolvedValue({ providerMessageId: 'provider-message' });
    const activationSend = vi.fn().mockResolvedValue({ providerMessageId: 'activation-message' });
    const app = createApp({ transports: { email: { send } }, confirmationEmailSender: { send: activationSend }, publicAppUrl: 'https://relayform.ru' });
    apps.push(app);
    const context = await setup(app);
    const destination = await app.inject({ method: 'POST', url: `/v1/forms/${context.formId}/destinations`, headers: { authorization: context.authorization }, payload: { provider: 'email', recipient: 'private@example.ru' } });
    await activateEmail(app, context.authorization, destination.json().id, activationSend);
    const event = await app.inject({ method: 'POST', url: '/v1/events', headers: { 'x-api-key': context.project.apiKey, 'x-idempotency-key': 'stats-1' }, payload: { eventId: 'stats-1', destinationId: destination.json().id, message: 'private message' } });
    await vi.waitFor(async () => {
      const status = await app.inject({ method: 'GET', url: `/v1/delivery-attempts/${event.json().deliveryAttemptId}`, headers: { 'x-api-key': context.project.apiKey } });
      expect(status.json().status).toBe('delivered');
    });
    const response = await app.inject({ method: 'GET', url: `/v1/projects/${context.project.id}/delivery-stats`, headers: { authorization: context.authorization } });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ periodDays: 30, total: 1, delivered: 1, failed: 0, queued: 0, forms: [{ formId: context.formId, total: 1, delivered: 1, failed: 0, queued: 0, providers: [{ provider: 'email', total: 1, delivered: 1, failed: 0, queued: 0 }] }] });
    expect(response.body).not.toContain('private@example.ru');
    expect(response.body).not.toContain('private message');
    expect(response.body).not.toContain('provider-message');
  });

  it('returns zero aggregates and enforces session ownership', async () => {
    const app = createApp();
    apps.push(app);
    const owner = await setup(app);
    expect((await app.inject({ method: 'GET', url: `/v1/projects/${owner.project.id}/delivery-stats` })).statusCode).toBe(401);
    const empty = await app.inject({ method: 'GET', url: `/v1/projects/${owner.project.id}/delivery-stats`, headers: { authorization: owner.authorization } });
    expect(empty.json()).toEqual({ periodDays: 30, total: 0, delivered: 0, failed: 0, queued: 0, forms: [] });
    const foreign = await setup(app);
    expect((await app.inject({ method: 'GET', url: `/v1/projects/${owner.project.id}/delivery-stats`, headers: { authorization: foreign.authorization } })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: '/v1/projects/missing/delivery-stats', headers: { authorization: owner.authorization } })).statusCode).toBe(404);
  });
});

async function activateEmail(targetApp: ReturnType<typeof createApp>, authorization: string, destinationId: string, send: ReturnType<typeof vi.fn>) {
  await targetApp.inject({ method: 'POST', url: `/v1/destinations/${destinationId}/email-activation`, headers: { authorization } });
  const token = (send.mock.calls.at(-1)?.[0].html as string).match(/token=([A-Za-z0-9_-]{43})/)?.[1];
  if (!token) throw new Error('activation token missing');
  await targetApp.inject({ method: 'POST', url: '/v1/destination-email-activations/confirm', payload: { token } });
}
