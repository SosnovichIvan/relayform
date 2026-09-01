import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';

const vkConfig = { vkCommunityId: '123', vkCommunityUrl: 'https://vk.com/relayform', vkCallbackSecret: 'callback-secret', vkCallbackConfirmationCode: 'confirmation-code' };

async function setup(app: ReturnType<typeof createApp>, provider: 'vk' | 'email' = 'vk') {
  const registration = await app.inject({ method: 'POST', url: '/v1/auth/register', payload: { email: `owner-${crypto.randomUUID()}@relayform.ru`, password: 'password1' } });
  const authorization = `Bearer ${registration.json().sessionToken as string}`;
  const project = await app.inject({ method: 'POST', url: '/v1/projects', headers: { authorization }, payload: { name: 'VK' } });
  const form = await app.inject({ method: 'POST', url: `/v1/projects/${project.json().id}/forms`, headers: { authorization }, payload: { name: 'Lead', siteUrl: 'https://example.ru' } });
  const destination = await app.inject({ method: 'POST', url: `/v1/forms/${form.json().id}/destinations`, headers: { authorization }, payload: { provider, recipient: 'pending' } });
  return { authorization, project: project.json() as { apiKey: string }, destinationId: destination.json().id as string };
}

describe('VK destination activation API', () => {
  const apps: Array<ReturnType<typeof createApp>> = [];
  afterEach(async () => { await Promise.all(apps.splice(0).map((app) => app.close())); });

  it('issues a code, confirms Callback API and activates from the VK sender once', async () => {
    const notificationSend = vi.fn().mockResolvedValue({ providerMessageId: 'vk-message' });
    const app = createApp({ ...vkConfig, transports: { vk: { send: notificationSend } } });
    apps.push(app);
    const context = await setup(app);
    const activation = await app.inject({ method: 'POST', url: `/v1/destinations/${context.destinationId}/vk-activation`, headers: { authorization: context.authorization } });
    expect(activation.json()).toMatchObject({ status: 'pendingActivation', communityUrl: 'https://vk.com/relayform', command: expect.stringMatching(/^\/start [A-Za-z0-9_-]{32}$/) });
    expect(activation.body).not.toContain('callback-secret');
    const confirmation = await app.inject({ method: 'POST', url: '/v1/integrations/vk/callback', payload: { type: 'confirmation', group_id: 123, secret: 'callback-secret' } });
    expect(confirmation.body).toBe('confirmation-code');
    expect(confirmation.headers['content-type']).toContain('text/plain');
    const command = activation.json().command as string;
    expect((await app.inject({ method: 'POST', url: '/v1/integrations/vk/callback', payload: { type: 'message_new', group_id: 123, secret: 'callback-secret', object: { message: { from_id: 456, text: command } } } })).body).toBe('ok');
    expect((await app.inject({ method: 'GET', url: `/v1/destinations/${context.destinationId}/vk-activation`, headers: { authorization: context.authorization } })).json()).toEqual({ status: 'active' });
    expect((await app.inject({ method: 'POST', url: `/v1/destinations/${context.destinationId}/vk-activation`, headers: { authorization: context.authorization } })).json()).toEqual({ status: 'active' });
    const event = await app.inject({ method: 'POST', url: '/v1/events', headers: { 'x-api-key': context.project.apiKey, 'x-idempotency-key': 'vk-lead' }, payload: { eventId: 'vk-lead', destinationId: context.destinationId, message: 'Lead' } });
    expect(event.statusCode).toBe(202);
    await vi.waitFor(() => expect(notificationSend).toHaveBeenCalledWith({ recipient: '456', message: 'Lead' }));
    await app.inject({ method: 'POST', url: '/v1/integrations/vk/callback', payload: { type: 'message_new', group_id: 123, secret: 'callback-secret', object: { message: { from_id: 999, text: command } } } });
    await vi.waitFor(() => expect(notificationSend).toHaveBeenCalledTimes(1));
  });

  it('rejects untrusted callbacks and ignores malformed events', async () => {
    const app = createApp(vkConfig);
    apps.push(app);
    const context = await setup(app);
    const activation = await app.inject({ method: 'POST', url: `/v1/destinations/${context.destinationId}/vk-activation`, headers: { authorization: context.authorization } });
    expect((await app.inject({ method: 'POST', url: '/v1/integrations/vk/callback', payload: { type: 'message_new', group_id: 123, secret: 'wrong', object: { message: { from_id: 456, text: activation.json().command } } } })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/v1/integrations/vk/callback', payload: { type: 'message_new', group_id: 999, secret: 'callback-secret', object: { message: { from_id: 456, text: activation.json().command } } } })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/v1/integrations/vk/callback', payload: { type: 'message_new', group_id: 123, secret: 'callback-secret', object: { message: { from_id: -1, text: '/start invalid' } } } })).body).toBe('ok');
    expect((await app.inject({ method: 'GET', url: `/v1/destinations/${context.destinationId}/vk-activation`, headers: { authorization: context.authorization } })).json()).toEqual({ status: 'pendingActivation' });
  });

  it('enforces ownership, provider and complete configuration', async () => {
    const app = createApp(vkConfig);
    apps.push(app);
    const vk = await setup(app);
    const email = await setup(app, 'email');
    expect((await app.inject({ method: 'POST', url: `/v1/destinations/${vk.destinationId}/vk-activation` })).statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url: `/v1/destinations/${vk.destinationId}/vk-activation` })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: `/v1/destinations/${email.destinationId}/vk-activation`, headers: { authorization: email.authorization } })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: `/v1/destinations/${email.destinationId}/vk-activation`, headers: { authorization: email.authorization } })).statusCode).toBe(404);
    const unavailable = createApp({ ...vkConfig, vkCommunityUrl: 'https://evil.example/vk' });
    apps.push(unavailable);
    const pending = await setup(unavailable);
    expect((await unavailable.inject({ method: 'POST', url: `/v1/destinations/${pending.destinationId}/vk-activation`, headers: { authorization: pending.authorization } })).statusCode).toBe(503);
    const noConfirmation = createApp({ vkCommunityId: '123', vkCommunityUrl: 'https://vk.com/relayform', vkCallbackSecret: 'callback-secret' });
    apps.push(noConfirmation);
    expect((await noConfirmation.inject({ method: 'POST', url: '/v1/integrations/vk/callback', payload: { type: 'confirmation', group_id: 123, secret: 'callback-secret' } })).statusCode).toBe(503);
  });

  it('does not consume an expired code', async () => {
    let current = new Date('2026-01-01T00:00:00Z');
    const app = createApp({ ...vkConfig, now: () => current });
    apps.push(app);
    const context = await setup(app);
    const activation = await app.inject({ method: 'POST', url: `/v1/destinations/${context.destinationId}/vk-activation`, headers: { authorization: context.authorization } });
    current = new Date('2026-01-01T00:15:00Z');
    await app.inject({ method: 'POST', url: '/v1/integrations/vk/callback', payload: { type: 'message_new', group_id: 123, secret: 'callback-secret', object: { message: { from_id: 456, text: activation.json().command } } } });
    expect((await app.inject({ method: 'GET', url: `/v1/destinations/${context.destinationId}/vk-activation`, headers: { authorization: context.authorization } })).json()).toEqual({ status: 'pendingActivation' });
  });
});
