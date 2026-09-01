import type { Project } from '@/entities/project';
import { authenticatedBackendRequest, jsonRequest, stableError } from '@/shared/api/relayformBackend';

export async function GET() {
  const response = await authenticatedBackendRequest('/v1/projects');
  if (!response.ok) return Response.json({ error: response.status === 401 ? 'unauthorized' : stableError(response.status) }, { status: response.status });
  const payload = await response.json() as { projects?: Project[] };
  return Response.json({ projects: payload.projects ?? [] });
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: 'invalidRequest' }, { status: 400 }); }
  const response = await authenticatedBackendRequest('/v1/projects', jsonRequest('POST', body));
  if (!response.ok) return Response.json({ error: response.status === 401 ? 'unauthorized' : stableError(response.status) }, { status: response.status });
  const project = await response.json() as Project & { apiKey?: string };
  return Response.json({ id: project.id, name: typeof project.name === 'string' ? project.name : (body as { name?: string }).name ?? '' }, { status: 201 });
}
