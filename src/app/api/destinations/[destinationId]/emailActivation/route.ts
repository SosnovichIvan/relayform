import { authenticatedBackendRequest, stableError } from '@/shared/api/relayformBackend';

export async function POST(_request: Request, context: { params: Promise<{ destinationId: string }> }) {
  const { destinationId } = await context.params;
  const response = await authenticatedBackendRequest(`/v1/destinations/${encodeURIComponent(destinationId)}/email-activation`, { method: 'POST' });
  if (!response.ok) return Response.json({ error: response.status === 401 ? 'unauthorized' : stableError(response.status) }, { status: response.status });
  return Response.json(await response.json());
}
