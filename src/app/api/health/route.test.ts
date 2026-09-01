import { GET } from './route';

describe('health route', () => {
  it('returns the public healthy response', async () => {
    const response = GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });
});
