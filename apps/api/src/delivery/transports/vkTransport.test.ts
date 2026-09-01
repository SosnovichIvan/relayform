import { describe, expect, it, vi } from 'vitest';
import { DeliveryTransportError } from './textDeliveryTransport.js';
import { VkTransport } from './vkTransport.js';

const response = (payload: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => payload });

describe('VkTransport', () => {
  it('sends a form-encoded message with a unique random ID', async () => {
    const httpClient = vi.fn().mockResolvedValue(response({ response: 321 }));
    await expect(new VkTransport('service-token', httpClient, () => 42).send({ recipient: '100', message: 'Новая заявка' })).resolves.toEqual({ providerMessageId: '321' });
    expect(httpClient).toHaveBeenCalledWith('https://api.vk.com/method/messages.send', expect.objectContaining({ method: 'POST' }));
    expect(Object.fromEntries(new URLSearchParams(httpClient.mock.calls[0]?.[1].body))).toMatchObject({ access_token: 'service-token', v: '5.199', peer_id: '100', random_id: '42', message: 'Новая заявка' });
  });

  it.each([
    ['', { recipient: '100', message: 'Lead' }, 'invalidConfiguration'],
    ['token', { recipient: 'not-id', message: 'Lead' }, 'invalidRecipient'],
    ['token', { recipient: '100', message: '' }, 'invalidMessage'],
    ['token', { recipient: '100', message: 'x'.repeat(9001) }, 'invalidMessage'],
  ])('rejects invalid local input', async (token, input, code) => {
    await expect(new VkTransport(token).send(input)).rejects.toMatchObject({ code, isRetryable: false });
  });

  it('classifies network and VK failures without provider diagnostics', async () => {
    await expect(new VkTransport('token', vi.fn().mockRejectedValue(new Error('private'))).send({ recipient: '100', message: 'Lead' })).rejects.toMatchObject({ code: 'providerUnavailable', isRetryable: true });
    await expect(new VkTransport('token', vi.fn().mockResolvedValue(response({ error: { error_code: 6 } }))).send({ recipient: '100', message: 'Lead' })).rejects.toMatchObject({ code: 'providerUnavailable', isRetryable: true });
    await expect(new VkTransport('token', vi.fn().mockResolvedValue(response({ error: { error_code: 901 } }))).send({ recipient: '100', message: 'Lead' })).rejects.toMatchObject({ code: 'providerRejected', isRetryable: false });
  });

  it('classifies malformed and HTTP failures', async () => {
    const malformedResponse = { ok: false, status: 503, json: async () => { throw new Error('html'); } };
    await expect(new VkTransport('token', vi.fn().mockResolvedValue(malformedResponse)).send({ recipient: '100', message: 'Lead' })).rejects.toEqual(expect.objectContaining({ code: 'providerUnavailable', isRetryable: true }));
    const malformedSuccess = { ok: true, status: 200, json: async () => { throw new Error('bad json'); } };
    await expect(new VkTransport('token', vi.fn().mockResolvedValue(malformedSuccess)).send({ recipient: '100', message: 'Lead' })).rejects.toBeInstanceOf(DeliveryTransportError);
    await expect(new VkTransport('token', vi.fn().mockResolvedValue(response({}, 400))).send({ recipient: '100', message: 'Lead' })).rejects.toMatchObject({ code: 'providerRejected', isRetryable: false });
  });
});
