import { describe, expect, it, vi } from 'vitest';
import { EmailProviderError } from '../../emailVerification/confirmationEmailSender.js';
import { EmailNotificationTransport } from './emailNotificationTransport.js';

describe('EmailNotificationTransport', () => {
  it('normalizes the recipient and escapes fixed notification markup', async () => {
    const send = vi.fn().mockResolvedValue({ providerMessageId: 'mail-1' });
    await expect(new EmailNotificationTransport({ send }).send({ recipient: ' User@Example.RU ', message: '<b>Lead</b>\nPhone' })).resolves.toEqual({ providerMessageId: 'mail-1' });
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: 'user@example.ru', subject: 'Новая заявка · Relayform', html: expect.stringContaining('&lt;b&gt;Lead&lt;/b&gt;<br>Phone') }));
  });

  it.each([
    ['', 'Lead', 'invalidRecipient', false],
    ['bad', 'Lead', 'invalidRecipient', false],
    ['user@example.ru', '', 'invalidMessage', false],
    ['user@example.ru', 'x'.repeat(20_001), 'invalidMessage', false],
  ])('rejects invalid input', async (recipient, message, code, isRetryable) => {
    await expect(new EmailNotificationTransport({ send: vi.fn() }).send({ recipient, message })).rejects.toMatchObject({ code, isRetryable });
  });

  it.each([
    [undefined, 'providerUnavailable', true], [429, 'providerUnavailable', true], [503, 'providerUnavailable', true], [400, 'providerRejected', false],
  ])('classifies provider status %s', async (status, code, isRetryable) => {
    const send = vi.fn().mockRejectedValue(new EmailProviderError(status));
    await expect(new EmailNotificationTransport({ send }).send({ recipient: 'user@example.ru', message: 'Lead' })).rejects.toMatchObject({ code, isRetryable });
  });

  it('redacts unknown provider failures', async () => {
    const send = vi.fn().mockRejectedValue(new Error('recipient user@example.ru secret'));
    const error = await new EmailNotificationTransport({ send }).send({ recipient: 'user@example.ru', message: 'Lead' }).catch((caught) => caught);
    expect(error).toMatchObject({ code: 'providerUnavailable', isRetryable: true });
    expect(String(error)).not.toContain('user@example.ru');
  });
});
