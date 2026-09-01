import { describe, expect, it, vi } from 'vitest';
import { InMemoryVkDestinationActivationStore } from './inMemoryVkDestinationActivationStore.js';

describe('InMemoryVkDestinationActivationStore', () => {
  it('replaces, expires and consumes an activation once', async () => {
    const activate = vi.fn().mockReturnValue(true);
    const store = new InMemoryVkDestinationActivationStore(activate);
    await store.issue('owner', 'destination', 'old', new Date(2_000));
    await store.issue('owner', 'destination', 'current', new Date(2_000));
    await expect(store.consume('old', '100', new Date(1_000))).resolves.toBe(false);
    await expect(store.consume('current', '100', new Date(2_000))).resolves.toBe(false);
    await store.issue('owner', 'destination', 'valid', new Date(3_000));
    await expect(store.consume('valid', '100', new Date(2_000))).resolves.toBe(true);
    expect(activate).toHaveBeenCalledWith('owner', 'destination', '100');
    await expect(store.consume('valid', '100', new Date(2_000))).resolves.toBe(false);
  });

  it('keeps a code when destination activation fails', async () => {
    const store = new InMemoryVkDestinationActivationStore(() => false);
    await store.issue('owner', 'destination', 'digest', new Date(2_000));
    await expect(store.consume('digest', '100', new Date(1_000))).resolves.toBe(false);
  });
});
