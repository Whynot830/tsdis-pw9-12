import { Counter, Histogram, Registry } from 'prom-client';

export const register = new Registry();

const labelNames = ['method', 'route', 'code'] as const;

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests handled by the gateway',
  labelNames,
  registers: [register]
});

export const httpRequestDurationSeconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register]
});

/** Бизнес-метрика: успешное создание транзакции (методичка: пример passwords_generated_total). */
export const financeTransactionsCreatedTotal = new Counter({
  name: 'finance_transactions_created_total',
  help: 'Количество успешно созданных транзакций через API',
  registers: [register]
});

export function routeLabel(event: { route: { id: string | null }; url: URL }): string {
  return event.route.id ?? event.url.pathname;
}
