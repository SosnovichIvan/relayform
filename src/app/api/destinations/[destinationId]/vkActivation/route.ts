import { authenticatedBackendRequest, stableError } from '@/shared/api/relayformBackend';

type Context = { params: Promise<{ destinationId: string }> };

export async function GET(_request: Request, context: Context) {
  return proxy(context, 'GET');
}

export async function POST(_request: Request, context: Context) {
  return proxy(context, 'POST');
}

async function proxy(context: Context, method: 'GET' | 'POST') {
  const { destinationId } = await context.params;
  const response = await authenticatedBackendRequest(`/v1/destinations/${encodeURIComponent(destinationId)}/vk-activation`, { method });
  if (!response.ok) return Response.json({ error: response.status === 401 ? 'unauthorized' : stableError(response.status) }, { status: response.status });
  return Response.json(await response.json());
}
