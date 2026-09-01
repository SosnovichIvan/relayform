import { beforeEach, describe, expect, it, vi } from 'vitest';
const set = vi.fn(); const get = vi.fn();
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ set, get })) }));
import { handleAuthentication, handleLogout } from './authenticationHandler';
describe('authentication handlers', () => {
  beforeEach(() => { set.mockClear(); vi.unstubAllGlobals(); });
  it('stores a protected session cookie', async () => { vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ sessionToken: 'secret' }))); const response = await handleAuthentication(request('{}'), 'login'); expect(await response.json()).toEqual({ ok: true }); expect(set).toHaveBeenCalledWith('relayform_session', 'secret', expect.objectContaining({ httpOnly: true, sameSite: 'lax' })); });
  it('handles invalid input, backend errors and missing tokens', async () => { expect((await handleAuthentication(request('{'), 'login')).status).toBe(400); vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 }))); expect(await (await handleAuthentication(request('{}'), 'login')).json()).toEqual({ error: 'invalidCredentials' }); vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({}))); expect((await handleAuthentication(request('{}'), 'register')).status).toBe(503); });
  it('expires session on logout', async () => { await handleLogout(); expect(set).toHaveBeenCalledWith('relayform_session', '', expect.objectContaining({ maxAge: 0 })); });
});
function request(body: string) { return new Request('http://local', { method: 'POST', body }); }
