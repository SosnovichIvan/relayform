import { cookies } from 'next/headers';

export const sessionCookieName = 'relayform_session';

export type BackendError = 'invalidRequest' | 'invalidCredentials' | 'alreadyRegistered' | 'unauthorized' | 'notFound' | 'unavailable';

export async function backendRequest(path: string, init: RequestInit = {}): Promise<Response> {
  const baseUrl = process.env.RELAYFORM_API_URL ?? 'http://localhost:3001';
  try {
    return await fetch(`${baseUrl}${path}`, { ...init, cache: 'no-store' });
  } catch {
    return Response.json({ error: 'unavailable' satisfies BackendError }, { status: 503 });
  }
}

export async function authenticatedBackendRequest(path: string, init: RequestInit = {}): Promise<Response> {
  const token = (await cookies()).get(sessionCookieName)?.value;
  if (!token) return Response.json({ error: 'unauthorized' satisfies BackendError }, { status: 401 });
  const headers = new Headers(init.headers);
  headers.set('authorization', `Bearer ${token}`);
  return backendRequest(path, { ...init, headers });
}

export function stableError(status: number): BackendError {
  if (status === 401) return 'invalidCredentials';
  if (status === 409) return 'alreadyRegistered';
  if (status === 404) return 'notFound';
  if (status >= 500) return 'unavailable';
  return 'invalidRequest';
}

export function jsonRequest(method: 'POST', body: unknown): RequestInit {
  return { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
}

export type EmailVerificationResult = { status: 'confirmed'; redirectUrl: string } | { status: 'invalid' | 'expired' | 'alreadyUsed' | 'unavailable' };
export type EmailDestinationActivationResult = { status: 'confirmed' | 'invalid' | 'expired' | 'alreadyUsed' | 'unavailable' };

export async function consumeEmailVerification(token: string | undefined): Promise<EmailVerificationResult> {
  if (!token) return { status: 'invalid' };
  const response = await backendRequest('/v1/email-verifications/confirm', jsonRequest('POST', { token }));
  if (response.ok) {
    const body = await response.json() as Partial<{ status: string; redirectUrl: string }>;
    if (body.status === 'confirmed' && isSafeRedirect(body.redirectUrl)) return { status: 'confirmed', redirectUrl: body.redirectUrl! };
    return { status: 'unavailable' };
  }
  if (response.status === 410) return { status: 'expired' };
  if (response.status === 409) return { status: 'alreadyUsed' };
  if (response.status === 400 || response.status === 404) return { status: 'invalid' };
  return { status: 'unavailable' };
}

function isSafeRedirect(value: string | undefined): boolean {
  if (!value) return false;
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
}

export async function consumeEmailDestinationActivation(token: string | undefined): Promise<EmailDestinationActivationResult> {
  if (!token) return { status: 'invalid' };
  const response = await backendRequest('/v1/destination-email-activations/confirm', jsonRequest('POST', { token }));
  if (response.ok) return { status: 'confirmed' };
  if (response.status === 410) return { status: 'expired' };
  if (response.status === 409) return { status: 'alreadyUsed' };
  if (response.status === 400 || response.status === 404) return { status: 'invalid' };
  return { status: 'unavailable' };
}
