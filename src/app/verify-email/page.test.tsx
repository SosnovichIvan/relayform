import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { consumeEmailVerification, redirect } = vi.hoisted(() => ({ consumeEmailVerification: vi.fn(), redirect: vi.fn() }));
vi.mock('@/shared/api/relayformBackend', () => ({ consumeEmailVerification }));
vi.mock('next/navigation', () => ({ redirect }));
import VerifyEmailPage from './page';

describe('VerifyEmailPage', () => {
  beforeEach(() => { consumeEmailVerification.mockReset(); redirect.mockReset(); });

  it('redirects a confirmed recipient to the validated destination', async () => {
    consumeEmailVerification.mockResolvedValue({ status: 'confirmed', redirectUrl: 'https://example.ru/done' });
    await VerifyEmailPage({ searchParams: Promise.resolve({ token: 'opaque' }) });
    expect(redirect).toHaveBeenCalledWith('https://example.ru/done');
  });

  it('renders a safe public failure state', async () => {
    consumeEmailVerification.mockResolvedValue({ status: 'expired' });
    render(await VerifyEmailPage({ searchParams: Promise.resolve({ token: 'opaque' }) }));
    expect(screen.getByRole('heading', { name: 'Срок ссылки истёк' })).toBeDefined();
    expect(document.body.textContent).not.toContain('opaque');
  });
});
