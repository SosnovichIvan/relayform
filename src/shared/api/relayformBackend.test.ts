import { beforeEach, describe, expect, it, vi } from 'vitest';
const get = vi.fn();
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ get })) }));
import { authenticatedBackendRequest, backendRequest, consumeEmailDestinationActivation, consumeEmailVerification, jsonRequest, stableError } from './relayformBackend';

describe('relayform backend client', () => {
  beforeEach(() => { get.mockReturnValue({ value: 'token' }); vi.unstubAllGlobals(); });
  it.each([[401, 'invalidCredentials'], [409, 'alreadyRegistered'], [404, 'notFound'], [503, 'unavailable'], [400, 'invalidRequest']])('maps %s to %s', (status, error) => { expect(stableError(status)).toBe(error); });
  it('normalizes network failures', async () => { vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('secret diagnostics'))); const response = await backendRequest('/v1/projects'); expect(response.status).toBe(503); expect(await response.json()).toEqual({ error: 'unavailable' }); });
  it('preserves caller headers and creates JSON requests', async () => { const request = vi.fn().mockResolvedValue(new Response('{}')); vi.stubGlobal('fetch', request); await authenticatedBackendRequest('/v1/projects', { headers: { 'x-trace': 'trace' } }); expect(request.mock.calls[0][1].headers.get('x-trace')).toBe('trace'); expect(jsonRequest('POST', { name: 'Site' })).toMatchObject({ method: 'POST', body: '{"name":"Site"}' }); });
  it.each([
    [410, 'expired'], [409, 'alreadyUsed'], [404, 'invalid'], [400, 'invalid'], [503, 'unavailable'],
  ])('maps confirmation HTTP %s to %s', async (status, expected) => { vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status }))); await expect(consumeEmailVerification('x'.repeat(43))).resolves.toEqual({ status: expected }); });
  it('accepts only a safe confirmed redirect', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ status: 'confirmed', redirectUrl: 'https://example.ru/done' })));
    await expect(consumeEmailVerification('x'.repeat(43))).resolves.toEqual({ status: 'confirmed', redirectUrl: 'https://example.ru/done' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ status: 'confirmed', redirectUrl: 'javascript:alert(1)' })));
    await expect(consumeEmailVerification('x'.repeat(43))).resolves.toEqual({ status: 'unavailable' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ status: 'unexpected' })));
    await expect(consumeEmailVerification('x'.repeat(43))).resolves.toEqual({ status: 'unavailable' });
    await expect(consumeEmailVerification(undefined)).resolves.toEqual({ status: 'invalid' });
  });
  it.each([[200, 'confirmed'], [410, 'expired'], [409, 'alreadyUsed'], [404, 'invalid'], [400, 'invalid'], [503, 'unavailable']] as const)('maps destination activation HTTP %s to %s', async (status, expected) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status })));
    await expect(consumeEmailDestinationActivation('x'.repeat(43))).resolves.toEqual({ status: expected });
  });
  it('rejects a missing destination activation token locally', async () => { await expect(consumeEmailDestinationActivation(undefined)).resolves.toEqual({ status: 'invalid' }); });
});
