import { describe, expect, it, vi } from 'vitest';
import { createConfirmationEmailSender, EmailProviderError, ResendConfirmationEmailSender } from './confirmationEmailSender.js';

describe('ResendConfirmationEmailSender', () => {
  it('sends through the fixed provider endpoint', async () => {
    const httpClient = vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ id: 'mail-1' }) });
    const sender = new ResendConfirmationEmailSender('secret', 'Relayform <confirm@relayform.ru>', httpClient);
    await expect(sender.send({ to: 'user@example.ru', subject: 'Confirm', html: '<p>Body</p>', text: 'Body' })).resolves.toEqual({ providerMessageId: 'mail-1' });
    expect(httpClient).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ authorization: 'Bearer secret' }) }));
  });

  it('maps provider failures without including response diagnostics', async () => {
    const rejected = await new ResendConfirmationEmailSender('secret', 'from@example.ru', vi.fn().mockResolvedValue({ ok: false, status: 429 })).send({ to: 'user@example.ru', subject: 'S', html: 'H', text: 'T' }).catch((error) => error);
    expect(rejected).toBeInstanceOf(EmailProviderError);
    expect(rejected.status).toBe(429);
    await expect(new ResendConfirmationEmailSender('secret', 'from@example.ru', vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({}) })).send({ to: 'user@example.ru', subject: 'S', html: 'H', text: 'T' })).rejects.toThrow('emailProviderUnavailable');
    await expect(new ResendConfirmationEmailSender('secret', 'from@example.ru', vi.fn().mockRejectedValue(new Error('network secret'))).send({ to: 'user@example.ru', subject: 'S', html: 'H', text: 'T' })).rejects.toBeInstanceOf(EmailProviderError);
  });

  it('constructs only from complete runtime configuration', () => {
    expect(createConfirmationEmailSender('', '')).toBeUndefined();
    expect(createConfirmationEmailSender('key', '')).toBeUndefined();
    expect(createConfirmationEmailSender('key', 'from@example.ru')).toBeInstanceOf(ResendConfirmationEmailSender);
  });
});
