import { beforeEach, describe, expect, it, vi } from 'vitest';
const get = vi.fn();
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ get })) }));
import { GET, POST } from './route';
describe('project BFF', () => {
  beforeEach(() => { get.mockReturnValue({ value: 'session' }); vi.unstubAllGlobals(); });
  it('lists projects with server-side authorization', async () => { const request = vi.fn().mockResolvedValue(Response.json({ projects: [{ id: 'p1', name: 'Site' }] })); vi.stubGlobal('fetch', request); expect(await (await GET()).json()).toMatchObject({ projects: [{ name: 'Site' }] }); expect(request.mock.calls[0][1].headers.get('authorization')).toBe('Bearer session'); });
  it('strips an API key from project creation', async () => { vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ id: 'p1', apiKey: 'secret' }))); const response = await POST(body('{"name":"Site"}')); expect(await response.json()).toEqual({ id: 'p1', name: 'Site' }); });
  it('handles no session, invalid JSON and backend errors', async () => { get.mockReturnValue(undefined); expect((await GET()).status).toBe(401); expect((await POST(body('{'))).status).toBe(400); get.mockReturnValue({ value: 'session' }); vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 503 }))); expect((await GET()).status).toBe(503); });
  it('normalizes empty lists, authorization failures and backend project names', async () => { vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({})).mockResolvedValueOnce(new Response('{}', { status: 401 })).mockResolvedValueOnce(Response.json({ id: 'p1', name: 'Backend name' }))); expect(await (await GET()).json()).toEqual({ projects: [] }); expect((await GET()).status).toBe(401); expect(await (await POST(body('{}'))).json()).toEqual({ id: 'p1', name: 'Backend name' }); });
  it('uses an empty safe name for an incomplete creation response', async () => { vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ id: 'p1' }))); expect(await (await POST(body('{}'))).json()).toEqual({ id: 'p1', name: '' }); });
});
function body(value: string) { return new Request('http://local', { method: 'POST', body: value }); }
