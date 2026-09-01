import { authenticatedBackendRequest, stableError } from '@/shared/api/relayformBackend';

export async function GET(_request: Request, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params;
  const response = await authenticatedBackendRequest(`/v1/projects/${encodeURIComponent(projectId)}/delivery-stats`);
  if (!response.ok) return Response.json({ error: response.status === 401 ? 'unauthorized' : stableError(response.status) }, { status: response.status });
  return Response.json(await response.json());
}
