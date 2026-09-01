import type { TransportRegistry } from '../transportDeliveryWorker.js';
import { TelegramTransport } from './telegramTransport.js';
import { createConfirmationEmailSender } from '../../emailVerification/confirmationEmailSender.js';
import { EmailNotificationTransport } from './emailNotificationTransport.js';
import { VkTransport } from './vkTransport.js';
import { MaxTransport } from './maxTransport.js';

export function createTransportRegistry(environment: NodeJS.ProcessEnv = process.env): TransportRegistry {
  const telegramToken = environment.TELEGRAM_BOT_TOKEN?.trim();
  const registry: TransportRegistry = {};
  if (telegramToken) registry.telegram = new TelegramTransport(telegramToken);
  const vkToken = environment.VK_COMMUNITY_ACCESS_TOKEN?.trim();
  if (vkToken) registry.vk = new VkTransport(vkToken);
  const maxToken = environment.MAX_BOT_TOKEN?.trim();
  if (maxToken) registry.max = new MaxTransport(maxToken);
  const emailSender = createConfirmationEmailSender(environment.EMAIL_PROVIDER_API_KEY, environment.EMAIL_FROM_ADDRESS);
  if (emailSender) registry.email = new EmailNotificationTransport(emailSender);
  return registry;
}
