import { describe, expect, it } from 'vitest';
import { emptyProjectDeliveryStats, removeFormDeliveryStats } from './deliveryStats';

describe('removeFormDeliveryStats', () => {
  it('subtracts a deleted form from the project aggregate', () => {
    const current = { periodDays: 30, total: 4, delivered: 2, failed: 1, queued: 1, forms: [{ formId: 'form-1', total: 3, delivered: 2, failed: 1, queued: 0, providers: [] }, { formId: 'form-2', total: 1, delivered: 0, failed: 0, queued: 1, providers: [] }] };
    expect(removeFormDeliveryStats(current, 'form-1')).toEqual({ periodDays: 30, total: 1, delivered: 0, failed: 0, queued: 1, forms: [current.forms[1]] });
    expect(removeFormDeliveryStats(current, 'missing')).toBe(current);
  });

  it('exports a stable zero state', () => { expect(emptyProjectDeliveryStats).toMatchObject({ periodDays: 30, total: 0, forms: [] }); });
});
