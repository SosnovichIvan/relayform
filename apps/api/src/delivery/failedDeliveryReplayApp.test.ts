import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { InMemoryDeliveryRepository } from './inMemoryDeliveryRepository.js';

async function createOwner(app: ReturnType<typeof createApp>, email: string) {
  const registration = await app.inject({ method: 'POST', url: '/v1/auth/register', payload: { email, password: 'password1' } });
  const authorization = `Bearer ${registration.json().sessionToken as string}`;
  const project = await app.inject({ method: 'POST', url: '/v1/projects', headers: { authorization }, payload: { name: 'Project' } });
  const form = await app.inject({ method: 'POST', url: `/v1/projects/${project.json().id}/forms`, headers: { authorization }, payload: { name: 'Lead', siteUrl: 'https://example.ru' } });
  return { authorization, userProjectId: project.json().id as string, formId: form.json().id as string };
}

describe('failed delivery replay API', () => {
  const apps: Array<ReturnType<typeof createApp>> = [];
  afterEach(async () => { await Promise.all(apps.splice(0).map((app) => app.close())); });

  it('lists redacted failures and atomically replays one for the owner', async () => {
    const repository = new InMemoryDeliveryRepository();
    const app = createApp({ deliveryRepository: repository, runDeliveryWorker: false });
    apps.push(app);
    const owner = await createOwner(app, 'owner@relayform.ru');
    const attempt = await repository.accept({ projectId: owner.userProjectId, formId: owner.formId, eventId: 'event', destinationId: 'private-destination', idempotencyKey: 'private-key', provider: 'telegram', recipient: 'private-recipient', message: 'private-message' });
    await repository.claim('worker', 1_000);
    await repository.completeFailed(attempt.attemptId, 'providerUnavailable', true);
    const list = await app.inject({ method: 'GET', url: `/v1/projects/${owner.userProjectId}/failed-deliveries`, headers: { authorization: owner.authorization } });
    expect(list.json()).toMatchObject({ failures: [{ id: attempt.attemptId, formId: owner.formId, provider: 'telegram', failureCode: 'providerUnavailable', isRetryable: true }] });
    expect(list.body).not.toContain('private-message');
    expect(list.body).not.toContain('private-recipient');
    expect(list.body).not.toContain('private-destination');
    const replay = await app.inject({ method: 'POST', url: `/v1/projects/${owner.userProjectId}/delivery-attempts/${attempt.attemptId}/replay`, headers: { authorization: owner.authorization } });
    expect(replay.statusCode).toBe(202);
    expect(replay.json()).toEqual({ status: 'queued' });
    expect(repository.getReplayAudit()).toHaveLength(1);
    expect((await app.inject({ method: 'POST', url: `/v1/projects/${owner.userProjectId}/delivery-attempts/${attempt.attemptId}/replay`, headers: { authorization: owner.authorization } })).statusCode).toBe(409);
  });

  it('hides unknown and foreign resources and requires a session', async () => {
    const repository = new InMemoryDeliveryRepository();
    const app = createApp({ deliveryRepository: repository, runDeliveryWorker: false });
    apps.push(app);
    const owner = await createOwner(app, 'owner2@relayform.ru');
    const foreign = await createOwner(app, 'foreign@relayform.ru');
    const attempt = await repository.accept({ projectId: owner.userProjectId, formId: owner.formId, eventId: 'event', destinationId: 'destination', idempotencyKey: 'key', provider: 'email', recipient: 'owner@example.ru', message: 'Lead' });
    await repository.completeFailed(attempt.attemptId, 'providerRejected', false);
    expect((await app.inject({ method: 'GET', url: `/v1/projects/${owner.userProjectId}/failed-deliveries` })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: `/v1/projects/${owner.userProjectId}/delivery-attempts/${attempt.attemptId}/replay` })).statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url: `/v1/projects/${owner.userProjectId}/failed-deliveries`, headers: { authorization: foreign.authorization } })).statusCode).toBe(404);
    expect((await app.inject({ method: 'POST', url: `/v1/projects/${owner.userProjectId}/delivery-attempts/${attempt.attemptId}/replay`, headers: { authorization: foreign.authorization } })).statusCode).toBe(404);
    expect((await app.inject({ method: 'POST', url: `/v1/projects/${owner.userProjectId}/delivery-attempts/missing/replay`, headers: { authorization: owner.authorization } })).statusCode).toBe(404);
  });

  it('wakes the API-local worker after a successful replay', async () => {
    const repository = new InMemoryDeliveryRepository();
    const send = vi.fn().mockResolvedValue({ providerMessageId: 'message-1' });
    const app = createApp({ deliveryRepository: repository, transports: { email: { send } } });
    apps.push(app);
    const owner = await createOwner(app, 'wake@relayform.ru');
    const attempt = await repository.accept({ projectId: owner.userProjectId, formId: owner.formId, eventId: 'event', destinationId: 'destination', idempotencyKey: 'key', provider: 'email', recipient: 'owner@example.ru', message: 'Lead' });
    await repository.completeFailed(attempt.attemptId, 'providerUnavailable', true);
    expect((await app.inject({ method: 'POST', url: `/v1/projects/${owner.userProjectId}/delivery-attempts/${attempt.attemptId}/replay`, headers: { authorization: owner.authorization } })).statusCode).toBe(202);
    await vi.waitFor(() => expect(send).toHaveBeenCalledWith({ recipient: 'owner@example.ru', message: 'Lead' }));
  });
});
