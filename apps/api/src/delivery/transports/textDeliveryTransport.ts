export type TextDeliveryInput = { recipient: string; message: string };
export type TextDeliveryResult = { providerMessageId: string };

export interface TextDeliveryTransport {
  send(input: TextDeliveryInput): Promise<TextDeliveryResult>;
}

export class DeliveryTransportError extends Error {
  constructor(
    public readonly code: 'invalidConfiguration' | 'invalidRecipient' | 'invalidMessage' | 'providerRejected' | 'providerUnavailable',
    public readonly isRetryable: boolean,
    public readonly retryAfterMs?: number,
  ) {
    super(code);
    this.name = 'DeliveryTransportError';
  }
}
