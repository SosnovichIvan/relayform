export type ConfirmationMessage = { to: string; subject: string; html: string; text: string };

export interface ConfirmationEmailSender {
  send(message: ConfirmationMessage): Promise<{ providerMessageId: string }>;
}

export class EmailProviderError extends Error {
  constructor(public readonly status?: number) { super('emailProviderUnavailable'); this.name = 'EmailProviderError'; }
}

export class ResendConfirmationEmailSender implements ConfirmationEmailSender {
  constructor(
    private readonly apiKey: string,
    private readonly fromAddress: string,
    private readonly httpClient: typeof fetch = fetch,
  ) {}

  async send(message: ConfirmationMessage): Promise<{ providerMessageId: string }> {
    try {
      const response = await this.httpClient('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from: this.fromAddress, to: [message.to], subject: message.subject, html: message.html, text: message.text }),
      });
      if (!response.ok) throw new EmailProviderError(response.status);
      const body = await response.json() as Partial<{ id: string }>;
      if (!body.id) throw new EmailProviderError(response.status);
      return { providerMessageId: body.id };
    } catch (error) {
      if (error instanceof EmailProviderError) throw error;
      throw new EmailProviderError();
    }
  }
}

export function createConfirmationEmailSender(apiKey = process.env.EMAIL_PROVIDER_API_KEY, fromAddress = process.env.EMAIL_FROM_ADDRESS): ConfirmationEmailSender | undefined {
  return apiKey?.trim() && fromAddress?.trim() ? new ResendConfirmationEmailSender(apiKey, fromAddress) : undefined;
}
