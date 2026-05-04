import { describe, expect, it, vi } from 'vitest';
import { notifyWorkerRecalculate, workerRecalculateUrl } from './worker-notify';

describe('workerRecalculateUrl', () => {
  it('убирает завершающий слэш и добавляет путь', () => {
    expect(workerRecalculateUrl('http://worker:3001')).toBe('http://worker:3001/internal/recalculate');
    expect(workerRecalculateUrl('http://worker:3001/')).toBe('http://worker:3001/internal/recalculate');
  });
});

describe('notifyWorkerRecalculate', () => {
  it('не вызывает fetch если нет URL или токена', () => {
    const fetchMock = vi.fn();
    notifyWorkerRecalculate(undefined, 'tok', 'u1', fetchMock);
    notifyWorkerRecalculate('http://w', undefined, 'u1', fetchMock);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('отправляет POST с заголовком и телом', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response());
    notifyWorkerRecalculate('http://worker:3001', 'secret', 'user-xyz', fetchMock);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://worker:3001/internal/recalculate');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/json',
      'X-Internal-Token': 'secret'
    });
    expect(JSON.parse(init.body as string)).toEqual({
      userId: 'user-xyz',
      reason: 'transaction_created'
    });
  });
});
