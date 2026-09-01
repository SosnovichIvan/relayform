import { afterAll, describe, expect, it, vi } from 'vitest';
import { createApp } from './app.js';
import { FixedWindowRateLimiter } from './security/fixedWindowRateLimiter.js';

const activationSend = vi.fn().mockResolvedValue({ providerMessageId: 'activation-mail' });
const app = createApp({ confirmationEmailSender: { send: activationSend }, publicAppUrl: 'https://relayform.ru' });
afterAll(async () => app.close());

describe('backend foundation', () => {
  it('reports liveness without authentication', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('reports readiness without exposing infrastructure details', async () => {
    const response = await app.inject({ method: 'GET', url: '/ready' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ready' });
  });

  it('checks and closes the configured production database', async () => {
    const database = { query: vi.fn().mockResolvedValue({ rows: [] }), end: vi.fn().mockResolvedValue(undefined) };
    const databaseApp = createApp({ databaseUrl: 'postgresql://configured', database });
    expect((await databaseApp.inject({ method: 'GET', url: '/ready' })).json()).toEqual({ status: 'ready' });
    await databaseApp.close();
    expect(database.query).toHaveBeenCalledWith('SELECT 1');
    expect(database.end).toHaveBeenCalledOnce();
  });

  it('reports unavailable when the configured production database cannot be queried', async () => {
    const database = { query: vi.fn().mockRejectedValue(new Error('connection failed')), end: vi.fn().mockResolvedValue(undefined) };
    const databaseApp = createApp({ databaseUrl: 'postgresql://configured', database });
    const response = await databaseApp.inject({ method: 'GET', url: '/ready' });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ status: 'unavailable' });
    await databaseApp.close();
  });

  it('accepts a unique event and suppresses a duplicate delivery attempt', async () => {
    const registration = await app.inject({ method: 'POST', url: '/v1/auth/register', payload: { email: 'events@relayform.ru', password: 'password1' } });
    const sessionToken = registration.json().sessionToken as string;
    const project = await app.inject({ method: 'POST', url: '/v1/projects', headers: { authorization: `Bearer ${sessionToken}` }, payload: { name: 'Events' } });
    const form = await app.inject({ method: 'POST', url: `/v1/projects/${project.json().id}/forms`, headers: { authorization: `Bearer ${sessionToken}` }, payload: { name: 'Event form', siteUrl: 'https://example.ru/event' } });
    const destination = await app.inject({ method: 'POST', url: `/v1/forms/${form.json().id}/destinations`, headers: { authorization: `Bearer ${sessionToken}` }, payload: { provider: 'email', recipient: 'event-recipient@example.ru' } });
    await activateEmail(app, `Bearer ${sessionToken}`, destination.json().id, activationSend);
    const event = { eventId: 'event-1', destinationId: destination.json().id as string, message: 'New lead' };
    const headers = { 'x-api-key': project.json().apiKey as string, 'x-idempotency-key': 'event-1' };
    const first = await app.inject({ method: 'POST', url: '/v1/events', headers, payload: event });
    const second = await app.inject({ method: 'POST', url: '/v1/events', headers, payload: event });
    expect(first.statusCode).toBe(202);
    expect(first.json()).toMatchObject({ status: 'queued', deliveryAttemptId: expect.any(String) });
    expect(second.statusCode).toBe(200);
    expect(second.json()).toEqual({ status: 'duplicate', deliveryAttemptId: first.json().deliveryAttemptId });
    expect((await app.inject({ method: 'GET', url: `/v1/delivery-attempts/${first.json().deliveryAttemptId}` })).statusCode).toBe(401);
    const status = await app.inject({ method: 'GET', url: `/v1/delivery-attempts/${first.json().deliveryAttemptId}`, headers: { 'x-api-key': project.json().apiKey } });
    expect(status.json()).toMatchObject({ id: first.json().deliveryAttemptId, status: 'failed', failureCode: 'transportNotConfigured', isRetryable: false });
    expect(status.body).not.toContain('event-recipient');
    expect(status.body).not.toContain('New lead');
    const otherProject = await app.inject({ method: 'POST', url: '/v1/projects', headers: { authorization: `Bearer ${sessionToken}` }, payload: { name: 'Other events' } });
    expect((await app.inject({ method: 'GET', url: `/v1/delivery-attempts/${first.json().deliveryAttemptId}`, headers: { 'x-api-key': otherProject.json().apiKey } })).statusCode).toBe(404);
  });

  it('rejects an event without an idempotency scope', async () => {
    const response = await app.inject({ method: 'POST', url: '/v1/events', payload: { eventId: 'event-2' } });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'unauthorized' });
  });

  it('registers, authenticates and scopes projects to the session owner', async () => {
    const registration = await app.inject({ method: 'POST', url: '/v1/auth/register', payload: { email: 'owner@relayform.ru', password: 'password1' } });
    const token = registration.json().sessionToken as string;
    expect(registration.statusCode).toBe(201);
    const project = await app.inject({ method: 'POST', url: '/v1/projects', headers: { authorization: `Bearer ${token}` }, payload: { name: 'Landing' } });
    expect(project.statusCode).toBe(201);
    expect(project.json().apiKey).toMatch(/^rf_live_/);
    const form = await app.inject({ method: 'POST', url: `/v1/projects/${project.json().id}/forms`, headers: { authorization: `Bearer ${token}` }, payload: { name: 'Contact', siteUrl: 'https://example.ru/contact' } });
    expect(form.statusCode).toBe(201);
    expect((await app.inject({ method: 'GET', url: `/v1/forms/${form.json().id}`, headers: { authorization: `Bearer ${token}` } })).json()).toMatchObject({ name: 'Contact', siteUrl: 'https://example.ru/contact' });
    const destination = await app.inject({ method: 'POST', url: `/v1/forms/${form.json().id}/destinations`, headers: { authorization: `Bearer ${token}` }, payload: { provider: 'telegram', recipient: 'demo-recipient' } });
    expect(destination.json()).toMatchObject({ provider: 'telegram', status: 'pendingActivation' });
    expect((await app.inject({ method: 'PATCH', url: `/v1/destinations/${destination.json().id}`, headers: { authorization: `Bearer ${token}` }, payload: { recipient: 'updated-recipient' } })).json().recipient).toBe('updated-recipient');
    expect((await app.inject({ method: 'GET', url: `/v1/forms/${form.json().id}/destinations`, headers: { authorization: `Bearer ${token}` } })).json().destinations).toHaveLength(1);
    expect((await app.inject({ method: 'DELETE', url: `/v1/destinations/${destination.json().id}`, headers: { authorization: `Bearer ${token}` } })).statusCode).toBe(204);
    const template = await app.inject({ method: 'POST', url: `/v1/projects/${project.json().id}/email-templates`, headers: { authorization: `Bearer ${token}` }, payload: { subject: 'Confirm', body: 'Confirm your request', theme: 'light', redirectUrl: 'https://example.ru/done' } });
    expect(template.statusCode).toBe(201);
    expect((await app.inject({ method: 'GET', url: `/v1/email-templates/${template.json().id}`, headers: { authorization: `Bearer ${token}` } })).json()).toMatchObject({ subject: 'Confirm', theme: 'light' });
    expect((await app.inject({ method: 'PATCH', url: `/v1/email-templates/${template.json().id}`, headers: { authorization: `Bearer ${token}` }, payload: { subject: 'Updated', body: 'Updated body', theme: 'dark', redirectUrl: 'https://example.ru/updated' } })).json().subject).toBe('Updated');
    expect((await app.inject({ method: 'GET', url: `/v1/projects/${project.json().id}/email-templates`, headers: { authorization: `Bearer ${token}` } })).json().templates).toHaveLength(1);
    expect((await app.inject({ method: 'DELETE', url: `/v1/email-templates/${template.json().id}`, headers: { authorization: `Bearer ${token}` } })).statusCode).toBe(204);
    expect((await app.inject({ method: 'PATCH', url: `/v1/forms/${form.json().id}`, headers: { authorization: `Bearer ${token}` }, payload: { name: 'Updated contact', siteUrl: 'https://example.ru/updated' } })).json().name).toBe('Updated contact');
    const forms = await app.inject({ method: 'GET', url: `/v1/projects/${project.json().id}/forms`, headers: { authorization: `Bearer ${token}` } });
    expect(forms.json().forms).toHaveLength(1);
    expect((await app.inject({ method: 'DELETE', url: `/v1/forms/${form.json().id}`, headers: { authorization: `Bearer ${token}` } })).statusCode).toBe(204);
    expect((await app.inject({ method: 'GET', url: `/v1/projects/${project.json().id}/forms`, headers: { authorization: `Bearer ${token}` } })).json().forms).toHaveLength(0);
    const list = await app.inject({ method: 'GET', url: '/v1/projects', headers: { authorization: `Bearer ${token}` } });
    expect(list.json().projects).toHaveLength(1);
    const login = await app.inject({ method: 'POST', url: '/v1/auth/login', payload: { email: 'owner@relayform.ru', password: 'password1' } });
    expect(login.statusCode).toBe(200);
  });

  it('rejects invalid credentials, duplicate registration and unauthenticated projects', async () => {
    expect((await app.inject({ method: 'POST', url: '/v1/auth/register', payload: { email: 'bad' } })).statusCode).toBe(400);
    expect((await app.inject({ method: 'POST', url: '/v1/auth/register', payload: { email: 'owner@relayform.ru', password: 'password1' } })).statusCode).toBe(409);
    expect((await app.inject({ method: 'POST', url: '/v1/auth/login', payload: { email: 'owner@relayform.ru', password: 'wrong' } })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/v1/projects', payload: { name: 'No owner' } })).statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url: '/v1/projects' })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/v1/projects/missing/forms', headers: { authorization: 'Bearer invalid' }, payload: { name: 'No owner' } })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/v1/forms/missing/destinations', headers: { authorization: 'Bearer invalid' }, payload: { provider: 'invalid', recipient: 'nope' } })).statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url: '/v1/forms/missing/destinations' })).statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url: '/v1/projects/missing/email-templates' })).statusCode).toBe(401);
    expect((await app.inject({ method: 'DELETE', url: '/v1/destinations/missing' })).statusCode).toBe(401);
    expect((await app.inject({ method: 'DELETE', url: '/v1/email-templates/missing' })).statusCode).toBe(401);
    expect((await app.inject({ method: 'PATCH', url: '/v1/destinations/missing', payload: { recipient: 'none' } })).statusCode).toBe(401);
    expect((await app.inject({ method: 'PATCH', url: '/v1/email-templates/missing', payload: { subject: 'none', body: 'none' } })).statusCode).toBe(401);
    expect((await app.inject({ method: 'PATCH', url: '/v1/forms/missing', payload: { name: 'none' } })).statusCode).toBe(401);
    expect((await app.inject({ method: 'DELETE', url: '/v1/forms/missing' })).statusCode).toBe(401);
  });

  it('validates destination and template payloads for an authenticated owner', async () => {
    const registration = await app.inject({ method: 'POST', url: '/v1/auth/register', payload: { email: 'validation@relayform.ru', password: 'password1' } });
    const token = registration.json().sessionToken as string;
    const headers = { authorization: `Bearer ${token}` };
    expect((await app.inject({ method: 'POST', url: '/v1/forms/missing/destinations', headers, payload: { provider: 'invalid', recipient: 'nope' } })).statusCode).toBe(400);
    expect((await app.inject({ method: 'POST', url: '/v1/forms/missing/destinations', headers, payload: { provider: 'telegram', recipient: 'recipient' } })).statusCode).toBe(404);
    expect((await app.inject({ method: 'POST', url: '/v1/projects/missing/email-templates', headers, payload: { subject: '', body: '' } })).statusCode).toBe(400);
    expect((await app.inject({ method: 'POST', url: '/v1/projects/missing/email-templates', headers, payload: { subject: 'Subject', body: 'Body', theme: 'light', redirectUrl: 'https://example.ru' } })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: '/v1/forms/missing/destinations', headers })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: '/v1/projects/missing/email-templates', headers })).statusCode).toBe(404);
    expect((await app.inject({ method: 'DELETE', url: '/v1/destinations/missing', headers })).statusCode).toBe(404);
    expect((await app.inject({ method: 'DELETE', url: '/v1/email-templates/missing', headers })).statusCode).toBe(404);
    expect((await app.inject({ method: 'PATCH', url: '/v1/destinations/missing', headers, payload: {} })).statusCode).toBe(400);
    expect((await app.inject({ method: 'PATCH', url: '/v1/email-templates/missing', headers, payload: {} })).statusCode).toBe(400);
    expect((await app.inject({ method: 'PATCH', url: '/v1/destinations/missing', headers, payload: { recipient: 'none' } })).statusCode).toBe(404);
    expect((await app.inject({ method: 'PATCH', url: '/v1/email-templates/missing', headers, payload: { subject: 'none', body: 'none', theme: 'light', redirectUrl: 'https://example.ru' } })).statusCode).toBe(404);
    expect((await app.inject({ method: 'PATCH', url: '/v1/forms/missing', headers, payload: {} })).statusCode).toBe(400);
    expect((await app.inject({ method: 'PATCH', url: '/v1/forms/missing', headers, payload: { name: 'Unsafe', siteUrl: 'javascript:alert(1)' } })).statusCode).toBe(400);
    expect((await app.inject({ method: 'PATCH', url: '/v1/forms/missing', headers, payload: { name: 'none', siteUrl: 'https://example.ru' } })).statusCode).toBe(404);
    expect((await app.inject({ method: 'DELETE', url: '/v1/forms/missing', headers })).statusCode).toBe(404);
  });

  it('rejects invalid project keys, missing idempotency keys and a destination from another project', async () => {
    const owner = await app.inject({ method: 'POST', url: '/v1/auth/register', payload: { email: 'event-owner@relayform.ru', password: 'password1' } });
    const ownerHeaders = { authorization: `Bearer ${owner.json().sessionToken as string}` };
    const project = await app.inject({ method: 'POST', url: '/v1/projects', headers: ownerHeaders, payload: { name: 'Owner project' } });
    const foreignOwner = await app.inject({ method: 'POST', url: '/v1/auth/register', payload: { email: 'foreign-owner@relayform.ru', password: 'password1' } });
    const foreignHeaders = { authorization: `Bearer ${foreignOwner.json().sessionToken as string}` };
    const foreignProject = await app.inject({ method: 'POST', url: '/v1/projects', headers: foreignHeaders, payload: { name: 'Foreign project' } });
    const foreignForm = await app.inject({ method: 'POST', url: `/v1/projects/${foreignProject.json().id}/forms`, headers: foreignHeaders, payload: { name: 'Foreign form', siteUrl: 'https://foreign.example.ru' } });
    const foreignDestination = await app.inject({ method: 'POST', url: `/v1/forms/${foreignForm.json().id}/destinations`, headers: foreignHeaders, payload: { provider: 'email', recipient: 'foreign@relayform.ru' } });
    expect((await app.inject({ method: 'POST', url: '/v1/events', payload: { eventId: 'event-2', destinationId: foreignDestination.json().id } })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/v1/events', headers: { 'x-api-key': project.json().apiKey }, payload: { eventId: 'event-2', destinationId: foreignDestination.json().id } })).statusCode).toBe(400);
    expect((await app.inject({ method: 'POST', url: '/v1/events', headers: { 'x-api-key': project.json().apiKey, 'x-idempotency-key': 'event-2' }, payload: { eventId: 'event-2', destinationId: foreignDestination.json().id, message: 'Foreign lead' } })).statusCode).toBe(404);
  });

  it('rate limits event intake per authenticated project', async () => {
    const send = vi.fn().mockResolvedValue({ providerMessageId: 'email-1' });
    const emailActivationSend = vi.fn().mockResolvedValue({ providerMessageId: 'activation-mail' });
    const limitedApp = createApp({ eventRateLimiter: new FixedWindowRateLimiter(1, 10_000, () => 1_000), transports: { email: { send } }, confirmationEmailSender: { send: emailActivationSend }, publicAppUrl: 'https://relayform.ru' });
    const registration = await limitedApp.inject({ method: 'POST', url: '/v1/auth/register', payload: { email: 'limited@relayform.ru', password: 'password1' } });
    const authorization = `Bearer ${registration.json().sessionToken as string}`;
    const project = await limitedApp.inject({ method: 'POST', url: '/v1/projects', headers: { authorization }, payload: { name: 'Limited' } });
    const form = await limitedApp.inject({ method: 'POST', url: `/v1/projects/${project.json().id}/forms`, headers: { authorization }, payload: { name: 'Contact', siteUrl: 'https://example.ru/contact' } });
    const destination = await limitedApp.inject({ method: 'POST', url: `/v1/forms/${form.json().id}/destinations`, headers: { authorization }, payload: { provider: 'email', recipient: 'limited@relayform.ru' } });
    await activateEmail(limitedApp, authorization, destination.json().id, emailActivationSend);
    const eventHeaders = { 'x-api-key': project.json().apiKey as string, 'x-idempotency-key': 'first' };
    const firstDelivery = await limitedApp.inject({ method: 'POST', url: '/v1/events', headers: eventHeaders, payload: { eventId: 'first', destinationId: destination.json().id, message: 'First lead' } });
    expect(firstDelivery.statusCode).toBe(202);
    await vi.waitFor(() => expect(send).toHaveBeenCalledOnce());
    const deliveredStatus = await limitedApp.inject({ method: 'GET', url: `/v1/delivery-attempts/${firstDelivery.json().deliveryAttemptId}`, headers: { 'x-api-key': project.json().apiKey } });
    expect(deliveredStatus.json()).toMatchObject({ status: 'delivered', providerMessageId: 'email-1' });
    const limited = await limitedApp.inject({ method: 'POST', url: '/v1/events', headers: { ...eventHeaders, 'x-idempotency-key': 'second' }, payload: { eventId: 'second', destinationId: destination.json().id, message: 'Second lead' } });
    expect(limited.statusCode).toBe(429);
    expect(limited.headers['retry-after']).toBe('10');
    expect(limited.json()).toEqual({ error: 'rateLimitExceeded' });
    expect(send).toHaveBeenCalledOnce();
    await limitedApp.close();
  });

  it('activates a Telegram destination through a one-time protected bot-start webhook', async () => {
    const telegramApp = createApp({ telegramBotUsername: '@relayform_bot', telegramWebhookSecret: 'webhook-secret' });
    const registration = await telegramApp.inject({ method: 'POST', url: '/v1/auth/register', payload: { email: 'telegram-owner@relayform.ru', password: 'password1' } });
    const authorization = `Bearer ${registration.json().sessionToken as string}`;
    const project = await telegramApp.inject({ method: 'POST', url: '/v1/projects', headers: { authorization }, payload: { name: 'Telegram' } });
    const form = await telegramApp.inject({ method: 'POST', url: `/v1/projects/${project.json().id}/forms`, headers: { authorization }, payload: { name: 'Contact', siteUrl: 'https://example.ru/contact' } });
    const destination = await telegramApp.inject({ method: 'POST', url: `/v1/forms/${form.json().id}/destinations`, headers: { authorization }, payload: { provider: 'telegram', recipient: 'pending' } });
    const activation = await telegramApp.inject({ method: 'POST', url: `/v1/destinations/${destination.json().id}/telegram-activation`, headers: { authorization } });
    expect(activation.statusCode).toBe(200);
    expect(activation.json().activationUrl).toMatch(/^https:\/\/t\.me\/relayform_bot\?start=[A-Za-z0-9_-]{32}$/);
    const code = new URL(activation.json().activationUrl).searchParams.get('start')!;
    const update = { message: { text: `/start ${code}`, chat: { id: 777 } } };
    expect((await telegramApp.inject({ method: 'POST', url: '/v1/integrations/telegram/webhook', headers: { 'x-telegram-bot-api-secret-token': 'wrong' }, payload: update })).statusCode).toBe(401);
    expect((await telegramApp.inject({ method: 'POST', url: '/v1/integrations/telegram/webhook', headers: { 'x-telegram-bot-api-secret-token': 'webhook-secret' }, payload: update })).json()).toEqual({ ok: true });
    expect((await telegramApp.inject({ method: 'POST', url: '/v1/integrations/telegram/webhook', headers: { 'x-telegram-bot-api-secret-token': 'webhook-secret' }, payload: update })).json()).toEqual({ ok: true });
    const destinations = await telegramApp.inject({ method: 'GET', url: `/v1/forms/${form.json().id}/destinations`, headers: { authorization } });
    expect(destinations.json().destinations).toMatchObject([{ recipient: '777', status: 'active' }]);
    expect((await telegramApp.inject({ method: 'POST', url: `/v1/destinations/${destination.json().id}/telegram-activation`, headers: { authorization } })).statusCode).toBe(409);
    await telegramApp.close();
  });
});

async function activateEmail(targetApp: ReturnType<typeof createApp>, authorization: string, destinationId: string, send: ReturnType<typeof vi.fn>) {
  await targetApp.inject({ method: 'POST', url: `/v1/destinations/${destinationId}/email-activation`, headers: { authorization } });
  const html = send.mock.calls.at(-1)?.[0].html as string;
  const token = html.match(/token=([A-Za-z0-9_-]{43})/)?.[1];
  if (!token) throw new Error('activation token missing');
  const response = await targetApp.inject({ method: 'POST', url: '/v1/destination-email-activations/confirm', payload: { token } });
  expect(response.statusCode).toBe(200);
}
