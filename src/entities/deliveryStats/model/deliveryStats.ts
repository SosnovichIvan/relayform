export type DeliveryCounts = { total: number; delivered: number; failed: number; queued: number };
export type DeliveryProvider = 'telegram' | 'vk' | 'max' | 'email';
export type ProviderDeliveryStats = DeliveryCounts & { provider: DeliveryProvider };
export type FormDeliveryStats = DeliveryCounts & { formId: string; providers: ProviderDeliveryStats[] };
export type ProjectDeliveryStats = DeliveryCounts & { periodDays: number; forms: FormDeliveryStats[] };

export const emptyProjectDeliveryStats: ProjectDeliveryStats = { periodDays: 30, total: 0, delivered: 0, failed: 0, queued: 0, forms: [] };

export function removeFormDeliveryStats(current: ProjectDeliveryStats, formId: string): ProjectDeliveryStats {
  const removed = current.forms.find((form) => form.formId === formId);
  if (!removed) return current;
  return {
    ...current,
    total: current.total - removed.total,
    delivered: current.delivered - removed.delivered,
    failed: current.failed - removed.failed,
    queued: current.queued - removed.queued,
    forms: current.forms.filter((form) => form.formId !== formId),
  };
}
