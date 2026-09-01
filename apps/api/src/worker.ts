import { Pool } from 'pg';
import { createDeliveryWorkerProcess, registerWorkerShutdown, requireWorkerDatabaseUrl } from './delivery/deliveryWorkerProcess.js';

const runtime = createDeliveryWorkerProcess(new Pool({ connectionString: requireWorkerDatabaseUrl() }));
registerWorkerShutdown(runtime);
runtime.start();
