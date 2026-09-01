import { describe, expect, it, vi } from 'vitest';
import { hashSecret } from '../auth/credentialService.js';
import { PostgresIdentityStore, type PostgresExecutor } from './postgresIdentityStore.js';

describe('PostgresIdentityStore', () => {
  it('persists a new user and handles a duplicate', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: 'user-1' }] })
      .mockResolvedValueOnce({ rows: [] });
    const store = new PostgresIdentityStore({ query } as PostgresExecutor);
    await expect(store.register('owner@relayform.ru', 'password1')).resolves.toBe('user-1');
    await expect(store.register('owner@relayform.ru', 'password1')).resolves.toBeUndefined();
    expect(query.mock.calls[0][0]).toContain('ON CONFLICT (email) DO NOTHING');
    expect(query.mock.calls[0][1][1]).toBe('owner@relayform.ru');
  });

  it('authenticates only against the stored password hash and keeps sessions in runtime memory', async () => {
    const store = new PostgresIdentityStore({ query: vi.fn().mockResolvedValue({ rows: [{ id: 'user-1', password_hash: hashSecret('password1') }] }) } as PostgresExecutor);
    await expect(store.login('owner@relayform.ru', 'password1')).resolves.toBe('user-1');
    await expect(store.login('owner@relayform.ru', 'wrong')).resolves.toBeUndefined();
    const session = store.createSession('user-1');
    expect(store.getSessionUser(session)).toBe('user-1');
    expect(store.getSessionUser(undefined)).toBeUndefined();
  });

  it('stores a project API-key hash and verifies a presented key without returning its hash', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'project-1', api_key_hash: hashSecret('known-key') }] });
    const store = new PostgresIdentityStore({ query } as PostgresExecutor);
    const project = await store.createProject('user-1', 'Landing');
    expect(project.apiKey).toMatch(/^rf_live_/);
    expect(query.mock.calls[0][1][3]).not.toBe(project.apiKey);
    await expect(store.getProjectIdForApiKey('known-key')).resolves.toBe('project-1');
    await expect(store.getProjectIdForApiKey(undefined)).resolves.toBeUndefined();
  });

  it('lists projects for the requested owner', async () => {
    const store = new PostgresIdentityStore({ query: vi.fn().mockResolvedValue({ rows: [{ id: 'project-1', name: 'Landing' }] }) } as PostgresExecutor);
    await expect(store.listProjects('user-1')).resolves.toEqual([{ id: 'project-1', name: 'Landing' }]);
  });

  it('stores forms, destinations and templates only in owner-scoped parents', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: 'form-1', projectId: 'project-1', name: 'Contact' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'destination-1', formId: 'form-1', provider: 'telegram', recipient: 'recipient', status: 'pending_activation' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'template-1', projectId: 'project-1', subject: 'Confirm', body: 'Body' }] });
    const store = new PostgresIdentityStore({ query } as PostgresExecutor);
    await expect(store.createForm('user-1', 'project-1', 'Contact', 'https://example.ru')).resolves.toMatchObject({ name: 'Contact' });
    await expect(store.createDestination('user-1', 'form-1', 'telegram', 'recipient')).resolves.toMatchObject({ status: 'pendingActivation' });
    await expect(store.createEmailTemplate('user-1', 'project-1', 'Confirm', 'Body', 'light', 'https://example.ru')).resolves.toMatchObject({ subject: 'Confirm' });
    expect(query.mock.calls[0][0]).toContain('WHERE EXISTS');
    expect(query.mock.calls[1][0]).toContain('WHERE EXISTS');
    expect(query.mock.calls[2][0]).toContain('WHERE EXISTS');
  });

  it('does not list children when an owner cannot access their parent', async () => {
    const store = new PostgresIdentityStore({ query: vi.fn().mockResolvedValue({ rows: [] }) } as PostgresExecutor);
    await expect(store.listForms('user-1', 'project-1')).resolves.toBeUndefined();
    await expect(store.listDestinations('user-1', 'form-1')).resolves.toBeUndefined();
    await expect(store.listEmailTemplates('user-1', 'project-1')).resolves.toBeUndefined();
  });

  it('lists, updates and deletes owner-scoped domain records', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{}] })
      .mockResolvedValueOnce({ rows: [{ id: 'form-1', projectId: 'project-1', name: 'Contact' }] })
      .mockResolvedValueOnce({ rows: [{}] })
      .mockResolvedValueOnce({ rows: [{ id: 'destination-1', formId: 'form-1', provider: 'telegram', recipient: 'recipient', status: 'pending_activation' }] })
      .mockResolvedValueOnce({ rows: [{}] })
      .mockResolvedValueOnce({ rows: [{ id: 'template-1', projectId: 'project-1', subject: 'Confirm', body: 'Body' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'form-1', projectId: 'project-1', name: 'Updated' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'destination-1', formId: 'form-1', provider: 'telegram', recipient: 'updated', status: 'pending_activation' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'template-1', projectId: 'project-1', subject: 'Updated', body: 'Updated body' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'destination-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'template-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'form-1' }] })
      .mockResolvedValueOnce({ rows: [{}] });
    const store = new PostgresIdentityStore({ query } as PostgresExecutor);
    await expect(store.listForms('user-1', 'project-1')).resolves.toHaveLength(1);
    await expect(store.listDestinations('user-1', 'form-1')).resolves.toMatchObject([{ status: 'pendingActivation' }]);
    await expect(store.listEmailTemplates('user-1', 'project-1')).resolves.toHaveLength(1);
    await expect(store.updateForm('user-1', 'form-1', 'Updated', 'https://example.ru')).resolves.toMatchObject({ name: 'Updated' });
    await expect(store.updateDestination('user-1', 'destination-1', 'updated')).resolves.toMatchObject({ recipient: 'updated' });
    expect(query.mock.calls[7]?.[0]).toContain("destinations.provider = 'email'");
    await expect(store.updateEmailTemplate('user-1', 'template-1', 'Updated', 'Updated body', 'dark', 'https://example.ru/done')).resolves.toMatchObject({ subject: 'Updated' });
    await expect(store.deleteDestination('user-1', 'destination-1')).resolves.toBe(true);
    await expect(store.deleteEmailTemplate('user-1', 'template-1')).resolves.toBe(true);
    await expect(store.deleteForm('user-1', 'form-1')).resolves.toBe(true);
    await expect(store.isDestinationOwnedByProject('project-1', 'destination-1')).resolves.toBe(true);
  });

  it('returns undefined when an owner-scoped update or delete finds no record', async () => {
    const store = new PostgresIdentityStore({ query: vi.fn().mockResolvedValue({ rows: [] }) } as PostgresExecutor);
    await expect(store.updateForm('user-1', 'missing', 'Updated', 'https://example.ru')).resolves.toBeUndefined();
    await expect(store.updateDestination('user-1', 'missing', 'updated')).resolves.toBeUndefined();
    await expect(store.updateEmailTemplate('user-1', 'missing', 'Updated', 'Body', 'light', 'https://example.ru')).resolves.toBeUndefined();
    await expect(store.deleteDestination('user-1', 'missing')).resolves.toBeUndefined();
    await expect(store.deleteEmailTemplate('user-1', 'missing')).resolves.toBeUndefined();
    await expect(store.deleteForm('user-1', 'missing')).resolves.toBeUndefined();
    await expect(store.isDestinationOwnedByProject('project-1', 'missing')).resolves.toBe(false);
    await expect(store.getDestinationForDelivery('project-1', 'missing')).resolves.toBeUndefined();
  });

  it('loads only provider delivery fields for an owned destination', async () => {
    const store = new PostgresIdentityStore({ query: vi.fn().mockResolvedValue({ rows: [{ formId: 'form-1', provider: 'telegram', recipient: '123' }] }) } as PostgresExecutor);
    await expect(store.getDestinationForDelivery('project-1', 'destination-1')).resolves.toEqual({ formId: 'form-1', provider: 'telegram', recipient: '123' });
  });

  it('loads a verification template only inside the API-key project', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ id: 'template-1', projectId: 'project-1', subject: 'Confirm', body: 'Body', theme: 'light', redirectUrl: 'https://example.ru' }] });
    const store = new PostgresIdentityStore({ query } as PostgresExecutor);
    await expect(store.getEmailTemplateForProject('project-1', 'template-1')).resolves.toMatchObject({ subject: 'Confirm' });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('project_id = $2'), ['template-1', 'project-1']);
  });

  it('loads and activates an owned Telegram destination', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ provider: 'telegram', recipient: 'pending', status: 'pending_activation' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'destination-1', formId: 'form-1', provider: 'telegram', recipient: '123', status: 'active' }] });
    const store = new PostgresIdentityStore({ query } as PostgresExecutor);
    await expect(store.getDestinationForActivation('owner-1', 'destination-1')).resolves.toEqual({ provider: 'telegram', recipient: 'pending', status: 'pendingActivation' });
    await expect(store.activateTelegramDestination('owner-1', 'destination-1', '123')).resolves.toMatchObject({ status: 'active', recipient: '123' });
  });

  it('activates an owned e-mail destination', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ id: 'destination-1', formId: 'form-1', provider: 'email', recipient: 'owner@example.ru', status: 'active' }] });
    const store = new PostgresIdentityStore({ query } as PostgresExecutor);
    await expect(store.activateEmailDestination('owner-1', 'destination-1')).resolves.toMatchObject({ provider: 'email', status: 'active' });
    expect(query.mock.calls[0][1]).toEqual(['active', 'destination-1', 'email', 'owner-1']);
  });

  it('activates an owned VK destination', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ id: 'destination-1', formId: 'form-1', provider: 'vk', recipient: '100', status: 'active' }] });
    const store = new PostgresIdentityStore({ query } as PostgresExecutor);
    await expect(store.activateVkDestination('owner-1', 'destination-1', '100')).resolves.toMatchObject({ provider: 'vk', status: 'active' });
    expect(query.mock.calls[0][1]).toEqual(['100', 'active', 'destination-1', 'vk', 'owner-1']);
  });

  it('activates an owned MAX destination', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ id: 'destination-1', formId: 'form-1', provider: 'max', recipient: '300', status: 'active' }] });
    const store = new PostgresIdentityStore({ query } as PostgresExecutor);
    await expect(store.activateMaxDestination('owner-1', 'destination-1', '300')).resolves.toMatchObject({ provider: 'max', status: 'active' });
    expect(query.mock.calls[0][1]).toEqual(['destination-1', 'owner-1', '300']);
  });

  it('does not activate a missing Telegram destination', async () => {
    const store = new PostgresIdentityStore({ query: vi.fn().mockResolvedValue({ rows: [] }) } as PostgresExecutor);
    await expect(store.getDestinationForActivation('owner-1', 'missing')).resolves.toBeUndefined();
    await expect(store.activateTelegramDestination('owner-1', 'missing', '123')).resolves.toBeUndefined();
  });
});
