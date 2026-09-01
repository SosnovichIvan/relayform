import Fastify from 'fastify';
import { Pool } from 'pg';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { TelegramActivationStore } from './activation/telegramActivationStore.js';
import type { EmailDestinationActivationStore } from './activation/emailDestinationActivationStore.js';
import { InMemoryEmailDestinationActivationStore } from './activation/inMemoryEmailDestinationActivationStore.js';
import { PostgresEmailDestinationActivationStore } from './activation/postgresEmailDestinationActivationStore.js';
import type { VkDestinationActivationStore } from './activation/vkDestinationActivationStore.js';
import { InMemoryVkDestinationActivationStore } from './activation/inMemoryVkDestinationActivationStore.js';
import { PostgresVkDestinationActivationStore } from './activation/postgresVkDestinationActivationStore.js';
import type { MaxDestinationActivationStore } from './activation/maxDestinationActivationStore.js';
import { InMemoryMaxDestinationActivationStore } from './activation/inMemoryMaxDestinationActivationStore.js';
import { PostgresMaxDestinationActivationStore } from './activation/postgresMaxDestinationActivationStore.js';
import { InMemoryDeliveryRepository } from './delivery/inMemoryDeliveryRepository.js';
import type { DeliveryRepository } from './delivery/deliveryRepository.js';
import { DeliveryWorkerRunner } from './delivery/deliveryWorkerRunner.js';
import { PostgresDeliveryRepository, type DeliveryDatabase } from './delivery/postgresDeliveryRepository.js';
import { TransportDeliveryWorker, type TransportRegistry } from './delivery/transportDeliveryWorker.js';
import { createTransportRegistry } from './delivery/transports/createTransportRegistry.js';
import { InMemoryIdentityStore } from './identity/inMemoryIdentityStore.js';
import { PostgresIdentityStore, type PostgresExecutor } from './identity/postgresIdentityStore.js';
import { createDatabaseReadiness } from './persistence/databaseReadiness.js';
import { createEmailVerificationRateLimiter, createEventRateLimiter, type FixedWindowRateLimiter } from './security/fixedWindowRateLimiter.js';
import { secretsMatch } from './security/secretsMatch.js';
import { createConfirmationEmailSender, type ConfirmationEmailSender } from './emailVerification/confirmationEmailSender.js';
import type { EmailVerificationStore } from './emailVerification/emailVerificationStore.js';
import { InMemoryEmailVerificationStore } from './emailVerification/inMemoryEmailVerificationStore.js';
import { PostgresEmailVerificationStore } from './emailVerification/postgresEmailVerificationStore.js';
import { renderConfirmationEmail } from './emailVerification/renderConfirmationEmail.js';

type RuntimeDatabase = PostgresExecutor & { end(): Promise<void> };

