import { randomBytes } from 'node:crypto';
import { DeliveryTransportError, type TextDeliveryInput, type TextDeliveryResult, type TextDeliveryTransport } from './textDeliveryTransport.js';

type HttpResponse = { ok: boolean; status: number; json(): Promise<unknown> };
type HttpClient = (url: string, init: { method: 'POST'; headers: { 'content-type': 'application/x-www-form-urlencoded' }; body: string }) => Promise<HttpResponse>;
type VkResponse = { response?: number; error?: { error_code?: number } };

const retryableVkErrorCodes = new Set([1, 6, 9, 10, 29]);

export class VkTransport implements TextDeliveryTransport {
  constructor(
    private readonly accessToken: string,
    private readonly httpClient: HttpClient = fetch,
    private readonly createRandomId: () => number = () => randomBytes(4).readUInt32BE(0) % 2_147_483_647 + 1,
  ) {}

  async send(input: TextDeliveryInput): Promise<TextDeliveryResult> {
    if (!this.accessToken.trim()) throw new DeliveryTransportError('invalidConfiguration', false);
    if (!/^[1-9]\d*$/.test(input.recipient)) throw new DeliveryTransportError('invalidRecipient', false);
    if (input.message.length < 1 || input.message.length > 9000) throw new DeliveryTransportError('invalidMessage', false);
    const body = new URLSearchParams({ access_token: this.accessToken, v: '5.199', peer_id: input.recipient, random_id: String(this.createRandomId()), message: input.message });
    let response: HttpResponse;
    try {
      response = await this.httpClient('https://api.vk.com/method/messages.send', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: body.toString() });
    } catch {
      throw new DeliveryTransportError('providerUnavailable', true);
    }
    let payload: VkResponse;
    try {
      payload = await response.json() as VkResponse;
    } catch {
      throw new DeliveryTransportError('providerUnavailable', response.status === 429 || response.status >= 500);
    }
    if (response.ok && typeof payload.response === 'number') return { providerMessageId: String(payload.response) };
    const isRetryable = response.status === 429 || response.status >= 500 || retryableVkErrorCodes.has(payload.error?.error_code ?? 0);
    throw new DeliveryTransportError(isRetryable ? 'providerUnavailable' : 'providerRejected', isRetryable);
  }
}
