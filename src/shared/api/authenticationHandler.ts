import { cookies } from 'next/headers';
import { backendRequest, jsonRequest, sessionCookieName, stableError } from '@/shared/api/relayformBackend';

type Mode = 'login' | 'register';

export async function handleAuthentication(request: Request, mode: Mode): Promise<Response> {
  let credentials: unknown;
  try {
    credentials = await request.json();
  } catch {
    return Response.json({ error: 'invalidRequest' }, { status: 400 });
  }
  const response = await backendRequest(`/v1/auth/${mode}`, jsonRequest('POST', credentials));
  if (!response.ok) return Response.json({ error: stableError(response.status) }, { status: response.status });
  const payload = await response.json() as { sessionToken?: string };
  if (!payload.sessionToken) return Response.json({ error: 'unavailable' }, { status: 503 });
  (await cookies()).set(sessionCookieName, payload.sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return Response.json({ ok: true });
}

export async function handleLogout(): Promise<Response> {
  (await cookies()).set(sessionCookieName, '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 });
  return Response.json({ ok: true });
}
