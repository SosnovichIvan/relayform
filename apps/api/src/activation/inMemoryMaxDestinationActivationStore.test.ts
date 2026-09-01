import { describe, expect, it, vi } from 'vitest';
import { InMemoryMaxDestinationActivationStore } from './inMemoryMaxDestinationActivationStore.js';

describe('InMemoryMaxDestinationActivationStore', () => {
  it('replaces, consumes once and activates the current token', async () => {
    const activate = vi.fn().mockResolvedValue(true);
    const store = new InMemoryMaxDestinationActivationStore(activate);
    await store.issue('owner', 'destination', 'old', new Date(2_000));
    await store.issue('owner', 'destination', 'current', new Date(2_000));
    await expect(store.consume('old', '100', new Date(1_000))).resolves.toBe(false);
    await expect(store.consume('current', '100', new Date(1_000))).resolves.toBe(true);
    await expect(store.consume('current', '200', new Date(1_000))).resolves.toBe(false);
    expect(activate).toHaveBeenCalledOnce();
  });

  it('keeps expired or failed activations inactive', async () => {
    const store = new InMemoryMaxDestinationActivationStore(() => false);
    await store.issue('owner', 'destination', 'expired', new Date(1_000));
    await expect(store.consume('expired', '100', new Date(1_000))).resolves.toBe(false);
    await store.issue('owner', 'destination', 'failed', new Date(2_000));
    await expect(store.consume('failed', '100', new Date(1_000))).resolves.toBe(false);
  });
});
