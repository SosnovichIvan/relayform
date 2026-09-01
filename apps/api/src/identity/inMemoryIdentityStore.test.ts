import { describe, expect, it } from 'vitest';
import { InMemoryIdentityStore } from './inMemoryIdentityStore.js';

describe('InMemoryIdentityStore', () => {
  it('registers once and authenticates correct credentials', () => {
    const store = new InMemoryIdentityStore();
    const userId = store.register('owner@relayform.ru', 'password1');
    expect(userId).toBeDefined();
    expect(store.register('owner@relayform.ru', 'password1')).toBeUndefined();
    expect(store.login('owner@relayform.ru', 'password1')).toBe(userId);
    expect(store.login('owner@relayform.ru', 'wrong')).toBeUndefined();
    const session = store.createSession(userId!);
    expect(store.getSessionUser(session)).toBe(userId);
    expect(store.getSessionUser('invalid')).toBeUndefined();
  });

  it('lists projects only for their owner and exposes an API key only on creation', () => {
    const store = new InMemoryIdentityStore();
    const firstOwner = store.register('first@relayform.ru', 'password1')!;
    const secondOwner = store.register('second@relayform.ru', 'password1')!;
    const project = store.createProject(firstOwner, 'Landing');
    store.createProject(secondOwner, 'Other');
    expect(project.apiKey).toMatch(/^rf_live_/);
    expect(store.listProjects(firstOwner)).toEqual([{ id: project.id, name: 'Landing' }]);
    expect(store.createForm(secondOwner, project.id, 'Forbidden', 'https://example.ru')).toBeUndefined();
    expect(store.createForm(firstOwner, project.id, 'Contact', 'https://example.ru')?.name).toBe('Contact');
    expect(store.listForms(secondOwner, project.id)).toBeUndefined();
    expect(store.listForms(firstOwner, project.id)).toHaveLength(1);
    expect(store.createDestination(firstOwner, 'missing', 'telegram', 'recipient')).toBeUndefined();
    const form = store.listForms(firstOwner, project.id)?.[0];
    const destination = form && store.createDestination(firstOwner, form.id, 'telegram', 'recipient');
    expect(destination && store.getDestinationForDelivery(project.id, destination.id)).toBeUndefined();
    expect(destination && store.getDestinationForActivation(firstOwner, destination.id)).toEqual({ provider: 'telegram', recipient: 'recipient', status: 'pendingActivation' });
    expect(destination && store.activateTelegramDestination(firstOwner, destination.id, '123')).toMatchObject({ recipient: '123', status: 'active' });
    expect(destination && store.getDestinationForDelivery(project.id, destination.id)).toEqual({ formId: form?.id, provider: 'telegram', recipient: '123' });
    expect(destination && store.activateTelegramDestination(secondOwner, destination.id, '456')).toBeUndefined();
    const vkDestination = form && store.createDestination(firstOwner, form.id, 'vk', 'pending');
    expect(vkDestination && store.activateVkDestination(firstOwner, vkDestination.id, '100')).toMatchObject({ recipient: '100', status: 'active' });
    expect(vkDestination && store.activateVkDestination(secondOwner, vkDestination.id, '200')).toBeUndefined();
    const maxDestination = form && store.createDestination(firstOwner, form.id, 'max', 'pending');
    expect(maxDestination && store.activateMaxDestination(firstOwner, maxDestination.id, '300')).toMatchObject({ recipient: '300', status: 'active' });
    expect(maxDestination && store.activateMaxDestination(secondOwner, maxDestination.id, '400')).toBeUndefined();
    expect(store.getDestinationForDelivery('other-project', destination?.id ?? 'missing')).toBeUndefined();
    const emailDestination = form && store.createDestination(firstOwner, form.id, 'email', 'owner@example.ru');
    expect(emailDestination && store.activateEmailDestination(firstOwner, emailDestination.id)).toMatchObject({ status: 'active' });
    expect(emailDestination && store.updateDestination(firstOwner, emailDestination.id, 'new@example.ru')).toMatchObject({ recipient: 'new@example.ru', status: 'pendingActivation' });
    expect(emailDestination && store.activateEmailDestination(secondOwner, emailDestination.id)).toBeUndefined();
    expect(store.createEmailTemplate(firstOwner, 'missing', 'Subject', 'Body', 'light', 'https://example.ru')).toBeUndefined();
    const template = store.createEmailTemplate(firstOwner, project.id, 'Subject', 'Body', 'light', 'https://example.ru');
    expect(template?.subject).toBe('Subject');
    expect(store.getEmailTemplateForProject(project.id, template!.id)).toEqual(template);
    expect(store.getEmailTemplateForProject('other-project', template!.id)).toBeUndefined();
  });
});
