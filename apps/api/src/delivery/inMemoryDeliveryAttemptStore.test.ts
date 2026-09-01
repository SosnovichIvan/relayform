import { describe, expect, it } from 'vitest';
import { InMemoryDeliveryAttemptStore } from './inMemoryDeliveryAttemptStore.js';

describe('InMemoryDeliveryAttemptStore', () => {
  it('creates one queued attempt for an idempotency key', () => {
    const store = new InMemoryDeliveryAttemptStore();
    const first = store.createQueued('project-1', 'event-1', 'destination-1', 'event-1:destination-1:v1');
    const duplicate = store.createQueued('project-1', 'event-1', 'destination-1', 'event-1:destination-1:v1');
    expect(first.isNew).toBe(true);
    expect(duplicate).toEqual({ attempt: first.attempt, isNew: false });
    expect(store.get(first.attempt.id)?.status).toBe('queued');
    expect(store.getStatus('project-1', first.attempt.id)).toMatchObject({ id: first.attempt.id, status: 'queued' });
    expect(store.getStatus('project-2', first.attempt.id)).toBeUndefined();
    expect(store.getStatus('project-1', 'missing')).toBeUndefined();
  });
});
