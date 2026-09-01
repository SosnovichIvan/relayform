import { DeliveryTransportError, type TextDeliveryInput, type TextDeliveryResult, type TextDeliveryTransport } from './textDeliveryTransport.js';

type HttpResponse = { ok: boolean; status: number; headers?: { get(name: string): string | null }; json(): Promise<unknown> };
type HttpClient = (url: string, init: { method: 'POST'; headers: { 'content-type': 'application/json' }; body: string }) => Promise<HttpResponse>;
type TelegramResponse = { ok?: boolean; result?: { message_id?: number } };

export class TelegramTransport implements TextDeliveryTransport {
  constructor(
    private readonly botToken: string,
    private readonly httpClient: HttpClient = fetch,
  ) {}

  async send(input: TextDeliveryInput): Promise<TextDeliveryResult> {
    if (!this.botToken.trim()) throw new DeliveryTransportError('invalidConfiguration', false);
    if (!input.recipient.trim()) throw new DeliveryTransportError('invalidRecipient', false);
    if (input.message.length < 1 || input.message.length > 4096) throw new DeliveryTransportError('invalidMessage', false);

    let response: HttpResponse;
    try {
      response = await this.httpClient(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: input.recipient, text: input.message }),
      });
    } catch {
      throw new DeliveryTransportError('providerUnavailable', true);
    }

    let payload: TelegramResponse;
    try {
      payload = await response.json() as TelegramResponse;
    } catch {
      throw new DeliveryTransportError('providerUnavailable', response.status === 429 || response.status >= 500, retryAfterMs(response));
    }
    const providerMessageId = payload.result?.message_id;
    if (!response.ok || payload.ok !== true || typeof providerMessageId !== 'number') {
      throw new DeliveryTransportError('providerRejected', response.status === 429 || response.status >= 500, retryAfterMs(response));
    }
    return { providerMessageId: String(providerMessageId) };
  }
}

function retryAfterMs(response: HttpResponse): number | undefined {
  if (response.status !== 429) return undefined;
  const value = response.headers?.get('retry-after');
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1_000);
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? undefined : Math.max(0, timestamp - Date.now());
}
