import { handleLogout } from '@/shared/api/authenticationHandler';

export async function POST() { return handleLogout(); }
