import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';

const maxConfig = { maxBotUsername: 'relayform_bot', maxWebhookSecret: 'max-secret' };

async function setup(app: ReturnType<typeof createApp>, provider: 'max' | 'email' = 'max') {
  const registration = await app.inject({ method: 'POST', url: '/v1/auth/register', payload: { email: `owner-${crypto.randomUUID()}@relayform.ru`, password: 'password1' } });
  const authorization = `Bearer ${registration.json().sessionToken as string}`;
  const project = await app.inject({ method: 'POST', url: '/v1/projects', headers: { authorization }, payload: { name: 'MAX' } });
  const form = await app.inject({ method: 'POST', url: `/v1/projects/${project.json().id}/forms`, headers: { authorization }, payload: { name: 'Lead', siteUrl: 'https://example.ru' } });
  const destination = await app.inject({ method: 'POST', url: `/v1/forms/${form.json().id}/destinations`, headers: { authorization }, payload: { provider, recipient: 'pending' } });
  return { authorization, project: project.json() as { apiKey: string }, destinationId: destination.json().id as string };
}

describe('MAX destination activation API', () => {
  const apps: Array<ReturnType<typeof createApp>> = [];
  afterEach(async () => { await Promise.all(apps.splice(0).map((app) => app.close())); });

  it('issues a deep link, activates from bot_started once and delivers to that user', async () => {
    const notificationSend = vi.fn().mockResolvedValue({ providerMessageId: 'max-message' });
    const app = createApp({ ...maxConfig, transports: { max: { send: notificationSend } } });
    apps.push(app);
    const context = await setup(app);
    const activation = await app.inject({ method: 'POST', url: `/v1/destinations/${context.destinationId}/max-activation`, headers: { authorization: context.authorization } });
    expect(activation.json()).toMatchObject({ status: 'pendingActivation', activationUrl: expect.stringMatching(/^https:\/\/max\.ru\/relayform_bot\?start=[A-Za-z0-9_-]{32}$/) });
    expect(activation.body).not.toContain('max-secret');
    const token = new URL(activation.json().activationUrl as string).searchParams.get('start');
    expect((await app.inject({ method: 'POST', url: '/v1/integrations/max/webhook', headers: { 'x-max-bot-api-secret': 'max-secret' }, payload: { update_type: 'bot_started', user: { user_id: 456 }, payload: token } })).json()).toEqual({ ok: true });
    expect((await app.inject({ method: 'GET', url: `/v1/destinations/${context.destinationId}/max-activation`, headers: { authorization: context.authorization } })).json()).toEqual({ status: 'active' });
    expect((await app.inject({ method: 'POST', url: `/v1/destinations/${context.destinationId}/max-activation`, headers: { authorization: context.authorization } })).json()).toEqual({ status: 'active' });
    const event = await app.inject({ method: 'POST', url: '/v1/events', headers: { 'x-api-key': context.project.apiKey, 'x-idempotency-key': 'max-lead' }, payload: { eventId: 'max-lead', destinationId: context.destinationId, message: 'Lead' } });
    expect(event.statusCode).toBe(202);
    await vi.waitFor(() => expect(notificationSend).toHaveBeenCalledWith({ recipient: '456', message: 'Lead' }));
    await app.inject({ method: 'POST', url: '/v1/integrations/max/webhook', headers: { 'x-max-bot-api-secret': 'max-secret' }, payload: { update_type: 'bot_started', user: { user_id: 999 }, payload: token } });
    await vi.waitFor(() => expect(notificationSend).toHaveBeenCalledTimes(1));
  });

  it('rejects untrusted webhooks and ignores malformed updates', async () => {
    const app = createApp(maxConfig);
    apps.push(app);
    const context = await setup(app);
    const activation = await app.inject({ method: 'POST', url: `/v1/destinations/${context.destinationId}/max-activation`, headers: { authorization: context.authorization } });
    const token = new URL(activation.json().activationUrl as string).searchParams.get('start');
    expect((await app.inject({ method: 'POST', url: '/v1/integrations/max/webhook', headers: { 'x-max-bot-api-secret': 'wrong' }, payload: { update_type: 'bot_started', user: { user_id: 456 }, payload: token } })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/v1/integrations/max/webhook', headers: { 'x-max-bot-api-secret': 'max-secret' }, payload: { update_type: 'message_created', user: { user_id: -1 }, payload: 'invalid' } })).json()).toEqual({ ok: true });
    expect((await app.inject({ method: 'GET', url: `/v1/destinations/${context.destinationId}/max-activation`, headers: { authorization: context.authorization } })).json()).toEqual({ status: 'pendingActivation' });
  });

  it('enforces ownership, provider and complete configuration', async () => {
    const app = createApp(maxConfig);
    apps.push(app);
    const max = await setup(app);
    const email = await setup(app, 'email');
    expect((await app.inject({ method: 'POST', url: `/v1/destinations/${max.destinationId}/max-activation` })).statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url: `/v1/destinations/${max.destinationId}/max-activation` })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: `/v1/destinations/${email.destinationId}/max-activation`, headers: { authorization: email.authorization } })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: `/v1/destinations/${email.destinationId}/max-activation`, headers: { authorization: email.authorization } })).statusCode).toBe(404);
    const unavailable = createApp({ maxBotUsername: 'bad/user', maxWebhookSecret: 'max-secret' });
    apps.push(unavailable);
    const pending = await setup(unavailable);
    expect((await unavailable.inject({ method: 'POST', url: `/v1/destinations/${pending.destinationId}/max-activation`, headers: { authorization: pending.authorization } })).statusCode).toBe(503);
  });

  it('does not consume an expired token', async () => {
    let current = new Date('2026-01-01T00:00:00Z');
    const app = createApp({ ...maxConfig, now: () => current });
    apps.push(app);
    const context = await setup(app);
    const activation = await app.inject({ method: 'POST', url: `/v1/destinations/${context.destinationId}/max-activation`, headers: { authorization: context.authorization } });
    current = new Date('2026-01-01T00:15:00Z');
    const token = new URL(activation.json().activationUrl as string).searchParams.get('start');
    await app.inject({ method: 'POST', url: '/v1/integrations/max/webhook', headers: { 'x-max-bot-api-secret': 'max-secret' }, payload: { update_type: 'bot_started', user: { user_id: 456 }, payload: token } });
    expect((await app.inject({ method: 'GET', url: `/v1/destinations/${context.destinationId}/max-activation`, headers: { authorization: context.authorization } })).json()).toEqual({ status: 'pendingActivation' });
  });
});
