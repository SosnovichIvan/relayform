import { randomBytes, randomUUID } from 'node:crypto';
import { createProjectApiKey, hashSecret, verifySecret } from '../auth/credentialService.js';

type User = { id: string; email: string; passwordHash: string };
type Project = { id: string; ownerId: string; name: string; apiKeyHash: string };
type Form = { id: string; projectId: string; name: string; siteUrl: string };
type Provider = 'telegram' | 'vk' | 'max' | 'email';
type Destination = { id: string; formId: string; provider: Provider; recipient: string; status: 'pendingActivation' | 'active' };
type EmailTemplate = { id: string; projectId: string; subject: string; body: string; theme: 'light' | 'dark'; redirectUrl: string };

export class InMemoryIdentityStore {
  private readonly users = new Map<string, User>();
  private readonly projects = new Map<string, Project>();
  private readonly forms = new Map<string, Form>();
  private readonly destinations = new Map<string, Destination>();
  private readonly emailTemplates = new Map<string, EmailTemplate>();
  private readonly sessions = new Map<string, string>();

  register(email: string, password: string): string | undefined {
    if (this.users.has(email)) return undefined;
    const id = randomUUID();
    this.users.set(email, { id, email, passwordHash: hashSecret(password) });
    return id;
  }

  login(email: string, password: string): string | undefined {
    const user = this.users.get(email);
    return user && verifySecret(password, user.passwordHash) ? user.id : undefined;
  }

  createSession(userId: string): string {
    const token = randomBytes(32).toString('hex');
    this.sessions.set(token, userId);
    return token;
  }

  getSessionUser(token: string | undefined): string | undefined { return token ? this.sessions.get(token) : undefined; }

  createProject(ownerId: string, name: string): { id: string; apiKey: string } {
    const apiKey = createProjectApiKey();
    const id = randomUUID();
    this.projects.set(id, { id, ownerId, name, apiKeyHash: hashSecret(apiKey) });
    return { id, apiKey };
  }

  listProjects(ownerId: string): Array<Pick<Project, 'id' | 'name'>> {
    return [...this.projects.values()].filter((project) => project.ownerId === ownerId).map(({ id, name }) => ({ id, name }));
  }

  getProjectIdForApiKey(apiKey: string | undefined): string | undefined {
    if (!apiKey) return undefined;
    return [...this.projects.values()].find((project) => verifySecret(apiKey, project.apiKeyHash))?.id;
  }

  createForm(ownerId: string, projectId: string, name: string, siteUrl: string): Form | undefined {
    const project = this.projects.get(projectId);
    if (!project || project.ownerId !== ownerId) return undefined;
    const form = { id: randomUUID(), projectId, name, siteUrl };
    this.forms.set(form.id, form);
    return form;
  }

  listForms(ownerId: string, projectId: string): Form[] | undefined {
    const project = this.projects.get(projectId);
    if (!project || project.ownerId !== ownerId) return undefined;
    return [...this.forms.values()].filter((form) => form.projectId === projectId);
  }

  getForm(ownerId: string, formId: string): Form | undefined {
    const form = this.forms.get(formId);
    const project = form ? this.projects.get(form.projectId) : undefined;
    return form && project?.ownerId === ownerId ? form : undefined;
  }

  updateForm(ownerId: string, formId: string, name: string, siteUrl: string): Form | undefined {
    const form = this.forms.get(formId);
    const project = form ? this.projects.get(form.projectId) : undefined;
    if (!form || !project || project.ownerId !== ownerId) return undefined;
    form.name = name;
    form.siteUrl = siteUrl;
    return form;
  }

  deleteForm(ownerId: string, formId: string): boolean | undefined {
    const form = this.forms.get(formId);
    const project = form ? this.projects.get(form.projectId) : undefined;
    if (!form || !project || project.ownerId !== ownerId) return undefined;
    this.forms.delete(formId);
    for (const destination of this.destinations.values()) {
      if (destination.formId === formId) this.destinations.delete(destination.id);
    }
    return true;
  }

  createDestination(ownerId: string, formId: string, provider: Provider, recipient: string): Destination | undefined {
    const form = this.forms.get(formId);
    const project = form ? this.projects.get(form.projectId) : undefined;
    if (!project || project.ownerId !== ownerId) return undefined;
    const destination = { id: randomUUID(), formId, provider, recipient, status: 'pendingActivation' as const };
    this.destinations.set(destination.id, destination);
    return destination;
  }

  createEmailTemplate(ownerId: string, projectId: string, subject: string, body: string, theme: 'light' | 'dark', redirectUrl: string): EmailTemplate | undefined {
    const project = this.projects.get(projectId);
    if (!project || project.ownerId !== ownerId) return undefined;
    const template = { id: randomUUID(), projectId, subject, body, theme, redirectUrl };
    this.emailTemplates.set(template.id, template);
    return template;
  }

  listDestinations(ownerId: string, formId: string): Destination[] | undefined {
    const form = this.forms.get(formId);
    const project = form ? this.projects.get(form.projectId) : undefined;
    if (!project || project.ownerId !== ownerId) return undefined;
    return [...this.destinations.values()].filter((destination) => destination.formId === formId);
  }

