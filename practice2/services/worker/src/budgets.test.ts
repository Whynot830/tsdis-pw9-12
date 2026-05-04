import { describe, expect, it, beforeAll } from 'vitest';
import Fastify from 'fastify';
import { isSpendingOverLimit, monthBoundsUtc, yearMonthUtc } from './budgets.js';
import { registerInternalRoutes } from './routes.js';

describe('budgets', () => {
  it('yearMonthUtc форматирует UTC-месяц', () => {
    expect(yearMonthUtc(new Date(Date.UTC(2026, 4, 3)))).toBe('2026-05');
  });

  it('monthBoundsUtc даёт [start, end)', () => {
    const { start, endExclusive } = monthBoundsUtc('2026-02');
    expect(start.toISOString()).toBe('2026-02-01T00:00:00.000Z');
    expect(endExclusive.toISOString()).toBe('2026-03-01T00:00:00.000Z');
  });

  it('isSpendingOverLimit строго больше лимита', () => {
    expect(isSpendingOverLimit(100, 100)).toBe(false);
    expect(isSpendingOverLimit(101, 100)).toBe(true);
  });
});

describe('internal auth', () => {
  beforeAll(() => {
    process.env.INTERNAL_API_TOKEN = 'good-token';
  });

  it('POST /internal/recalculate без токена — 401', async () => {
    const app = Fastify({ logger: false });
    await registerInternalRoutes(app, {} as import('postgres').Sql);
    const res = await app.inject({
      method: 'POST',
      url: '/internal/recalculate',
      payload: { userId: 'u1' }
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });
});
