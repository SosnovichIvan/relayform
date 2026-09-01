import { describe, expect, it } from 'vitest';
import { createProjectApiKey, hashSecret, verifySecret } from './credentialService.js';

describe('credential service', () => {
  it('verifies only the original password', () => {
    const stored = hashSecret('correct-horse-battery');
    expect(verifySecret('correct-horse-battery', stored)).toBe(true);
    expect(verifySecret('wrong-password', stored)).toBe(false);
  });

  it('rejects malformed stored values and creates non-empty API keys', () => {
    expect(verifySecret('anything', 'broken')).toBe(false);
    expect(createProjectApiKey()).toMatch(/^rf_live_/);
  });
});
