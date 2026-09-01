import { handleAuthentication } from '@/shared/api/authenticationHandler';

export async function POST(request: Request) { return handleAuthentication(request, 'register'); }
