type ConfirmationTemplate = { subject: string; body: string; theme: 'light' | 'dark' };

export function renderConfirmationEmail(template: ConfirmationTemplate, confirmationUrl: string) {
  const colors = template.theme === 'dark'
    ? { background: '#1c1b18', card: '#292824', text: '#f4f1e8', muted: '#b8b3a7' }
    : { background: '#f5f2e9', card: '#ffffff', text: '#26241f', muted: '#6f6a5f' };
  const subject = sanitizeHeader(template.subject);
  const body = escapeHtml(template.body).replace(/\n/g, '<br>');
  const safeUrl = escapeHtml(confirmationUrl);
  return {
    subject,
    text: `Relayform\n\n${template.body}\n\nПодтвердить: ${confirmationUrl}\n\nПисьмо сформировано с помощью Relayform — https://relayform.ru`,
    html: `<!doctype html><html><body style="margin:0;background:${colors.background};color:${colors.text};font-family:Inter,Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:${colors.card};border-radius:20px"><tr><td style="padding:32px"><strong style="font-size:20px">relayform</strong><p style="font-size:16px;line-height:24px;margin:28px 0">${body}</p><a href="${safeUrl}" style="display:inline-block;background:#f4d84a;color:#26241f;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:12px">Подтвердить</a><p style="font-size:13px;line-height:20px;color:${colors.muted};margin:28px 0 0">Письмо сформировано с помощью <a href="https://relayform.ru" style="color:inherit">Relayform</a></p></td></tr></table></td></tr></table></body></html>`,
  };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}

function sanitizeHeader(value: string): string { return value.replace(/[\r\n]+/g, ' ').trim(); }
