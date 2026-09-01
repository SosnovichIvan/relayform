type RateLimitResult = { isAllowed: true } | { isAllowed: false; retryAfterSeconds: number };

type Bucket = { requestCount: number; resetsAt: number };

export class FixedWindowRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly maxRequests = 60,
    private readonly windowMs = 60_000,
    private readonly now: () => number = Date.now,
  ) {
    if (!Number.isInteger(maxRequests) || maxRequests <= 0) throw new Error('maxRequests must be a positive integer');
    if (!Number.isInteger(windowMs) || windowMs <= 0) throw new Error('windowMs must be a positive integer');
  }

  consume(key: string): RateLimitResult {
    const currentTime = this.now();
    const currentBucket = this.buckets.get(key);
    if (!currentBucket || currentTime >= currentBucket.resetsAt) {
      this.buckets.set(key, { requestCount: 1, resetsAt: currentTime + this.windowMs });
      return { isAllowed: true };
    }
    if (currentBucket.requestCount >= this.maxRequests) {
      return { isAllowed: false, retryAfterSeconds: Math.max(1, Math.ceil((currentBucket.resetsAt - currentTime) / 1000)) };
    }
    currentBucket.requestCount += 1;
    return { isAllowed: true };
  }
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function createEventRateLimiter(environment: NodeJS.ProcessEnv = process.env): FixedWindowRateLimiter {
  return new FixedWindowRateLimiter(
    positiveInteger(environment.EVENT_RATE_LIMIT_MAX, 60),
    positiveInteger(environment.EVENT_RATE_LIMIT_WINDOW_MS, 60_000),
  );
}

export function createEmailVerificationRateLimiter(environment: NodeJS.ProcessEnv = process.env): FixedWindowRateLimiter {
  return new FixedWindowRateLimiter(
    positiveInteger(environment.EMAIL_VERIFICATION_RATE_LIMIT_MAX, 10),
    positiveInteger(environment.EMAIL_VERIFICATION_RATE_LIMIT_WINDOW_MS, 60_000),
  );
}
