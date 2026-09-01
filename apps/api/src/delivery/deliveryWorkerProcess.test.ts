import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import type { DeliveryDatabase } from './postgresDeliveryRepository.js';
import { createDeliveryWorkerProcess, DeliveryWorkerProcess, registerWorkerShutdown, requireWorkerDatabaseUrl, type WorkerDatabase } from './deliveryWorkerProcess.js';

describe('DeliveryWorkerProcess', () => {
  it('starts and closes its runner and database only once', async () => {
    const database = { end: vi.fn().mockResolvedValue(undefined) } as unknown as WorkerDatabase;
    const runner = { start: vi.fn(), stop: vi.fn() };
    const runtime = new DeliveryWorkerProcess(database, runner);
    runtime.start();
    await runtime.stop();
    await runtime.stop();
    runtime.start();
    expect(runner.start).toHaveBeenCalledOnce();
    expect(runner.stop).toHaveBeenCalledOnce();
    expect(database.end).toHaveBeenCalledOnce();
  });

  it('builds a referenced polling runtime over PostgreSQL', async () => {
    const database = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
      connect: vi.fn(),
      end: vi.fn().mockResolvedValue(undefined),
    } as unknown as DeliveryDatabase & { end(): Promise<void> };
    const runtime = createDeliveryWorkerProcess(database, {});
    runtime.start();
    await vi.waitFor(() => expect(database.query).toHaveBeenCalled());
    await runtime.stop();
    expect(database.end).toHaveBeenCalledOnce();
  });

  it('registers both shutdown signals and removes them before stopping', async () => {
    const target = new EventEmitter() as EventEmitter & { exitCode?: number };
    const runtime = { stop: vi.fn().mockResolvedValue(undefined) };
    registerWorkerShutdown(runtime, target);
    expect(target.listenerCount('SIGTERM')).toBe(1);
    expect(target.listenerCount('SIGINT')).toBe(1);
    target.emit('SIGTERM');
    await vi.waitFor(() => expect(runtime.stop).toHaveBeenCalledOnce());
    expect(target.listenerCount('SIGTERM')).toBe(0);
    expect(target.listenerCount('SIGINT')).toBe(0);
  });

  it('marks a failed graceful shutdown', async () => {
    const target = new EventEmitter() as EventEmitter & { exitCode?: number };
    registerWorkerShutdown({ stop: vi.fn().mockRejectedValue(new Error('private')) }, target);
    target.emit('SIGINT');
    await vi.waitFor(() => expect(target.exitCode).toBe(1));
  });

  it('requires and normalizes the worker database URL', () => {
    expect(requireWorkerDatabaseUrl({ DATABASE_URL: ' postgres://relayform ' })).toBe('postgres://relayform');
    expect(() => requireWorkerDatabaseUrl({ DATABASE_URL: ' ' })).toThrow('DATABASE_URL is required');
    expect(() => requireWorkerDatabaseUrl({})).toThrow('DATABASE_URL is required');
  });
});
