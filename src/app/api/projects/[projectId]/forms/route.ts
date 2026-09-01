import type { Relayform } from '@/entities/form';
import { authenticatedBackendRequest, jsonRequest, stableError } from '@/shared/api/relayformBackend';

export async function GET(_request: Request, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params;
  const response = await authenticatedBackendRequest(`/v1/projects/${encodeURIComponent(projectId)}/forms`);
  if (!response.ok) return Response.json({ error: response.status === 401 ? 'unauthorized' : stableError(response.status) }, { status: response.status });
  const payload = await response.json() as { forms?: Relayform[] };
  return Response.json({ forms: payload.forms ?? [] });
}

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params;
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: 'invalidRequest' }, { status: 400 }); }
  const response = await authenticatedBackendRequest(`/v1/projects/${encodeURIComponent(projectId)}/forms`, jsonRequest('POST', body));
  if (!response.ok) return Response.json({ error: response.status === 401 ? 'unauthorized' : stableError(response.status) }, { status: response.status });
  return Response.json(await response.json(), { status: 201 });
}
