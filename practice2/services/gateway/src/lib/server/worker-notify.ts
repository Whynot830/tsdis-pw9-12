/** Базовый URL воркера без завершающего слэша + путь пересчёта бюджетов. */
export function workerRecalculateUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, '')}/internal/recalculate`;
}

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export function notifyWorkerRecalculate(
  baseUrl: string | undefined,
  token: string | undefined,
  userId: string,
  fetchImpl: FetchLike = fetch
): void {
  if (!baseUrl?.trim() || !token?.trim()) {
    console.warn('[worker-notify] WORKER_INTERNAL_URL or INTERNAL_API_TOKEN not set, skipping notify');
    return;
  }
  const url = workerRecalculateUrl(baseUrl.trim());
  void fetchImpl(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Token': token.trim()
    },
    body: JSON.stringify({ userId, reason: 'transaction_created' })
  }).catch((e: unknown) => console.error('[worker-notify] request failed', e));
}
