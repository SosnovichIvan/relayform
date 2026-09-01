import { describe, expect, it, vi } from 'vitest';
const { authenticatedBackendRequest } = vi.hoisted(() => ({ authenticatedBackendRequest: vi.fn() }));
vi.mock('@/shared/api/relayformBackend', () => ({ authenticatedBackendRequest, stableError: (status: number) => status === 404 ? 'notFound' : 'unavailable' }));
import { POST } from './route';

describe('delivery replay BFF', () => {
  it('proxies encoded project and attempt identifiers', async () => {
    authenticatedBackendRequest.mockResolvedValueOnce(Response.json({ status: 'queued' }, { status: 202 }));
    const response = await POST(new Request('http://localhost'), { params: Promise.resolve({ projectId: 'project / one', attemptId: 'attempt / one' }) });
    expect(response.status).toBe(202);
    expect(authenticatedBackendRequest).toHaveBeenCalledWith('/v1/projects/project%20%2F%20one/delivery-attempts/attempt%20%2F%20one/replay', { method: 'POST' });
  });

  it.each([[401, 'unauthorized'], [404, 'notFound'], [409, 'notReplayable'], [503, 'unavailable']] as const)('maps %s safely', async (status, error) => {
    authenticatedBackendRequest.mockResolvedValueOnce(Response.json({ diagnostic: 'private' }, { status }));
    const response = await POST(new Request('http://localhost'), { params: Promise.resolve({ projectId: 'p1', attemptId: 'a1' }) });
    expect(await response.json()).toEqual({ error });
  });
});
