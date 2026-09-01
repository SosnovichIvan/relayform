import { describe, expect, it, vi } from 'vitest';
const { authenticatedBackendRequest } = vi.hoisted(() => ({ authenticatedBackendRequest: vi.fn() }));
vi.mock('@/shared/api/relayformBackend', () => ({ authenticatedBackendRequest, stableError: (status: number) => status === 404 ? 'notFound' : 'unavailable' }));
import { GET } from './route';

describe('failed deliveries BFF', () => {
  it('proxies an encoded project and safe response', async () => {
    authenticatedBackendRequest.mockResolvedValueOnce(Response.json({ failures: [] }));
    const response = await GET(new Request('http://localhost'), { params: Promise.resolve({ projectId: 'project / one' }) });
    expect(await response.json()).toEqual({ failures: [] });
    expect(authenticatedBackendRequest).toHaveBeenCalledWith('/v1/projects/project%20%2F%20one/failed-deliveries');
  });

  it.each([[401, 'unauthorized'], [404, 'notFound'], [503, 'unavailable']] as const)('maps %s safely', async (status, error) => {
    authenticatedBackendRequest.mockResolvedValueOnce(Response.json({ diagnostic: 'private' }, { status }));
    const response = await GET(new Request('http://localhost'), { params: Promise.resolve({ projectId: 'p1' }) });
    expect(await response.json()).toEqual({ error });
  });
});
