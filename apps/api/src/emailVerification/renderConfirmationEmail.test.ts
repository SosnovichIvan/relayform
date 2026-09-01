import { describe, expect, it } from 'vitest';
import { renderConfirmationEmail } from './renderConfirmationEmail.js';

describe('renderConfirmationEmail', () => {
  it('escapes tenant content and keeps fixed branding', () => {
    const message = renderConfirmationEmail({ subject: 'Confirm\r\nBcc: bad', body: '<script>bad</script>\nHello', theme: 'light' }, 'https://relayform.ru/verify-email?token=a&next=b');
    expect(message.subject).toBe('Confirm Bcc: bad');
    expect(message.html).toContain('&lt;script&gt;bad&lt;/script&gt;<br>Hello');
    expect(message.html).toContain('Подтвердить');
    expect(message.html).toContain('token=a&amp;next=b');
    expect(message.html).not.toContain('<script>');
    expect(message.text).toContain('https://relayform.ru');
  });

  it('renders the dark semantic presentation', () => {
    expect(renderConfirmationEmail({ subject: 'Dark', body: 'Body', theme: 'dark' }, 'https://relayform.ru/verify').html).toContain('#1c1b18');
  });
});
