import { describe, expect, it, vi } from 'vitest';
import { InMemoryEmailDestinationActivationStore } from './inMemoryEmailDestinationActivationStore.js';

describe('InMemoryEmailDestinationActivationStore', () => {
  it('replaces, activates and consumes a token once', async () => {
    const activate = vi.fn().mockResolvedValue(true);
    const store = new InMemoryEmailDestinationActivationStore(activate);
    await store.issue('owner-1', 'destination-1', 'old', new Date('2026-01-01T00:15:00Z'));
    await store.issue('owner-1', 'destination-1', 'current', new Date('2026-01-01T00:15:00Z'));
    expect(await store.consume('old', new Date('2026-01-01T00:01:00Z'))).toEqual({ status: 'invalid' });
    expect(await store.consume('current', new Date('2026-01-01T00:01:00Z'))).toEqual({ status: 'confirmed' });
    expect(activate).toHaveBeenCalledWith('owner-1', 'destination-1');
    expect(await store.consume('current', new Date('2026-01-01T00:02:00Z'))).toEqual({ status: 'alreadyUsed' });
  });

  it('classifies expired, failed and missing-destination activations', async () => {
    const expired = new InMemoryEmailDestinationActivationStore(() => true);
    await expired.issue('owner-1', 'destination-1', 'expired', new Date('2026-01-01T00:15:00Z'));
    expect(await expired.consume('expired', new Date('2026-01-01T00:15:00Z'))).toEqual({ status: 'expired' });
    await expired.invalidate('destination-1');
    expect(await expired.consume('missing', new Date())).toEqual({ status: 'invalid' });

    const failed = new InMemoryEmailDestinationActivationStore(() => false);
    await failed.issue('owner-1', 'destination-1', 'failed', new Date('2026-01-01T00:15:00Z'));
    expect(await failed.consume('failed', new Date('2026-01-01T00:01:00Z'))).toEqual({ status: 'invalid' });
    await failed.invalidate('destination-1');
    expect(await failed.consume('failed', new Date('2026-01-01T00:02:00Z'))).toEqual({ status: 'invalid' });
    await failed.invalidate('unknown');
  });
});
