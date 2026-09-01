import { beforeEach, describe, expect, it, vi } from 'vitest';
const getCookie = vi.fn();
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ get: getCookie })) }));
import { DELETE as deleteDestination, PATCH as patchDestination } from './destinations/[destinationId]/route';
import { POST as activateTelegram } from './destinations/[destinationId]/telegramActivation/route';
import { DELETE as deleteForm, GET as getForm, PATCH as patchForm } from './forms/[formId]/route';
import { GET as getDestinations, POST as postDestination } from './forms/[formId]/destinations/route';
import { POST as postForm } from './projects/[projectId]/forms/route';

const formContext = { params: Promise.resolve({ formId: 'f/1' }) }; const destinationContext = { params: Promise.resolve({ destinationId: 'd/1' }) }; const projectContext = { params: Promise.resolve({ projectId: 'p/1' }) };
describe('form and destination BFF routes', () => {
  beforeEach(() => { getCookie.mockReturnValue({ value: 'session' }); vi.unstubAllGlobals(); });
  it('proxies the complete successful CRUD lifecycle', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string, init: RequestInit = {}) => {
      if (init.method === 'DELETE') return new Response(null, { status: 204 });
      if (url.includes('telegram-activation')) return Response.json({ activationUrl: 'https://t.me/bot?start=code', expiresAt: 1, ignored: 'secret' });
      if (url.includes('destinations')) return Response.json(init.method === 'POST' ? { id: 'd1', provider: 'email' } : { destinations: [] });
      return Response.json({ id: 'f1', name: 'Form', siteUrl: 'https://example.ru' });
    }));
    expect((await getForm(request(), formContext)).status).toBe(200); expect((await patchForm(jsonRequest(), formContext)).status).toBe(200); expect((await deleteForm(request(), formContext)).status).toBe(204);
    expect((await postForm(jsonRequest(), projectContext)).status).toBe(201); expect((await getDestinations(request(), formContext)).status).toBe(200); expect((await postDestination(jsonRequest(), formContext)).status).toBe(201);
    expect((await patchDestination(jsonRequest(), destinationContext)).status).toBe(200); expect((await deleteDestination(request(), destinationContext)).status).toBe(204);
    expect(await (await activateTelegram(request(), destinationContext)).json()).toEqual({ activationUrl: 'https://t.me/bot?start=code', expiresAt: 1 });
  });
  it('rejects malformed bodies before proxying', async () => { expect((await patchForm(badRequest(), formContext)).status).toBe(400); expect((await postForm(badRequest(), projectContext)).status).toBe(400); expect((await postDestination(badRequest(), formContext)).status).toBe(400); expect((await patchDestination(badRequest(), destinationContext)).status).toBe(400); });
  it('maps unauthorized and backend failures safely', async () => { getCookie.mockReturnValue(undefined); expect((await getForm(request(), formContext)).status).toBe(401); getCookie.mockReturnValue({ value: 'session' }); vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 404 }))); expect((await getDestinations(request(), formContext)).status).toBe(404); expect((await activateTelegram(request(), destinationContext)).status).toBe(404); expect((await patchDestination(jsonRequest(), destinationContext)).status).toBe(404); });
  it('maps unauthorized mutations without forwarding bodies', async () => { getCookie.mockReturnValue(undefined); expect((await postForm(jsonRequest(), projectContext)).status).toBe(401); expect((await postDestination(jsonRequest(), formContext)).status).toBe(401); expect((await patchForm(jsonRequest(), formContext)).status).toBe(401); expect((await deleteDestination(request(), destinationContext)).status).toBe(401); expect((await activateTelegram(request(), destinationContext)).status).toBe(401); });
});
function request() { return new Request('http://local'); }
function jsonRequest() { return new Request('http://local', { method: 'POST', body: '{}' }); }
function badRequest() { return new Request('http://local', { method: 'POST', body: '{' }); }