export function createApp(options: { databaseUrl?: string; database?: RuntimeDatabase; deliveryRepository?: DeliveryRepository; eventRateLimiter?: FixedWindowRateLimiter; emailVerificationRateLimiter?: FixedWindowRateLimiter; transports?: TransportRegistry; runDeliveryWorker?: boolean; telegramBotUsername?: string; telegramWebhookSecret?: string; telegramActivationStore?: TelegramActivationStore; emailDestinationActivationStore?: EmailDestinationActivationStore; vkDestinationActivationStore?: VkDestinationActivationStore; vkCommunityId?: string; vkCommunityUrl?: string; vkCallbackSecret?: string; vkCallbackConfirmationCode?: string; maxDestinationActivationStore?: MaxDestinationActivationStore; maxBotUsername?: string; maxWebhookSecret?: string; emailVerificationStore?: EmailVerificationStore; confirmationEmailSender?: ConfirmationEmailSender; publicAppUrl?: string; now?: () => Date } = {}) {
  const databaseUrl = options.databaseUrl ?? process.env.DATABASE_URL;
  const app = Fastify({ logger: false });
  const database = options.database ?? (databaseUrl ? new Pool({ connectionString: databaseUrl }) : undefined);
  const identityStore = database ? new PostgresIdentityStore(database) : new InMemoryIdentityStore();
  const deliveryRepository = options.deliveryRepository ?? (database ? new PostgresDeliveryRepository(database as unknown as DeliveryDatabase) : new InMemoryDeliveryRepository());
  const databaseReadiness = createDatabaseReadiness(databaseUrl, () => database!);
  const eventRateLimiter = options.eventRateLimiter ?? createEventRateLimiter();
  const emailVerificationRateLimiter = options.emailVerificationRateLimiter ?? createEmailVerificationRateLimiter();
  const deliveryWorker = new TransportDeliveryWorker(deliveryRepository, options.transports ?? createTransportRegistry());
  const deliveryWorkerRunner = new DeliveryWorkerRunner(deliveryWorker);
  const runDeliveryWorker = options.runDeliveryWorker ?? process.env.RUN_DELIVERY_WORKER !== 'false';
  const telegramActivationStore = options.telegramActivationStore ?? new TelegramActivationStore();
  const telegramBotUsername = options.telegramBotUsername ?? process.env.TELEGRAM_BOT_USERNAME;
  const telegramWebhookSecret = options.telegramWebhookSecret ?? process.env.TELEGRAM_WEBHOOK_SECRET;
  const emailVerificationStore = options.emailVerificationStore ?? (database ? new PostgresEmailVerificationStore(database) : new InMemoryEmailVerificationStore());
  const confirmationEmailSender = options.confirmationEmailSender ?? createConfirmationEmailSender();
  const publicAppUrl = options.publicAppUrl ?? process.env.PUBLIC_APP_URL;
  const now = options.now ?? (() => new Date());
  const emailDestinationActivationStore = options.emailDestinationActivationStore ?? (database
    ? new PostgresEmailDestinationActivationStore(database)
    : new InMemoryEmailDestinationActivationStore(async (ownerId, destinationId) => Boolean(await identityStore.activateEmailDestination(ownerId, destinationId))));
  const vkDestinationActivationStore = options.vkDestinationActivationStore ?? (database
    ? new PostgresVkDestinationActivationStore(database)
    : new InMemoryVkDestinationActivationStore(async (ownerId, destinationId, recipient) => Boolean(await identityStore.activateVkDestination(ownerId, destinationId, recipient))));
  const vkCommunityId = options.vkCommunityId ?? process.env.VK_COMMUNITY_ID;
  const vkCommunityUrl = options.vkCommunityUrl ?? process.env.VK_COMMUNITY_URL;
  const vkCallbackSecret = options.vkCallbackSecret ?? process.env.VK_CALLBACK_SECRET;
  const vkCallbackConfirmationCode = options.vkCallbackConfirmationCode ?? process.env.VK_CALLBACK_CONFIRMATION_CODE;
  const maxDestinationActivationStore = options.maxDestinationActivationStore ?? (database
    ? new PostgresMaxDestinationActivationStore(database)
    : new InMemoryMaxDestinationActivationStore(async (ownerId, destinationId, recipient) => Boolean(await identityStore.activateMaxDestination(ownerId, destinationId, recipient))));
  const maxBotUsername = options.maxBotUsername ?? process.env.MAX_BOT_USERNAME;
  const maxWebhookSecret = options.maxWebhookSecret ?? process.env.MAX_WEBHOOK_SECRET;
  app.addHook('onReady', async () => { if (runDeliveryWorker) deliveryWorkerRunner.start(); });
  app.addHook('onClose', async () => {
    deliveryWorkerRunner.stop();
    await databaseReadiness.close();
  });
  app.get('/health', async () => ({ status: 'ok' }));
  app.get('/ready', async (_request, reply) => {
    if (!await databaseReadiness.check()) return reply.code(503).send({ status: 'unavailable' });
    return { status: 'ready' };
  });
  app.post('/v1/auth/register', async (request, reply) => {
    const body = request.body as Partial<{ email: string; password: string }>;
    if (!body.email || !body.password || body.password.length < 8) return reply.code(400).send({ error: 'invalidCredentials' });
    const userId = await identityStore.register(body.email, body.password);
    if (!userId) return reply.code(409).send({ error: 'emailAlreadyRegistered' });
    return reply.code(201).send({ sessionToken: await identityStore.createSession(userId) });
  });
  app.post('/v1/auth/login', async (request, reply) => {
    const body = request.body as Partial<{ email: string; password: string }>;
    const userId = body.email && body.password ? await identityStore.login(body.email, body.password) : undefined;
    if (!userId) return reply.code(401).send({ error: 'invalidCredentials' });
    return { sessionToken: await identityStore.createSession(userId) };
  });
  app.post('/v1/projects', async (request, reply) => {
    const userId = await identityStore.getSessionUser(request.headers.authorization?.replace('Bearer ', ''));
    const body = request.body as Partial<{ name: string }>;
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    if (!body.name) return reply.code(400).send({ error: 'invalidProject' });
    return reply.code(201).send(await identityStore.createProject(userId, body.name));
  });
  app.get('/v1/projects', async (request, reply) => {
    const userId = await identityStore.getSessionUser(request.headers.authorization?.replace('Bearer ', ''));
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    return { projects: await identityStore.listProjects(userId) };
  });
  app.post('/v1/projects/:projectId/forms', async (request, reply) => {
    const userId = await identityStore.getSessionUser(request.headers.authorization?.replace('Bearer ', ''));
    const { projectId } = request.params as { projectId: string };
    const body = request.body as Partial<{ name: string; siteUrl: string }>;
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    if (!body.name || !isValidSiteUrl(body.siteUrl)) return reply.code(400).send({ error: 'invalidForm' });
    const form = await identityStore.createForm(userId, projectId, body.name, body.siteUrl!);
    if (!form) return reply.code(404).send({ error: 'projectNotFound' });
    return reply.code(201).send(form);
  });
  app.get('/v1/forms/:formId', async (request, reply) => {
    const userId = await identityStore.getSessionUser(request.headers.authorization?.replace('Bearer ', ''));
    const { formId } = request.params as { formId: string };
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    const form = await identityStore.getForm(userId, formId);
    if (!form) return reply.code(404).send({ error: 'formNotFound' });
    return form;
  });
  app.get('/v1/projects/:projectId/forms', async (request, reply) => {
    const userId = await identityStore.getSessionUser(request.headers.authorization?.replace('Bearer ', ''));
    const { projectId } = request.params as { projectId: string };
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    const forms = await identityStore.listForms(userId, projectId);
    if (!forms) return reply.code(404).send({ error: 'projectNotFound' });
    return { forms };
  });
  app.get('/v1/projects/:projectId/delivery-stats', async (request, reply) => {
    const userId = await identityStore.getSessionUser(request.headers.authorization?.replace('Bearer ', ''));
    const { projectId } = request.params as { projectId: string };
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    if (!await identityStore.listForms(userId, projectId)) return reply.code(404).send({ error: 'projectNotFound' });
    const periodDays = 30;
    const since = new Date(now().getTime() - periodDays * 24 * 60 * 60_000);
    return { periodDays, ...await deliveryRepository.getStats(projectId, since) };
  });
  app.get('/v1/projects/:projectId/failed-deliveries', async (request, reply) => {
    const userId = await identityStore.getSessionUser(request.headers.authorization?.replace('Bearer ', ''));
    const { projectId } = request.params as { projectId: string };
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    if (!await identityStore.listForms(userId, projectId)) return reply.code(404).send({ error: 'projectNotFound' });
    return { failures: await deliveryRepository.listFailed(projectId, 20) };
  });
  app.post('/v1/projects/:projectId/delivery-attempts/:attemptId/replay', async (request, reply) => {
    const userId = await identityStore.getSessionUser(request.headers.authorization?.replace('Bearer ', ''));
    const { projectId, attemptId } = request.params as { projectId: string; attemptId: string };
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    if (!await identityStore.listForms(userId, projectId)) return reply.code(404).send({ error: 'deliveryAttemptNotFound' });
    const result = await deliveryRepository.replayFailed(projectId, attemptId, userId);
    if (result === 'notFound') return reply.code(404).send({ error: 'deliveryAttemptNotFound' });
    if (result === 'notReplayable') return reply.code(409).send({ error: 'deliveryAttemptNotReplayable' });
    if (runDeliveryWorker) deliveryWorkerRunner.wake();
    return reply.code(202).send({ status: 'queued' });
  });
  app.patch('/v1/forms/:formId', async (request, reply) => {
    const userId = await identityStore.getSessionUser(request.headers.authorization?.replace('Bearer ', ''));
    const { formId } = request.params as { formId: string };
    const body = request.body as Partial<{ name: string; siteUrl: string }>;
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    if (!body.name || !isValidSiteUrl(body.siteUrl)) return reply.code(400).send({ error: 'invalidForm' });
    const form = await identityStore.updateForm(userId, formId, body.name, body.siteUrl!);
    if (!form) return reply.code(404).send({ error: 'formNotFound' });
    return form;
  });
  app.delete('/v1/forms/:formId', async (request, reply) => {
    const userId = await identityStore.getSessionUser(request.headers.authorization?.replace('Bearer ', ''));
    const { formId } = request.params as { formId: string };
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    if (!await identityStore.deleteForm(userId, formId)) return reply.code(404).send({ error: 'formNotFound' });
    return reply.code(204).send();
  });
  app.post('/v1/forms/:formId/destinations', async (request, reply) => {
    const userId = await identityStore.getSessionUser(request.headers.authorization?.replace('Bearer ', ''));
    const { formId } = request.params as { formId: string };
    const body = request.body as Partial<{ provider: 'telegram' | 'vk' | 'max' | 'email'; recipient: string }>;
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    if (!body.provider || !body.recipient || !['telegram', 'vk', 'max', 'email'].includes(body.provider)) return reply.code(400).send({ error: 'invalidDestination' });
    const destination = await identityStore.createDestination(userId, formId, body.provider, body.recipient);
    if (!destination) return reply.code(404).send({ error: 'formNotFound' });
    return reply.code(201).send(destination);
  });
  app.get('/v1/forms/:formId/destinations', async (request, reply) => {
    const userId = await identityStore.getSessionUser(request.headers.authorization?.replace('Bearer ', ''));
    const { formId } = request.params as { formId: string };
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    const destinations = await identityStore.listDestinations(userId, formId);
    if (!destinations) return reply.code(404).send({ error: 'formNotFound' });
    return { destinations };
  });
  app.delete('/v1/destinations/:destinationId', async (request, reply) => {
    const userId = await identityStore.getSessionUser(request.headers.authorization?.replace('Bearer ', ''));
    const { destinationId } = request.params as { destinationId: string };
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    if (!await identityStore.deleteDestination(userId, destinationId)) return reply.code(404).send({ error: 'destinationNotFound' });
    return reply.code(204).send();
  });
  app.patch('/v1/destinations/:destinationId', async (request, reply) => {
    const userId = await identityStore.getSessionUser(request.headers.authorization?.replace('Bearer ', ''));
    const { destinationId } = request.params as { destinationId: string };
    const body = request.body as Partial<{ recipient: string }>;
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    if (!body.recipient) return reply.code(400).send({ error: 'invalidDestination' });
    const destination = await identityStore.updateDestination(userId, destinationId, body.recipient);
    if (!destination) return reply.code(404).send({ error: 'destinationNotFound' });
    return destination;
  });
  app.post('/v1/projects/:projectId/email-templates', async (request, reply) => {
    const userId = await identityStore.getSessionUser(request.headers.authorization?.replace('Bearer ', ''));
    const { projectId } = request.params as { projectId: string };
    const body = request.body as Partial<{ subject: string; body: string; theme: 'light' | 'dark'; redirectUrl: string }>;
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    if (!body.subject || !body.body || !isTemplateTheme(body.theme) || !isValidSiteUrl(body.redirectUrl)) return reply.code(400).send({ error: 'invalidTemplate' });
    const template = await identityStore.createEmailTemplate(userId, projectId, body.subject, body.body, body.theme!, body.redirectUrl!);
    if (!template) return reply.code(404).send({ error: 'projectNotFound' });
    return reply.code(201).send(template);
  });
  app.get('/v1/email-templates/:templateId', async (request, reply) => {
    const userId = await identityStore.getSessionUser(request.headers.authorization?.replace('Bearer ', ''));
    const { templateId } = request.params as { templateId: string };
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    const template = await identityStore.getEmailTemplate(userId, templateId);
    if (!template) return reply.code(404).send({ error: 'templateNotFound' });
    return template;
  });
  app.get('/v1/projects/:projectId/email-templates', async (request, reply) => {
    const userId = await identityStore.getSessionUser(request.headers.authorization?.replace('Bearer ', ''));
    const { projectId } = request.params as { projectId: string };
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    const templates = await identityStore.listEmailTemplates(userId, projectId);
    if (!templates) return reply.code(404).send({ error: 'projectNotFound' });
    return { templates };
  });
  app.delete('/v1/email-templates/:templateId', async (request, reply) => {
    const userId = await identityStore.getSessionUser(request.headers.authorization?.replace('Bearer ', ''));
    const { templateId } = request.params as { templateId: string };
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    if (!await identityStore.deleteEmailTemplate(userId, templateId)) return reply.code(404).send({ error: 'templateNotFound' });
    return reply.code(204).send();
  });
  app.patch('/v1/email-templates/:templateId', async (request, reply) => {
    const userId = await identityStore.getSessionUser(request.headers.authorization?.replace('Bearer ', ''));
    const { templateId } = request.params as { templateId: string };
    const body = request.body as Partial<{ subject: string; body: string; theme: 'light' | 'dark'; redirectUrl: string }>;
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    if (!body.subject || !body.body || !isTemplateTheme(body.theme) || !isValidSiteUrl(body.redirectUrl)) return reply.code(400).send({ error: 'invalidTemplate' });
    const template = await identityStore.updateEmailTemplate(userId, templateId, body.subject, body.body, body.theme!, body.redirectUrl!);
    if (!template) return reply.code(404).send({ error: 'templateNotFound' });
    return template;
  });
  app.post('/v1/email-verifications', async (request, reply) => {
    const apiKey = request.headers['x-api-key'];
    const projectId = await identityStore.getProjectIdForApiKey(typeof apiKey === 'string' ? apiKey : undefined);
    if (!projectId) return reply.code(401).send({ error: 'unauthorized' });
    const rateLimit = emailVerificationRateLimiter.consume(projectId);
    if (!rateLimit.isAllowed) return reply.header('Retry-After', rateLimit.retryAfterSeconds).code(429).send({ error: 'rateLimitExceeded' });
    const body = request.body as Partial<{ templateId: string; email: string }>;
    const idempotencyKey = request.headers['x-idempotency-key'];
    const recipientEmail = body.email?.trim().toLowerCase();
    if (!body.templateId || !isValidEmail(recipientEmail) || typeof idempotencyKey !== 'string' || !isValidIdempotencyKey(idempotencyKey)) return reply.code(400).send({ error: 'invalidVerificationRequest' });
    if (!confirmationEmailSender || !isValidSiteUrl(publicAppUrl)) return reply.code(503).send({ error: 'emailDeliveryUnavailable' });
    const template = await identityStore.getEmailTemplateForProject(projectId, body.templateId);
    if (!template) return reply.code(404).send({ error: 'templateNotFound' });
    const issuedAt = now();
    const token = randomBytes(32).toString('base64url');
    const verification = await emailVerificationStore.issue({
      id: randomUUID(),
      projectId,
      templateId: template.id,
      recipientEmail: recipientEmail!,
      tokenDigest: digestToken(token),
      idempotencyKey,
      redirectUrl: template.redirectUrl,
      status: 'pending',
      expiresAt: new Date(issuedAt.getTime() + 15 * 60_000).toISOString(),
    });
    if (!verification.isNew) return { verificationId: verification.record.id, status: verification.record.status };
    const confirmationUrl = new URL('/verify-email', publicAppUrl);
    confirmationUrl.searchParams.set('token', token);
    try {
      await confirmationEmailSender.send({ to: recipientEmail!, ...renderConfirmationEmail(template, confirmationUrl.toString()) });
      await emailVerificationStore.markSent(verification.record.id);
      return reply.code(202).send({ verificationId: verification.record.id, status: 'sent' });
    } catch {
      await emailVerificationStore.markFailed(verification.record.id);
      return reply.code(503).send({ error: 'emailDeliveryUnavailable' });
    }
  });
  app.post('/v1/email-verifications/confirm', async (request, reply) => {
    const body = request.body as Partial<{ token: string }>;
    if (!body.token || !/^[A-Za-z0-9_-]{43}$/.test(body.token)) return reply.code(400).send({ error: 'invalidVerificationToken' });
    const result = await emailVerificationStore.consume(digestToken(body.token), now());
    if (result.status === 'confirmed') return { status: 'confirmed', redirectUrl: result.redirectUrl };
    if (result.status === 'expired') return reply.code(410).send({ error: 'verificationExpired' });
    if (result.status === 'alreadyUsed') return reply.code(409).send({ error: 'verificationAlreadyUsed' });
    return reply.code(404).send({ error: 'verificationNotFound' });
  });
  app.post('/v1/destinations/:destinationId/telegram-activation', async (request, reply) => {
    const userId = await identityStore.getSessionUser(request.headers.authorization?.replace('Bearer ', ''));
    const { destinationId } = request.params as { destinationId: string };
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    const destination = await identityStore.getDestinationForActivation(userId, destinationId);
    if (!destination || destination.provider !== 'telegram') return reply.code(404).send({ error: 'destinationNotFound' });
    if (destination.status === 'active') return reply.code(409).send({ error: 'destinationAlreadyActive' });
    if (!telegramBotUsername?.trim()) return reply.code(503).send({ error: 'telegramNotConfigured' });
    const activation = telegramActivationStore.issue(userId, destinationId);
    return { activationUrl: `https://t.me/${telegramBotUsername.replace(/^@/, '')}?start=${activation.code}`, expiresAt: activation.expiresAt };
  });
  app.post('/v1/destinations/:destinationId/email-activation', async (request, reply) => {
    const userId = await identityStore.getSessionUser(request.headers.authorization?.replace('Bearer ', ''));
    const { destinationId } = request.params as { destinationId: string };
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    const destination = await identityStore.getDestinationForActivation(userId, destinationId);
    if (!destination || destination.provider !== 'email') return reply.code(404).send({ error: 'destinationNotFound' });
    if (destination.status === 'active') return reply.code(409).send({ error: 'destinationAlreadyActive' });
    if (!isValidEmail(destination.recipient) || !confirmationEmailSender || !isValidSiteUrl(publicAppUrl)) return reply.code(503).send({ error: 'emailDeliveryUnavailable' });
    const issuedAt = now();
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(issuedAt.getTime() + 15 * 60_000);
    await emailDestinationActivationStore.issue(userId, destinationId, digestToken(token), expiresAt);
    const activationUrl = new URL('/activate-email', publicAppUrl);
    activationUrl.searchParams.set('token', token);
    try {
      await confirmationEmailSender.send({ to: destination.recipient.trim().toLowerCase(), ...renderConfirmationEmail({ subject: 'Подтвердите e-mail для уведомлений', body: 'Подтвердите, что хотите получать уведомления Relayform на этот адрес.', theme: 'light' }, activationUrl.toString()) });
      return { status: 'sent', expiresAt: expiresAt.toISOString() };
    } catch {
      await emailDestinationActivationStore.invalidate(destinationId);
      return reply.code(503).send({ error: 'emailDeliveryUnavailable' });
    }
  });
  app.post('/v1/destination-email-activations/confirm', async (request, reply) => {
    const body = request.body as Partial<{ token: string }>;
    if (!body.token || !/^[A-Za-z0-9_-]{43}$/.test(body.token)) return reply.code(400).send({ error: 'invalidActivationToken' });
    const result = await emailDestinationActivationStore.consume(digestToken(body.token), now());
    if (result.status === 'confirmed') return { status: 'confirmed' };
    if (result.status === 'expired') return reply.code(410).send({ error: 'activationExpired' });
    if (result.status === 'alreadyUsed') return reply.code(409).send({ error: 'activationAlreadyUsed' });
    return reply.code(404).send({ error: 'activationNotFound' });
  });
  app.get('/v1/destinations/:destinationId/vk-activation', async (request, reply) => {
    const userId = await identityStore.getSessionUser(request.headers.authorization?.replace('Bearer ', ''));
    const { destinationId } = request.params as { destinationId: string };
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    const destination = await identityStore.getDestinationForActivation(userId, destinationId);
    if (!destination || destination.provider !== 'vk') return reply.code(404).send({ error: 'destinationNotFound' });
    return { status: destination.status };
  });
  app.post('/v1/destinations/:destinationId/vk-activation', async (request, reply) => {
    const userId = await identityStore.getSessionUser(request.headers.authorization?.replace('Bearer ', ''));
    const { destinationId } = request.params as { destinationId: string };
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    const destination = await identityStore.getDestinationForActivation(userId, destinationId);
    if (!destination || destination.provider !== 'vk') return reply.code(404).send({ error: 'destinationNotFound' });
    if (destination.status === 'active') return { status: 'active' };
    if (!isValidVkCommunityId(vkCommunityId) || !isValidVkCommunityUrl(vkCommunityUrl) || !vkCallbackSecret?.trim() || !vkCallbackConfirmationCode?.trim()) return reply.code(503).send({ error: 'vkNotConfigured' });
    const token = randomBytes(24).toString('base64url');
    const expiresAt = new Date(now().getTime() + 15 * 60_000);
    await vkDestinationActivationStore.issue(userId, destinationId, digestToken(token), expiresAt);
    return { status: 'pendingActivation', communityUrl: vkCommunityUrl, command: `/start ${token}`, expiresAt: expiresAt.toISOString() };
  });
  app.post('/v1/integrations/vk/callback', async (request, reply) => {
    const body = request.body as Partial<{ type: string; group_id: number; secret: string; object: { message?: { from_id?: number; text?: string } } }>;
    if (!isValidVkCommunityId(vkCommunityId) || String(body.group_id) !== vkCommunityId || !secretsMatch(body.secret, vkCallbackSecret)) return reply.code(401).send({ error: 'unauthorized' });
    if (body.type === 'confirmation') {
      if (!vkCallbackConfirmationCode?.trim()) return reply.code(503).send({ error: 'vkNotConfigured' });
      return reply.type('text/plain').send(vkCallbackConfirmationCode);
    }
    if (body.type === 'message_new') {
      const match = body.object?.message?.text?.trim().match(/^\/start ([A-Za-z0-9_-]{32})$/);
      const senderId = body.object?.message?.from_id;
      if (match && Number.isSafeInteger(senderId) && senderId! > 0) await vkDestinationActivationStore.consume(digestToken(match[1]), String(senderId), now());
    }
    return reply.type('text/plain').send('ok');
  });
  app.get('/v1/destinations/:destinationId/max-activation', async (request, reply) => {
    const userId = await identityStore.getSessionUser(request.headers.authorization?.replace('Bearer ', ''));
    const { destinationId } = request.params as { destinationId: string };
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    const destination = await identityStore.getDestinationForActivation(userId, destinationId);
    if (!destination || destination.provider !== 'max') return reply.code(404).send({ error: 'destinationNotFound' });
    return { status: destination.status };
  });
  app.post('/v1/destinations/:destinationId/max-activation', async (request, reply) => {
    const userId = await identityStore.getSessionUser(request.headers.authorization?.replace('Bearer ', ''));
    const { destinationId } = request.params as { destinationId: string };
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });
    const destination = await identityStore.getDestinationForActivation(userId, destinationId);
    if (!destination || destination.provider !== 'max') return reply.code(404).send({ error: 'destinationNotFound' });
    if (destination.status === 'active') return { status: 'active' };
    if (!isValidMaxBotUsername(maxBotUsername) || !isValidMaxWebhookSecret(maxWebhookSecret)) return reply.code(503).send({ error: 'maxNotConfigured' });
    const token = randomBytes(24).toString('base64url');
    const expiresAt = new Date(now().getTime() + 15 * 60_000);
    await maxDestinationActivationStore.issue(userId, destinationId, digestToken(token), expiresAt);
    return { status: 'pendingActivation', activationUrl: `https://max.ru/${maxBotUsername}?start=${token}`, expiresAt: expiresAt.toISOString() };
  });
  app.post('/v1/integrations/max/webhook', async (request, reply) => {
    const webhookSecret = request.headers['x-max-bot-api-secret'];
    if (!secretsMatch(typeof webhookSecret === 'string' ? webhookSecret : undefined, maxWebhookSecret)) return reply.code(401).send({ error: 'unauthorized' });
    const body = request.body as Partial<{ update_type: string; payload: string; user: { user_id?: number } }>;
    const recipient = body.user?.user_id;
    if (body.update_type === 'bot_started' && /^[A-Za-z0-9_-]{32}$/.test(body.payload ?? '') && Number.isSafeInteger(recipient) && recipient! > 0) {
      await maxDestinationActivationStore.consume(digestToken(body.payload!), String(recipient), now());
    }
    return { ok: true };
  });
  app.post('/v1/integrations/telegram/webhook', async (request, reply) => {
    const webhookSecret = request.headers['x-telegram-bot-api-secret-token'];
    if (!secretsMatch(typeof webhookSecret === 'string' ? webhookSecret : undefined, telegramWebhookSecret)) return reply.code(401).send({ error: 'unauthorized' });
    const body = request.body as Partial<{ message: { text?: string; chat?: { id?: string | number } } }>;
    const match = body.message?.text?.match(/^\/start ([A-Za-z0-9_-]{1,64})$/);
    const chatId = body.message?.chat?.id;
    if (match && (typeof chatId === 'string' || typeof chatId === 'number')) {
      const activation = telegramActivationStore.consume(match[1]);
      if (activation) await identityStore.activateTelegramDestination(activation.ownerId, activation.destinationId, String(chatId));
    }
    return { ok: true };
  });
  app.get('/v1/delivery-attempts/:attemptId', async (request, reply) => {
    const apiKey = request.headers['x-api-key'];
    const projectId = await identityStore.getProjectIdForApiKey(typeof apiKey === 'string' ? apiKey : undefined);
    const { attemptId } = request.params as { attemptId: string };
    if (!projectId) return reply.code(401).send({ error: 'unauthorized' });
    const attempt = await deliveryRepository.getStatus(projectId, attemptId);
    if (!attempt) return reply.code(404).send({ error: 'deliveryAttemptNotFound' });
    return attempt;
  });
  app.post('/v1/events', async (request, reply) => {
    const body = request.body as Partial<{ eventId: string; destinationId: string; message: string }>;
    const apiKey = request.headers['x-api-key'];
    const requestIdempotencyKey = request.headers['x-idempotency-key'];
    const projectId = await identityStore.getProjectIdForApiKey(typeof apiKey === 'string' ? apiKey : undefined);
    if (!projectId) return reply.code(401).send({ error: 'unauthorized' });
    const rateLimit = eventRateLimiter.consume(projectId);
    if (!rateLimit.isAllowed) return reply.header('Retry-After', rateLimit.retryAfterSeconds).code(429).send({ error: 'rateLimitExceeded' });
    if (!body.eventId || !body.destinationId || !body.message?.trim() || typeof requestIdempotencyKey !== 'string') return reply.code(400).send({ error: 'invalidEvent' });
    const destination = await identityStore.getDestinationForDelivery(projectId, body.destinationId);
    if (!destination) return reply.code(404).send({ error: 'destinationNotFound' });
    const idempotencyKey = `${body.destinationId}:${requestIdempotencyKey}`;
    const accepted = await deliveryRepository.accept({ projectId, formId: destination.formId, eventId: body.eventId, destinationId: body.destinationId, idempotencyKey, provider: destination.provider, recipient: destination.recipient, message: body.message });
    const { isNew } = accepted;
    if (isNew && runDeliveryWorker) {
      deliveryWorkerRunner.wake();
    }
    return reply.code(isNew ? 202 : 200).send({ status: isNew ? 'queued' : 'duplicate', deliveryAttemptId: accepted.attemptId });
  });
  return app;
}

