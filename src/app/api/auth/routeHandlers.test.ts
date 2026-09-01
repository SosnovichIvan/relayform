import { expect, it, vi } from 'vitest';
const set = vi.fn();
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ set })) }));
import { POST as login } from './login/route';
import { POST as logout } from './logout/route';
import { POST as register } from './register/route';
it('delegates all authentication routes', async () => { vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => Response.json({ sessionToken: 'token' }))); expect((await login(body())).status).toBe(200); expect((await register(body())).status).toBe(200); expect((await logout()).status).toBe(200); });
function body() { return new Request('http://local', { method: 'POST', body: '{}' }); }
