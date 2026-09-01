import { authenticatedBackendRequest, stableError } from '@/shared/api/relayformBackend';

export async function POST(_request: Request, context: { params: Promise<{ projectId: string; attemptId: string }> }) {
  const { projectId, attemptId } = await context.params;
  const response = await authenticatedBackendRequest(`/v1/projects/${encodeURIComponent(projectId)}/delivery-attempts/${encodeURIComponent(attemptId)}/replay`, { method: 'POST' });
  if (!response.ok) return Response.json({ error: response.status === 401 ? 'unauthorized' : response.status === 409 ? 'notReplayable' : stableError(response.status) }, { status: response.status });
  return Response.json(await response.json(), { status: response.status });
}