function isValidSiteUrl(value: string | undefined): boolean {
  if (!value) return false;
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
}
function isTemplateTheme(value: string | undefined): value is 'light' | 'dark' { return value === 'light' || value === 'dark'; }
function isValidEmail(value: string | undefined): boolean { return Boolean(value && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)); }
function isValidVkCommunityId(value: string | undefined): value is string { return Boolean(value && /^[1-9]\d*$/.test(value)); }
function isValidVkCommunityUrl(value: string | undefined): value is string {
  if (!value) return false;
  try { const url = new URL(value); return url.protocol === 'https:' && (url.hostname === 'vk.com' || url.hostname.endsWith('.vk.com') || url.hostname === 'vk.ru' || url.hostname.endsWith('.vk.ru')); } catch { return false; }
}
function isValidMaxBotUsername(value: string | undefined): value is string { return Boolean(value && /^[A-Za-z0-9_.-]{1,64}$/.test(value)); }
function isValidMaxWebhookSecret(value: string | undefined): value is string { return Boolean(value && /^[A-Za-z0-9_-]{5,256}$/.test(value)); }
function isValidIdempotencyKey(value: string): boolean { return value.length >= 1 && value.length <= 128; }
function digestToken(value: string): string { return createHash('sha256').update(value).digest('hex'); }
