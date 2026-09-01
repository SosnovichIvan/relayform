import { describe, expect, it } from 'vitest';
import { RetryPolicy } from './retryPolicy.js';

describe('RetryPolicy', () => {
  it('applies bounded exponential backoff with jitter', () => {
    const minimumJitter = new RetryPolicy({ baseDelayMs: 1_000, maxDelayMs: 10_000, random: () => 0 });
    expect(minimumJitter.delay(1)).toBe(500);
    expect(minimumJitter.delay(3)).toBe(2_000);
    expect(minimumJitter.delay(20)).toBe(10_000);
  });

  it('honours a provider hint within the configured bound', () => {
    const policy = new RetryPolicy({ baseDelayMs: 1_000, maxDelayMs: 10_000, random: () => 1 });
    expect(policy.delay(1, 5_000)).toBe(5_000);
    expect(policy.delay(1, 50_000)).toBe(10_000);
  });
});
