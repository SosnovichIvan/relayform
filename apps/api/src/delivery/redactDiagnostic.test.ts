import { describe, expect, it } from 'vitest';
import { redactDiagnostic } from './redactDiagnostic.js';

describe('redactDiagnostic', () => {
  it('removes provider secrets and recipient e-mail from diagnostics', () => {
    const message = 'authorization: secret-value; token=abc; failed for owner@relayform.ru';
    expect(redactDiagnostic(message)).toBe('authorization=[redacted]; token=[redacted]; failed for [email redacted]');
  });

  it('preserves a diagnostic without sensitive values', () => {
    expect(redactDiagnostic('provider returned 429')).toBe('provider returned 429');
  });
});