  isDestinationOwnedByProject(projectId: string, destinationId: string): boolean {
    const destination = this.destinations.get(destinationId);
    const form = destination ? this.forms.get(destination.formId) : undefined;
    return form?.projectId === projectId;
  }

  getDestinationForDelivery(projectId: string, destinationId: string): (Pick<Destination, 'provider' | 'recipient'> & { formId: string }) | undefined {
    const destination = this.destinations.get(destinationId);
    const form = destination ? this.forms.get(destination.formId) : undefined;
    return form?.projectId === projectId && destination?.status === 'active' ? { formId: form.id, provider: destination.provider, recipient: destination.recipient } : undefined;
  }

  getDestinationForActivation(ownerId: string, destinationId: string): Pick<Destination, 'provider' | 'recipient' | 'status'> | undefined {
    const destination = this.destinations.get(destinationId);
    const form = destination ? this.forms.get(destination.formId) : undefined;
    const project = form ? this.projects.get(form.projectId) : undefined;
    return destination && project?.ownerId === ownerId ? { provider: destination.provider, recipient: destination.recipient, status: destination.status } : undefined;
  }

  activateTelegramDestination(ownerId: string, destinationId: string, recipient: string): Destination | undefined {
    const destination = this.destinations.get(destinationId);
    const target = this.getDestinationForActivation(ownerId, destinationId);
    if (!destination || target?.provider !== 'telegram') return undefined;
    destination.recipient = recipient;
    destination.status = 'active';
    return destination;
  }

  activateVkDestination(ownerId: string, destinationId: string, recipient: string): Destination | undefined {
    const destination = this.destinations.get(destinationId);
    const target = this.getDestinationForActivation(ownerId, destinationId);
    if (!destination || target?.provider !== 'vk') return undefined;
    destination.recipient = recipient;
    destination.status = 'active';
    return destination;
  }

  activateMaxDestination(ownerId: string, destinationId: string, recipient: string): Destination | undefined {
    const destination = this.destinations.get(destinationId);
    const target = this.getDestinationForActivation(ownerId, destinationId);
    if (!destination || target?.provider !== 'max') return undefined;
    destination.recipient = recipient;
    destination.status = 'active';
    return destination;
  }

  activateEmailDestination(ownerId: string, destinationId: string): Destination | undefined {
    const destination = this.destinations.get(destinationId);
    const target = this.getDestinationForActivation(ownerId, destinationId);
    if (!destination || target?.provider !== 'email') return undefined;
    destination.status = 'active';
    return destination;
  }

  listEmailTemplates(ownerId: string, projectId: string): EmailTemplate[] | undefined {
    const project = this.projects.get(projectId);
    if (!project || project.ownerId !== ownerId) return undefined;
    return [...this.emailTemplates.values()].filter((template) => template.projectId === projectId);
  }

  getEmailTemplate(ownerId: string, templateId: string): EmailTemplate | undefined {
    const template = this.emailTemplates.get(templateId);
    const project = template ? this.projects.get(template.projectId) : undefined;
    return template && project?.ownerId === ownerId ? template : undefined;
  }

  getEmailTemplateForProject(projectId: string, templateId: string): EmailTemplate | undefined {
    const template = this.emailTemplates.get(templateId);
    return template?.projectId === projectId ? template : undefined;
  }

  deleteDestination(ownerId: string, destinationId: string): boolean | undefined {
    const destination = this.destinations.get(destinationId);
    const form = destination ? this.forms.get(destination.formId) : undefined;
    const project = form ? this.projects.get(form.projectId) : undefined;
    if (!project || project.ownerId !== ownerId) return undefined;
    this.destinations.delete(destinationId);
    return true;
  }

  deleteEmailTemplate(ownerId: string, templateId: string): boolean | undefined {
    const template = this.emailTemplates.get(templateId);
    const project = template ? this.projects.get(template.projectId) : undefined;
    if (!project || project.ownerId !== ownerId) return undefined;
    this.emailTemplates.delete(templateId);
    return true;
  }

  updateDestination(ownerId: string, destinationId: string, recipient: string): Destination | undefined {
    const destination = this.destinations.get(destinationId);
    const form = destination ? this.forms.get(destination.formId) : undefined;
    const project = form ? this.projects.get(form.projectId) : undefined;
    if (!destination || !project || project.ownerId !== ownerId) return undefined;
    if (destination.provider === 'email' && destination.recipient !== recipient) destination.status = 'pendingActivation';
    destination.recipient = recipient;
    return destination;
  }

  updateEmailTemplate(ownerId: string, templateId: string, subject: string, body: string, theme: 'light' | 'dark', redirectUrl: string): EmailTemplate | undefined {
    const template = this.emailTemplates.get(templateId);
    const project = template ? this.projects.get(template.projectId) : undefined;
    if (!template || !project || project.ownerId !== ownerId) return undefined;
    template.subject = subject;
    template.body = body;
    template.theme = theme;
    template.redirectUrl = redirectUrl;
    return template;
  }
}
