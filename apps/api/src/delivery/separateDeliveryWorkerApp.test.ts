import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';

describe('API with separate delivery worker', () => {
  const apps: Array<ReturnType<typeof createApp>> = [];
  afterEach(async () => { await Promise.all(apps.splice(0).map((app) => app.close())); });

  it('persists a queued event without calling the provider in the API process', async () => {
    const send = vi.fn().mockResolvedValue({ providerMessageId: 'message' });
    const app = createApp({ runDeliveryWorker: false, telegramBotUsername: 'relayform_bot', telegramWebhookSecret: 'webhook-secret', transports: { telegram: { send } } });
    apps.push(app);
    const registration = await app.inject({ method: 'POST', url: '/v1/auth/register', payload: { email: 'separate-worker@relayform.ru', password: 'password1' } });
    const authorization = `Bearer ${registration.json().sessionToken as string}`;
    const project = await app.inject({ method: 'POST', url: '/v1/projects', headers: { authorization }, payload: { name: 'Project' } });
    const form = await app.inject({ method: 'POST', url: `/v1/projects/${project.json().id}/forms`, headers: { authorization }, payload: { name: 'Lead', siteUrl: 'https://example.ru' } });
    const destination = await app.inject({ method: 'POST', url: `/v1/forms/${form.json().id}/destinations`, headers: { authorization }, payload: { provider: 'telegram', recipient: 'pending' } });
    const activation = await app.inject({ method: 'POST', url: `/v1/destinations/${destination.json().id}/telegram-activation`, headers: { authorization } });
    const token = new URL(activation.json().activationUrl as string).searchParams.get('start');
    await app.inject({ method: 'POST', url: '/v1/integrations/telegram/webhook', headers: { 'x-telegram-bot-api-secret-token': 'webhook-secret' }, payload: { message: { text: `/start ${token}`, chat: { id: 123 } } } });
    const event = await app.inject({ method: 'POST', url: '/v1/events', headers: { 'x-api-key': project.json().apiKey, 'x-idempotency-key': 'separate-worker' }, payload: { eventId: 'event-1', destinationId: destination.json().id, message: 'Lead' } });
    expect(event.statusCode).toBe(202);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(send).not.toHaveBeenCalled();
    const status = await app.inject({ method: 'GET', url: `/v1/delivery-attempts/${event.json().deliveryAttemptId}`, headers: { 'x-api-key': project.json().apiKey } });
    expect(status.json()).toMatchObject({ status: 'queued' });
  });
});
