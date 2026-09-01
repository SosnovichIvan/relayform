import { describe, expect, it, vi } from 'vitest';
const { authenticatedBackendRequest } = vi.hoisted(() => ({ authenticatedBackendRequest: vi.fn() }));
vi.mock('@/shared/api/relayformBackend', () => ({ authenticatedBackendRequest, stableError: (status: number) => status === 404 ? 'notFound' : 'unavailable' }));
import { GET } from './route';

describe('delivery statistics BFF', () => {
  it('proxies a safely encoded project and response', async () => {
    authenticatedBackendRequest.mockResolvedValueOnce(Response.json({ periodDays: 30, total: 0, forms: [] }));
    const response = await GET(new Request('http://localhost'), { params: Promise.resolve({ projectId: 'project / one' }) });
    expect(response.status).toBe(200);
    expect(authenticatedBackendRequest).toHaveBeenCalledWith('/v1/projects/project%20%2F%20one/delivery-stats');
  });

  it.each([[401, 'unauthorized'], [404, 'notFound'], [503, 'unavailable']] as const)('maps %s without forwarding diagnostics', async (status, error) => {
    authenticatedBackendRequest.mockResolvedValueOnce(Response.json({ diagnostic: 'private' }, { status }));
    const response = await GET(new Request('http://localhost'), { params: Promise.resolve({ projectId: 'p1' }) });
    expect(await response.json()).toEqual({ error });
  });
});
