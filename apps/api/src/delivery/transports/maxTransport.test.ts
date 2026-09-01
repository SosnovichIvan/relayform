import { describe, expect, it, vi } from 'vitest';
import { DeliveryTransportError } from './textDeliveryTransport.js';
import { MaxTransport } from './maxTransport.js';

const response = (payload: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: vi.fn().mockResolvedValue(payload) });
const input = { recipient: '123', message: 'Новая заявка' };

describe('MaxTransport', () => {
  it('sends authorized JSON to the documented endpoint', async () => {
    const httpClient = vi.fn().mockResolvedValue(response({ message: { timestamp: 1_725_000_000_000 } }));
    await expect(new MaxTransport('service-token', httpClient).send(input)).resolves.toEqual({ providerMessageId: 'max-1725000000000' });
    expect(httpClient).toHaveBeenCalledWith('https://platform-api2.max.ru/messages?user_id=123', {
      method: 'POST', headers: { Authorization: 'service-token', 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'Новая заявка' }),
    });
  });

  it.each([
    ['', input, 'invalidConfiguration'],
    ['token', { ...input, recipient: '0' }, 'invalidRecipient'],
    ['token', { ...input, message: '' }, 'invalidMessage'],
    ['token', { ...input, message: 'x'.repeat(4001) }, 'invalidMessage'],
  ])('rejects invalid local input', async (token, invalidInput, code) => {
    await expect(new MaxTransport(token).send(invalidInput)).rejects.toMatchObject({ code, isRetryable: false });
  });

  it('classifies network, temporary, terminal and malformed provider failures', async () => {
    await expect(new MaxTransport('token', vi.fn().mockRejectedValue(new Error('private'))).send(input)).rejects.toMatchObject({ code: 'providerUnavailable', isRetryable: true });
    await expect(new MaxTransport('token', vi.fn().mockResolvedValue(response({}, 429))).send(input)).rejects.toMatchObject({ code: 'providerUnavailable', isRetryable: true });
    await expect(new MaxTransport('token', vi.fn().mockResolvedValue(response({}, 500))).send(input)).rejects.toMatchObject({ code: 'providerUnavailable', isRetryable: true });
    await expect(new MaxTransport('token', vi.fn().mockResolvedValue(response({}, 401))).send(input)).rejects.toMatchObject({ code: 'providerRejected', isRetryable: false });
    await expect(new MaxTransport('token', vi.fn().mockResolvedValue(response({}))).send(input)).rejects.toMatchObject({ code: 'providerUnavailable', isRetryable: true });
    const malformed = { ok: false, status: 400, json: vi.fn().mockRejectedValue(new Error('invalid')) };
    await expect(new MaxTransport('token', vi.fn().mockResolvedValue(malformed)).send(input)).rejects.toBeInstanceOf(DeliveryTransportError);
  });
});
