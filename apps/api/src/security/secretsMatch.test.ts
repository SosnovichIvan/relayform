import { describe, expect, it } from 'vitest';
import { secretsMatch } from './secretsMatch.js';

describe('secretsMatch', () => {
  it('matches only equal non-empty values', () => {
    expect(secretsMatch('secret', 'secret')).toBe(true);
    expect(secretsMatch('secret', 'different')).toBe(false);
    expect(secretsMatch(undefined, 'secret')).toBe(false);
    expect(secretsMatch('secret', undefined)).toBe(false);
  });
});
