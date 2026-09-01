import { EmailProviderError, type ConfirmationEmailSender } from '../../emailVerification/confirmationEmailSender.js';
import { DeliveryTransportError, type TextDeliveryInput, type TextDeliveryTransport } from './textDeliveryTransport.js';

export class EmailNotificationTransport implements TextDeliveryTransport {
  constructor(private readonly sender: ConfirmationEmailSender) {}

  async send(input: TextDeliveryInput) {
    const recipient = input.recipient.trim().toLowerCase();
    if (!isValidEmail(recipient)) throw new DeliveryTransportError('invalidRecipient', false);
    if (!input.message.trim() || input.message.length > 20_000) throw new DeliveryTransportError('invalidMessage', false);
    try {
      return await this.sender.send({ to: recipient, ...renderNotification(input.message) });
    } catch (error) {
      if (error instanceof EmailProviderError) {
        const isRetryable = error.status === undefined || error.status === 429 || error.status >= 500;
        throw new DeliveryTransportError(isRetryable ? 'providerUnavailable' : 'providerRejected', isRetryable);
      }
      throw new DeliveryTransportError('providerUnavailable', true);
    }
  }
}

function renderNotification(message: string) {
  const escaped = escapeHtml(message).replace(/\n/g, '<br>');
  return {
    subject: 'Новая заявка · Relayform',
    text: `Новая заявка\n\n${message}\n\nДоставлено с помощью Relayform — https://relayform.ru`,
    html: `<!doctype html><html><body style="margin:0;background:#f5f2e9;color:#26241f;font-family:Inter,Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:20px"><tr><td style="padding:32px"><strong style="font-size:20px">relayform</strong><h1 style="font-size:24px;margin:28px 0 16px">Новая заявка</h1><p style="font-size:16px;line-height:24px">${escaped}</p><p style="font-size:13px;line-height:20px;color:#6f6a5f;margin:28px 0 0">Доставлено с помощью <a href="https://relayform.ru" style="color:inherit">Relayform</a></p></td></tr></table></td></tr></table></body></html>`,
  };
}

function isValidEmail(value: string): boolean { return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!); }
