import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';

async function setup(app: ReturnType<typeof createApp>, provider: 'email' | 'telegram' = 'email', recipient = 'owner@example.ru') {
  const registration = await app.inject({ method: 'POST', url: '/v1/auth/register', payload: { email: `owner-${crypto.randomUUID()}@relayform.ru`, password: 'password1' } });
  const authorization = `Bearer ${registration.json().sessionToken as string}`;
  const project = await app.inject({ method: 'POST', url: '/v1/projects', headers: { authorization }, payload: { name: 'Activation' } });
  const form = await app.inject({ method: 'POST', url: `/v1/projects/${project.json().id}/forms`, headers: { authorization }, payload: { name: 'Lead', siteUrl: 'https://example.ru' } });
  const destination = await app.inject({ method: 'POST', url: `/v1/forms/${form.json().id}/destinations`, headers: { authorization }, payload: { provider, recipient } });
  return { authorization, project: project.json() as { id: string; apiKey: string }, formId: form.json().id as string, destinationId: destination.json().id as string };
}

function tokenFrom(send: ReturnType<typeof vi.fn>): string {
  const html = send.mock.calls.at(-1)?.[0].html as string;
  const token = html.match(/token=([A-Za-z0-9_-]{43})/)?.[1];
  if (!token) throw new Error('token missing');
  return token;
}

describe('e-mail destination activation API', () => {
  const apps: Array<ReturnType<typeof createApp>> = [];
  afterEach(async () => { await Promise.all(apps.splice(0).map((app) => app.close())); });

  it('blocks pending delivery, activates once and then delivers through e-mail', async () => {
    const activationSend = vi.fn().mockResolvedValue({ providerMessageId: 'activation-mail' });
    const notificationSend = vi.fn().mockResolvedValue({ providerMessageId: 'lead-mail' });
    const app = createApp({ confirmationEmailSender: { send: activationSend }, publicAppUrl: 'https://relayform.ru', transports: { email: { send: notificationSend } } });
    apps.push(app);
    const context = await setup(app);
    const eventRequest = { method: 'POST' as const, url: '/v1/events', headers: { 'x-api-key': context.project.apiKey, 'x-idempotency-key': 'lead-1' }, payload: { eventId: 'lead-1', destinationId: context.destinationId, message: 'Private lead' } };
    expect((await app.inject(eventRequest)).statusCode).toBe(404);
    const issued = await app.inject({ method: 'POST', url: `/v1/destinations/${context.destinationId}/email-activation`, headers: { authorization: context.authorization } });
    expect(issued.statusCode).toBe(200);
    expect(issued.json()).toEqual({ status: 'sent', expiresAt: expect.any(String) });
    expect(issued.body).not.toContain('owner@example.ru');
    expect(issued.body).not.toContain('token');
    const token = tokenFrom(activationSend);
    expect((await app.inject({ method: 'POST', url: '/v1/destination-email-activations/confirm', payload: { token } })).json()).toEqual({ status: 'confirmed' });
    expect((await app.inject({ method: 'POST', url: '/v1/destination-email-activations/confirm', payload: { token } })).json()).toEqual({ error: 'activationAlreadyUsed' });
    const destinations = await app.inject({ method: 'GET', url: `/v1/forms/${context.formId}/destinations`, headers: { authorization: context.authorization } });
    expect(destinations.json().destinations).toMatchObject([{ provider: 'email', status: 'active' }]);
    expect((await app.inject({ method: 'POST', url: `/v1/destinations/${context.destinationId}/email-activation`, headers: { authorization: context.authorization } })).statusCode).toBe(409);
    const accepted = await app.inject(eventRequest);
    expect(accepted.statusCode).toBe(202);
    await vi.waitFor(() => expect(notificationSend).toHaveBeenCalledWith({ recipient: 'owner@example.ru', message: 'Private lead' }));
  });

  it('validates ownership, provider, configuration and token shape', async () => {
    const app = createApp({ confirmationEmailSender: { send: vi.fn() }, publicAppUrl: 'https://relayform.ru' });
    apps.push(app);
    const email = await setup(app);
    const telegram = await setup(app, 'telegram', 'pending');
    expect((await app.inject({ method: 'POST', url: `/v1/destinations/${email.destinationId}/email-activation` })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: `/v1/destinations/${telegram.destinationId}/email-activation`, headers: { authorization: telegram.authorization } })).statusCode).toBe(404);
    expect((await app.inject({ method: 'POST', url: '/v1/destinations/missing/email-activation', headers: { authorization: email.authorization } })).statusCode).toBe(404);
    expect((await app.inject({ method: 'POST', url: '/v1/destination-email-activations/confirm', payload: {} })).statusCode).toBe(400);
    expect((await app.inject({ method: 'POST', url: '/v1/destination-email-activations/confirm', payload: { token: 'x'.repeat(43) } })).statusCode).toBe(404);

    const unavailable = createApp({ publicAppUrl: 'invalid' });
    apps.push(unavailable);
    const unavailableContext = await setup(unavailable);
    expect((await unavailable.inject({ method: 'POST', url: `/v1/destinations/${unavailableContext.destinationId}/email-activation`, headers: { authorization: unavailableContext.authorization } })).statusCode).toBe(503);
    const invalidRecipient = await setup(app, 'email', 'not-an-email');
    expect((await app.inject({ method: 'POST', url: `/v1/destinations/${invalidRecipient.destinationId}/email-activation`, headers: { authorization: invalidRecipient.authorization } })).statusCode).toBe(503);
  });

  it('invalidates provider-failed activation and reports expiry', async () => {
    let current = new Date('2026-01-01T00:00:00Z');
    const failedSend = vi.fn().mockRejectedValue(new Error('private provider detail'));
    const failedApp = createApp({ confirmationEmailSender: { send: failedSend }, publicAppUrl: 'https://relayform.ru', now: () => current });
    apps.push(failedApp);
    const failed = await setup(failedApp);
    const response = await failedApp.inject({ method: 'POST', url: `/v1/destinations/${failed.destinationId}/email-activation`, headers: { authorization: failed.authorization } });
    expect(response.statusCode).toBe(503);
    expect(response.body).not.toContain('private');
    expect((await failedApp.inject({ method: 'POST', url: '/v1/destination-email-activations/confirm', payload: { token: tokenFrom(failedSend) } })).statusCode).toBe(404);

    const send = vi.fn().mockResolvedValue({ providerMessageId: 'activation-mail' });
    const expiredApp = createApp({ confirmationEmailSender: { send }, publicAppUrl: 'https://relayform.ru', now: () => current });
    apps.push(expiredApp);
    const expired = await setup(expiredApp);
    await expiredApp.inject({ method: 'POST', url: `/v1/destinations/${expired.destinationId}/email-activation`, headers: { authorization: expired.authorization } });
    current = new Date('2026-01-01T00:15:00Z');
    const expiredResponse = await expiredApp.inject({ method: 'POST', url: '/v1/destination-email-activations/confirm', payload: { token: tokenFrom(send) } });
    expect(expiredResponse.statusCode).toBe(410);
    expect(expiredResponse.json()).toEqual({ error: 'activationExpired' });
  });
});
