import { DeliveryTransportError, type TextDeliveryInput, type TextDeliveryResult, type TextDeliveryTransport } from './textDeliveryTransport.js';

type HttpResponse = { ok: boolean; status: number; json(): Promise<unknown> };
type HttpClient = (url: string, init: { method: 'POST'; headers: { Authorization: string; 'Content-Type': 'application/json' }; body: string }) => Promise<HttpResponse>;
type MaxResponse = { message?: { timestamp?: number } };

export class MaxTransport implements TextDeliveryTransport {
  constructor(private readonly botToken: string, private readonly httpClient: HttpClient = fetch) {}

  async send(input: TextDeliveryInput): Promise<TextDeliveryResult> {
    if (!this.botToken.trim()) throw new DeliveryTransportError('invalidConfiguration', false);
    if (!/^[1-9]\d*$/.test(input.recipient)) throw new DeliveryTransportError('invalidRecipient', false);
    if (input.message.length < 1 || input.message.length > 4000) throw new DeliveryTransportError('invalidMessage', false);
    let response: HttpResponse;
    try {
      response = await this.httpClient(`https://platform-api2.max.ru/messages?user_id=${encodeURIComponent(input.recipient)}`, {
        method: 'POST',
        headers: { Authorization: this.botToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input.message }),
      });
    } catch {
      throw new DeliveryTransportError('providerUnavailable', true);
    }
    let payload: MaxResponse;
    try {
      payload = await response.json() as MaxResponse;
    } catch {
      const isRetryable = response.status === 429 || response.status >= 500;
      throw new DeliveryTransportError(isRetryable ? 'providerUnavailable' : 'providerRejected', isRetryable);
    }
    if (response.ok && Number.isSafeInteger(payload.message?.timestamp) && payload.message!.timestamp! >= 0) {
      return { providerMessageId: `max-${payload.message!.timestamp}` };
    }
    const isRetryable = response.status === 429 || response.status >= 500 || response.ok;
    throw new DeliveryTransportError(isRetryable ? 'providerUnavailable' : 'providerRejected', isRetryable);
  }
}
