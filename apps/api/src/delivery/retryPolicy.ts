export type RetryPolicyOptions = {
  baseDelayMs?: number;
  maxDelayMs?: number;
  random?: () => number;
};

export class RetryPolicy {
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly random: () => number;

  constructor(options: RetryPolicyOptions = {}) {
    this.baseDelayMs = options.baseDelayMs ?? 1_000;
    this.maxDelayMs = options.maxDelayMs ?? 15 * 60_000;
    this.random = options.random ?? Math.random;
  }

  delay(attemptNumber: number, retryAfterMs?: number): number {
    const exponential = this.baseDelayMs * 2 ** Math.max(0, attemptNumber - 1);
    const jittered = exponential * (0.5 + Math.min(1, Math.max(0, this.random())) * 0.5);
    return Math.min(this.maxDelayMs, Math.max(Math.round(jittered), retryAfterMs ?? 0));
  }
}
