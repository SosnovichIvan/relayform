export type DeliveryProvider = 'telegram' | 'vk' | 'max' | 'email';

export type AcceptDeliveryInput = {
  projectId: string;
  formId: string;
  eventId: string;
  destinationId: string;
  idempotencyKey: string;
  provider: DeliveryProvider;
  recipient: string;
  message: string;
};

export type AcceptedDelivery = { attemptId: string; isNew: boolean };
export type ClaimedDelivery = {
  attemptId: string;
  provider: DeliveryProvider;
  recipient: string;
  message: string;
  attemptNumber: number;
  maxAttempts: number;
};
export type DeliveryStatus = {
  id: string;
  status: 'queued' | 'delivered' | 'failed';
  providerMessageId?: string;
  failureCode?: string;
  isRetryable?: boolean;
};

export type DeliveryCount = { total: number; delivered: number; failed: number; queued: number };
export type ProviderDeliveryStats = DeliveryCount & { provider: DeliveryProvider };
export type FormDeliveryStats = DeliveryCount & { formId: string; providers: ProviderDeliveryStats[] };
export type ProjectDeliveryStats = DeliveryCount & { forms: FormDeliveryStats[] };
export type DeliveryStatsRow = { formId: string; provider: DeliveryProvider; status: DeliveryStatus['status']; count: number };
export type FailedDelivery = { id: string; formId: string; provider: DeliveryProvider; failureCode: string; isRetryable: boolean; failedAt: string };
export type ReplayDeliveryResult = 'replayed' | 'notFound' | 'notReplayable';

export interface DeliveryRepository {
  accept(input: AcceptDeliveryInput): Promise<AcceptedDelivery>;
  claim(workerId: string, leaseMs: number): Promise<ClaimedDelivery | undefined>;
  completeDelivered(attemptId: string, providerMessageId: string): Promise<void>;
  completeFailed(attemptId: string, failureCode: string, isRetryable: boolean): Promise<void>;
  rescheduleRetry(attemptId: string, failureCode: string, delayMs: number): Promise<void>;
  getStatus(projectId: string, attemptId: string): Promise<DeliveryStatus | undefined>;
  getStats(projectId: string, since: Date): Promise<ProjectDeliveryStats>;
  listFailed(projectId: string, limit: number): Promise<FailedDelivery[]>;
  replayFailed(projectId: string, attemptId: string, requestedBy: string): Promise<ReplayDeliveryResult>;
}

export function aggregateDeliveryStats(rows: DeliveryStatsRow[]): ProjectDeliveryStats {
  const result: ProjectDeliveryStats = { total: 0, delivered: 0, failed: 0, queued: 0, forms: [] };
  const forms = new Map<string, FormDeliveryStats>();
  for (const row of rows) {
    let form = forms.get(row.formId);
    if (!form) {
      form = { formId: row.formId, total: 0, delivered: 0, failed: 0, queued: 0, providers: [] };
      forms.set(row.formId, form);
      result.forms.push(form);
    }
    let provider = form.providers.find((candidate) => candidate.provider === row.provider);
    if (!provider) {
      provider = { provider: row.provider, total: 0, delivered: 0, failed: 0, queued: 0 };
      form.providers.push(provider);
    }
    result.total += row.count;
    result[row.status] += row.count;
    form.total += row.count;
    form[row.status] += row.count;
    provider.total += row.count;
    provider[row.status] += row.count;
  }
  return result;
}
