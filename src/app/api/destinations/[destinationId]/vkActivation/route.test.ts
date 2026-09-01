import { describe, expect, it, vi } from 'vitest';
const { authenticatedBackendRequest } = vi.hoisted(() => ({ authenticatedBackendRequest: vi.fn() }));
vi.mock('@/shared/api/relayformBackend', () => ({ authenticatedBackendRequest, stableError: (status: number) => status >= 500 ? 'unavailable' : 'notFound' }));
import { GET, POST } from './route';

describe('VK activation BFF', () => {
  it.each([['GET', GET], ['POST', POST]] as const)('proxies %s with an encoded destination', async (method, handler) => {
    authenticatedBackendRequest.mockResolvedValueOnce(Response.json({ status: 'pendingActivation', command: '/start code' }));
    const response = await handler(new Request('http://localhost'), { params: Promise.resolve({ destinationId: 'id / one' }) });
    expect(await response.json()).toMatchObject({ status: 'pendingActivation' });
    expect(authenticatedBackendRequest).toHaveBeenCalledWith('/v1/destinations/id%20%2F%20one/vk-activation', { method });
  });

  it.each([[401, 'unauthorized'], [404, 'notFound'], [503, 'unavailable']] as const)('maps %s safely', async (status, error) => {
    authenticatedBackendRequest.mockResolvedValueOnce(Response.json({ diagnostic: 'private' }, { status }));
    const response = await POST(new Request('http://localhost'), { params: Promise.resolve({ destinationId: 'd1' }) });
    expect(await response.json()).toEqual({ error });
  });
});
