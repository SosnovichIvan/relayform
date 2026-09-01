import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
const { consumeEmailDestinationActivation } = vi.hoisted(() => ({ consumeEmailDestinationActivation: vi.fn() }));
vi.mock('@/shared/api/relayformBackend', () => ({ consumeEmailDestinationActivation }));
import ActivateEmailPage from './page';

describe('ActivateEmailPage', () => {
  it('consumes server-side and renders no token', async () => {
    consumeEmailDestinationActivation.mockResolvedValue({ status: 'confirmed' });
    render(await ActivateEmailPage({ searchParams: Promise.resolve({ token: 'opaque-secret' }) }));
    expect(screen.getByRole('heading', { name: 'E-mail подключён' })).toBeDefined();
    expect(document.body.textContent).not.toContain('opaque-secret');
  });
});
