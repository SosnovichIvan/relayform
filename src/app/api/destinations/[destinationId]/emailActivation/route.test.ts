import { describe, expect, it, vi } from 'vitest';
const { authenticatedBackendRequest } = vi.hoisted(() => ({ authenticatedBackendRequest: vi.fn() }));
vi.mock('@/shared/api/relayformBackend', () => ({ authenticatedBackendRequest, stableError: (status: number) => status >= 500 ? 'unavailable' : 'notFound' }));
import { POST } from './route';

describe('e-mail activation BFF', () => {
  it('posts to an encoded backend destination', async () => {
    authenticatedBackendRequest.mockResolvedValueOnce(Response.json({ status: 'sent', expiresAt: '2026-01-01T00:15:00Z' }));
    const response = await POST(new Request('http://localhost'), { params: Promise.resolve({ destinationId: 'id / one' }) });
    expect(await response.json()).toMatchObject({ status: 'sent' });
    expect(authenticatedBackendRequest).toHaveBeenCalledWith('/v1/destinations/id%20%2F%20one/email-activation', { method: 'POST' });
  });

  it.each([[401, 'unauthorized'], [404, 'notFound'], [503, 'unavailable']] as const)('maps %s safely', async (status, error) => {
    authenticatedBackendRequest.mockResolvedValueOnce(Response.json({ diagnostic: 'private' }, { status }));
    const response = await POST(new Request('http://localhost'), { params: Promise.resolve({ destinationId: 'd1' }) });
    expect(await response.json()).toEqual({ error });
  });
});
