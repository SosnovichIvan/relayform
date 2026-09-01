import { describe, expect, it } from 'vitest';
import { createEventRateLimiter, FixedWindowRateLimiter } from './fixedWindowRateLimiter.js';

describe('FixedWindowRateLimiter', () => {
  it('limits projects independently and reports retry timing', () => {
    const limiter = new FixedWindowRateLimiter(2, 5_000, () => 1_000);
    expect(limiter.consume('project-1')).toEqual({ isAllowed: true });
    expect(limiter.consume('project-1')).toEqual({ isAllowed: true });
    expect(limiter.consume('project-1')).toEqual({ isAllowed: false, retryAfterSeconds: 5 });
    expect(limiter.consume('project-2')).toEqual({ isAllowed: true });
  });

  it('starts a fresh allowance after the window rolls over', () => {
    let currentTime = 1_000;
    const limiter = new FixedWindowRateLimiter(1, 2_000, () => currentTime);
    expect(limiter.consume('project-1').isAllowed).toBe(true);
    currentTime = 2_999;
    expect(limiter.consume('project-1')).toEqual({ isAllowed: false, retryAfterSeconds: 1 });
    currentTime = 3_000;
    expect(limiter.consume('project-1').isAllowed).toBe(true);
  });

  it('uses safe defaults for invalid environment overrides', () => {
    expect(createEventRateLimiter({ EVENT_RATE_LIMIT_MAX: '0', EVENT_RATE_LIMIT_WINDOW_MS: 'invalid' }).consume('project').isAllowed).toBe(true);
    expect(() => new FixedWindowRateLimiter(0, 1)).toThrow('maxRequests must be a positive integer');
    expect(() => new FixedWindowRateLimiter(1, 0)).toThrow('windowMs must be a positive integer');
  });
});
