import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmailVerificationResult } from './emailVerificationResult';

describe('EmailVerificationResult', () => {
  it.each([
    ['invalid', 'Ссылка недействительна'],
    ['expired', 'Срок ссылки истёк'],
    ['alreadyUsed', 'Адрес уже подтверждён'],
    ['unavailable', 'Не удалось проверить ссылку'],
  ] as const)('renders %s state without diagnostics', (status, title) => {
    const { container } = render(<EmailVerificationResult status={status} />);
    expect(screen.getByRole('heading', { name: title })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Перейти в Relayform' }).getAttribute('href')).toBe('/');
    expect(container.textContent).not.toContain('token');
  });
});
