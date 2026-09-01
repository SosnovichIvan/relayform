import { redirect } from 'next/navigation';
import { EmailVerificationResult } from '@/features/verifyEmail';
import { consumeEmailVerification } from '@/shared/api/relayformBackend';

export const dynamic = 'force-dynamic';

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const result = await consumeEmailVerification((await searchParams).token);
  if (result.status === 'confirmed') redirect(result.redirectUrl);
  return <EmailVerificationResult status={result.status} />;
}
