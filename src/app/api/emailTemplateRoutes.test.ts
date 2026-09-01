import { beforeEach, describe, expect, it, vi } from 'vitest';
const get = vi.fn(); vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ get })) }));
import { DELETE, GET as getOne, PATCH } from './emailTemplates/[templateId]/route';
import { GET as list, POST } from './projects/[projectId]/emailTemplates/route';
const projectContext = { params: Promise.resolve({ projectId: 'p/1' }) }; const templateContext = { params: Promise.resolve({ templateId: 't/1' }) };
describe('email template BFF routes', () => {
  beforeEach(() => { get.mockReturnValue({ value: 'session' }); vi.unstubAllGlobals(); });
  it('proxies list and CRUD while encoding IDs', async () => { const request = vi.fn().mockImplementation(async (_url: string, init: RequestInit = {}) => init.method === 'DELETE' ? new Response(null, { status: 204 }) : Response.json({ templates: [] })); vi.stubGlobal('fetch', request); expect((await list(req(), projectContext)).status).toBe(200); expect((await POST(jsonReq(), projectContext)).status).toBe(201); expect((await getOne(req(), templateContext)).status).toBe(200); expect((await PATCH(jsonReq(), templateContext)).status).toBe(200); expect((await DELETE(req(), templateContext)).status).toBe(204); expect(request.mock.calls.some(([url]) => String(url).includes('p%2F1'))).toBe(true); });
  it('rejects malformed JSON and maps failures', async () => { expect((await POST(badReq(), projectContext)).status).toBe(400); expect((await PATCH(badReq(), templateContext)).status).toBe(400); get.mockReturnValue(undefined); expect((await list(req(), projectContext)).status).toBe(401); get.mockReturnValue({ value: 'session' }); vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 404 }))); expect((await getOne(req(), templateContext)).status).toBe(404); expect((await POST(jsonReq(), projectContext)).status).toBe(404); });
});
function req() { return new Request('http://local'); } function jsonReq() { return new Request('http://local', { method: 'POST', body: '{}' }); } function badReq() { return new Request('http://local', { method: 'POST', body: '{' }); }
