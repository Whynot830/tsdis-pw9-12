import { Counter, Histogram, Registry } from 'prom-client';

export const register = new Registry();

export const httpRequestsTotal = new Counter({
  name: 'worker_http_requests_total',
  help: 'HTTP-запросы воркера по маршруту и коду ответа',
  labelNames: ['method', 'route', 'code'],
  registers: [register]
});

export const httpRequestDurationSeconds = new Histogram({
  name: 'worker_http_request_duration_seconds',
  help: 'Длительность обработки HTTP-запросов воркером, сек',
  labelNames: ['method', 'route'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register]
});

/** Бизнес-метрика: вызовы пересчёта бюджета по исходу. */
export const financeBudgetRecalculationsTotal = new Counter({
  name: 'finance_budget_recalculations_total',
  help: 'Запуски пересчёта бюджета после изменения данных',
  labelNames: ['result'],
  registers: [register]
});
