import { describe, expect, it } from 'vitest';
import { createTransportRegistry } from './createTransportRegistry.js';
import { TelegramTransport } from './telegramTransport.js';
import { EmailNotificationTransport } from './emailNotificationTransport.js';
import { VkTransport } from './vkTransport.js';
import { MaxTransport } from './maxTransport.js';

describe('createTransportRegistry', () => {
  it('registers Telegram only for a non-empty service token', () => {
    expect(createTransportRegistry({ TELEGRAM_BOT_TOKEN: ' service-token ' }).telegram).toBeInstanceOf(TelegramTransport);
    expect(createTransportRegistry({ TELEGRAM_BOT_TOKEN: '   ' })).toEqual({});
    expect(createTransportRegistry({})).toEqual({});
  });

  it('registers e-mail only with a complete provider configuration', () => {
    expect(createTransportRegistry({ EMAIL_PROVIDER_API_KEY: 'key', EMAIL_FROM_ADDRESS: 'Relayform <confirm@relayform.ru>' }).email).toBeInstanceOf(EmailNotificationTransport);
    expect(createTransportRegistry({ EMAIL_PROVIDER_API_KEY: 'key' })).toEqual({});
    expect(createTransportRegistry({ EMAIL_FROM_ADDRESS: 'confirm@relayform.ru' })).toEqual({});
  });

  it('registers VK only for a non-empty community token', () => {
    expect(createTransportRegistry({ VK_COMMUNITY_ACCESS_TOKEN: ' community-token ' }).vk).toBeInstanceOf(VkTransport);
    expect(createTransportRegistry({ VK_COMMUNITY_ACCESS_TOKEN: '   ' })).toEqual({});
  });

  it('registers MAX only for a non-empty bot token', () => {
    expect(createTransportRegistry({ MAX_BOT_TOKEN: ' max-token ' }).max).toBeInstanceOf(MaxTransport);
    expect(createTransportRegistry({ MAX_BOT_TOKEN: '   ' })).toEqual({});
  });
});
