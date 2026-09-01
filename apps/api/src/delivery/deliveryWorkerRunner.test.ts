import { describe, expect, it, vi } from 'vitest';
import { DeliveryWorkerRunner } from './deliveryWorkerRunner.js';

describe('DeliveryWorkerRunner', () => {
  it('starts immediately, drains available work and stops polling', async () => {
    vi.useFakeTimers();
    const worker = { runOne: vi.fn().mockResolvedValueOnce({ status: 'delivered' }).mockResolvedValue(undefined) };
    const runner = new DeliveryWorkerRunner(worker, 1_000);
    runner.start();
    await vi.waitFor(() => expect(worker.runOne).toHaveBeenCalledTimes(2));
    await vi.advanceTimersByTimeAsync(1_000);
    expect(worker.runOne).toHaveBeenCalledTimes(3);
    runner.stop();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(worker.runOne).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it('queues a wake-up instead of overlapping active passes', async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    let active = 0;
    let maximumActive = 0;
    const worker = { runOne: vi.fn().mockImplementation(async () => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      if (worker.runOne.mock.calls.length === 1) await pending;
      active -= 1;
      return undefined;
    }) };
    const runner = new DeliveryWorkerRunner(worker);
    const first = runner.runNow();
    runner.wake();
    release();
    await first;
    await vi.waitFor(() => expect(worker.runOne).toHaveBeenCalledTimes(2));
    expect(maximumActive).toBe(1);
  });
});
