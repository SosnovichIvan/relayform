import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmailDestinationActivationResult } from './emailDestinationActivationResult';

describe('EmailDestinationActivationResult', () => {
  it.each([['confirmed', 'E-mail подключён'], ['invalid', 'Ссылка недействительна'], ['expired', 'Срок ссылки истёк'], ['alreadyUsed', 'E-mail уже подключён'], ['unavailable', 'Не удалось подключить e-mail']] as const)('renders %s safely', (status, title) => {
    const { container } = render(<EmailDestinationActivationResult status={status} />);
    expect(screen.getByRole('heading', { name: title })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Перейти в кабинет' }).getAttribute('href')).toBe('/cabinet');
    expect(container.textContent).not.toContain('token');
  });
});
