import { describe, expect, it } from 'vitest';
import { TelegramActivationStore } from './telegramActivationStore.js';

describe('TelegramActivationStore', () => {
  it('issues a short-lived code and consumes it exactly once', () => {
    const store = new TelegramActivationStore(900_000, () => 1_000, () => 'safe_base64url-code');
    expect(store.issue('owner-1', 'destination-1')).toEqual({ code: 'safe_base64url-code', expiresAt: 901_000 });
    expect(store.consume('safe_base64url-code')).toEqual({ ownerId: 'owner-1', destinationId: 'destination-1', expiresAt: 901_000 });
    expect(store.consume('safe_base64url-code')).toBeUndefined();
  });

  it('removes an expired code and rejects unknown values', () => {
    let currentTime = 1_000;
    const store = new TelegramActivationStore(100, () => currentTime, () => 'expiring-code');
    store.issue('owner-1', 'destination-1');
    currentTime = 1_100;
    expect(store.consume('expiring-code')).toBeUndefined();
    expect(store.consume('unknown-code')).toBeUndefined();
  });

  it('requires a positive expiry duration', () => {
    expect(() => new TelegramActivationStore(0)).toThrow('ttlMs must be a positive integer');
  });
});
