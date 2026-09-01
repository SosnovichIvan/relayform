import type { DeliveryDatabase } from './postgresDeliveryRepository.js';
import { PostgresDeliveryRepository } from './postgresDeliveryRepository.js';
import { DeliveryWorkerRunner } from './deliveryWorkerRunner.js';
import { TransportDeliveryWorker, type TransportRegistry } from './transportDeliveryWorker.js';
import { createTransportRegistry } from './transports/createTransportRegistry.js';

export type WorkerDatabase = DeliveryDatabase & { end(): Promise<void> };
type WorkerRunner = { start(): void; stop(): void };
type SignalTarget = {
  exitCode?: string | number | null;
  once(signal: 'SIGTERM' | 'SIGINT', listener: () => void): unknown;
  off(signal: 'SIGTERM' | 'SIGINT', listener: () => void): unknown;
};

export class DeliveryWorkerProcess {
  private isStopped = false;

  constructor(private readonly database: WorkerDatabase, private readonly runner: WorkerRunner) {}

  start(): void {
    if (!this.isStopped) this.runner.start();
  }

  async stop(): Promise<void> {
    if (this.isStopped) return;
    this.isStopped = true;
    this.runner.stop();
    await this.database.end();
  }
}

export function createDeliveryWorkerProcess(database: WorkerDatabase, transports: TransportRegistry = createTransportRegistry()): DeliveryWorkerProcess {
  const repository = new PostgresDeliveryRepository(database);
  const worker = new TransportDeliveryWorker(repository, transports);
  return new DeliveryWorkerProcess(database, new DeliveryWorkerRunner(worker, 1_000, 100, false));
}

export function registerWorkerShutdown(runtime: Pick<DeliveryWorkerProcess, 'stop'>, signalTarget: SignalTarget = process): void {
  let isStopping = false;
  const stop = () => {
    if (isStopping) return;
    isStopping = true;
    signalTarget.off('SIGTERM', stop);
    signalTarget.off('SIGINT', stop);
    void runtime.stop().catch(() => { signalTarget.exitCode = 1; });
  };
  signalTarget.once('SIGTERM', stop);
  signalTarget.once('SIGINT', stop);
}

export function requireWorkerDatabaseUrl(environment: NodeJS.ProcessEnv = process.env): string {
  const databaseUrl = environment.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error('DATABASE_URL is required for the delivery worker');
  return databaseUrl;
}
