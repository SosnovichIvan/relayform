import { EmailDestinationActivationResult } from '@/features/activateEmailDestination';
import { consumeEmailDestinationActivation } from '@/shared/api/relayformBackend';

export const dynamic = 'force-dynamic';

export default async function ActivateEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const result = await consumeEmailDestinationActivation((await searchParams).token);
  return <EmailDestinationActivationResult status={result.status} />;
}
