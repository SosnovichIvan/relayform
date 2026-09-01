import { describe, expect, it, vi } from 'vitest';
import { DeliveryTransportError } from './textDeliveryTransport.js';
import { TelegramTransport } from './telegramTransport.js';

function response(status: number, payload: unknown, retryAfter?: string) {
  return { ok: status >= 200 && status < 300, status, headers: { get: vi.fn().mockReturnValue(retryAfter ?? null) }, json: vi.fn().mockResolvedValue(payload) };
}

describe('TelegramTransport', () => {
  it('sends JSON through sendMessage and returns the provider message ID', async () => {
    const httpClient = vi.fn().mockResolvedValue(response(200, { ok: true, result: { message_id: 42 } }));
    const transport = new TelegramTransport('bot-token', httpClient);
    await expect(transport.send({ recipient: '123456', message: 'New lead' })).resolves.toEqual({ providerMessageId: '42' });
    expect(httpClient).toHaveBeenCalledWith('https://api.telegram.org/botbot-token/sendMessage', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: '123456', text: 'New lead' }),
    });
  });

  it.each([
    ['', '123', 'Lead', 'invalidConfiguration'],
    ['token', '', 'Lead', 'invalidRecipient'],
    ['token', '123', '', 'invalidMessage'],
    ['token', '123', 'x'.repeat(4097), 'invalidMessage'],
  ])('rejects invalid local input before HTTP', async (token, recipient, message, code) => {
    const httpClient = vi.fn();
    await expect(new TelegramTransport(token, httpClient).send({ recipient, message })).rejects.toMatchObject({ code, isRetryable: false });
    expect(httpClient).not.toHaveBeenCalled();
  });

  it.each([
    [429, true],
    [503, true],
    [400, false],
  ])('classifies Telegram status %s without exposing provider data', async (status, isRetryable) => {
    const error = await new TelegramTransport('secret-token', vi.fn().mockResolvedValue(response(status, { ok: false, description: 'chat 123 failed for secret-token' })))
      .send({ recipient: '123', message: 'Lead' }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(DeliveryTransportError);
    expect(error).toMatchObject({ code: 'providerRejected', isRetryable });
    expect(String(error)).not.toContain('secret-token');
    expect(String(error)).not.toContain('123');
  });

  it('classifies network and invalid-response failures safely', async () => {
    await expect(new TelegramTransport('token', vi.fn().mockRejectedValue(new Error('network token leak'))).send({ recipient: '123', message: 'Lead' })).rejects.toMatchObject({ code: 'providerUnavailable', isRetryable: true });
    await expect(new TelegramTransport('token', vi.fn().mockResolvedValue({ ok: false, status: 400, json: vi.fn().mockRejectedValue(new Error('bad body')) })).send({ recipient: '123', message: 'Lead' })).rejects.toMatchObject({ code: 'providerUnavailable', isRetryable: false });
  });

  it('normalizes a numeric Retry-After header into milliseconds', async () => {
    await expect(new TelegramTransport('token', vi.fn().mockResolvedValue(response(429, { ok: false }, '3'))).send({ recipient: '123', message: 'Lead' }))
      .rejects.toMatchObject({ code: 'providerRejected', isRetryable: true, retryAfterMs: 3_000 });
  });
});
