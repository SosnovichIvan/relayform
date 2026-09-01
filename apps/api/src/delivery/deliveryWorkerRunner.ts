type DrainableWorker = { runOne(): Promise<unknown | undefined> };

export class DeliveryWorkerRunner {
  private timer?: ReturnType<typeof setInterval>;
  private isRunning = false;
  private isPending = false;

  constructor(
    private readonly worker: DrainableWorker,
    private readonly intervalMs = 1_000,
    private readonly maxBatchSize = 100,
    private readonly shouldUnrefTimer = true,
  ) {}

  start(): void {
    if (this.timer) return;
    this.wake();
    this.timer = setInterval(() => this.wake(), this.intervalMs);
    if (this.shouldUnrefTimer) this.timer.unref?.();
  }

  wake(): void {
    this.isPending = true;
    void this.runNow().catch(() => undefined);
  }

  async runNow(): Promise<void> {
    if (this.isRunning) {
      this.isPending = true;
      return;
    }
    this.isRunning = true;
    try {
      do {
        this.isPending = false;
        for (let processed = 0; processed < this.maxBatchSize; processed += 1) {
          if (await this.worker.runOne() === undefined) break;
        }
      } while (this.isPending);
    } finally {
      this.isRunning = false;
    }
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }
}
