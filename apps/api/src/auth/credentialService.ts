import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashSecret(secret: string, salt = randomBytes(16).toString('hex')): string {
  const digest = scryptSync(secret, salt, 32).toString('hex');
  return `${salt}:${digest}`;
}

export function verifySecret(secret: string, stored: string): boolean {
  const [salt, digest] = stored.split(':');
  if (!salt || !digest) return false;
  const expected = Buffer.from(digest, 'hex');
  const actual = scryptSync(secret, salt, 32);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function createProjectApiKey(): string { return `rf_live_${randomBytes(24).toString('hex')}`; }
