import { authenticatedBackendRequest, stableError } from '@/shared/api/relayformBackend';

async function proxy(formId: string, init?: RequestInit) {
  const response = await authenticatedBackendRequest(`/v1/forms/${encodeURIComponent(formId)}`, init);
  if (!response.ok) return Response.json({ error: response.status === 401 ? 'unauthorized' : stableError(response.status) }, { status: response.status });
  return response.status === 204 ? new Response(null, { status: 204 }) : Response.json(await response.json());
}
export async function GET(_request: Request, context: { params: Promise<{ formId: string }> }) { return proxy((await context.params).formId); }
export async function PATCH(request: Request, context: { params: Promise<{ formId: string }> }) { let body: unknown; try { body = await request.json(); } catch { return Response.json({ error: 'invalidRequest' }, { status: 400 }); } return proxy((await context.params).formId, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); }
export async function DELETE(_request: Request, context: { params: Promise<{ formId: string }> }) { return proxy((await context.params).formId, { method: 'DELETE' }); }
