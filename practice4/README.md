# Практика 4 — мониторинг и наблюдаемость в Kubernetes

В репозитории развернут учебный стек **Prometheus + Grafana** (Helm `kube-prometheus-stack`) и инструментированы микросервисы **gateway** и **worker** из практики 2 так, чтобы метрики снимались в кластере **Minikube** наряду с уже поднятым приложением из практики 3.

## Что сделано

| Пункт | Реализация |
|-------|------------|
| Экспорт **`/metrics`** в формате Prometheus | Gateway (SvelteKit): [`hooks.server.ts`](../practice2/services/gateway/src/hooks.server.ts); worker (Fastify): [`index.ts`](../practice2/services/worker/src/index.ts) |
| Счётчик HTTP (маршрут/код) | `http_requests_total`, `worker_http_requests_total` |
| Гистограмма времени ответа | `http_request_duration_seconds`, `worker_http_request_duration_seconds` |
| Счётчик бизнес-операций | `finance_transactions_created_total`, `finance_budget_recalculations_total` |
| Дашборд с несколькими панелями «в движении» | [`monitoring/dashboards/finance-metrics-min.json`](./monitoring/dashboards/finance-metrics-min.json) |
| Нагрузка порядка **100–200** запросов | [`monitoring/load-test-public-health.sh`](./monitoring/load-test-public-health.sh) |

Исходный код сервисов: [`practice2/services/`](../practice2/services/). Манифесты приложения: [`practice3/k8s/`](../practice3/k8s/).

## Отчёт в репозитории

- [`PRACTICE4.md`](./PRACTICE4.md) — текст и встроенные скриншоты.
- [`screenshots/`](./screenshots/README.md) — исходные изображения.

## Локальный доступ (Ingress + Grafana + Prometheus)

- [`LOCAL-INFRA.md`](./LOCAL-INFRA.md) — порядок команд «с нуля» и без пересборки.
- [`local-access.sh`](./local-access.sh) — проброс **8080** (приложение), **3000** (Grafana), **9090** (Prometheus) и вкладки в браузере (macOS):  
  `./practice4/local-access.sh start` · `stop` · `bootstrap`.

## Установка kube-prometheus-stack

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace \
  -f practice4/monitoring/kube-prometheus-stack-values-minikube.yaml
```

Дождитесь состояния **Running** у основных подов в namespace `monitoring`.

## Сбор метрик приложения

После деплоя приложения в `finances`:

```bash
kubectl apply -f practice4/monitoring/servicemonitor-gateway.yaml
kubectl apply -f practice4/monitoring/servicemonitor-worker.yaml
```

В UI Prometheus (**Status → Targets**) цели для gateway и worker должны быть **UP**. После добавления или изменения метрик в коде пересоберите образы и выполните `kubectl rollout restart` для нужных Deployment — см. [`practice3/README.md`](../practice3/README.md).

## Grafana

Проброс (пример): `kubectl port-forward -n monitoring svc/monitoring-grafana 3000:80` — в браузере **http://127.0.0.1:3000**. Логин **admin**, пароль задан в [`monitoring/kube-prometheus-stack-values-minikube.yaml`](./monitoring/kube-prometheus-stack-values-minikube.yaml) (по умолчанию `admin-change-me`).

Импорт дашборда: **Dashboards → Import** → файл `monitoring/dashboards/finance-metrics-min.json`, источник данных **Prometheus**.

## Нагрузочный тест

С работающим доступом к приложению через Ingress (как в практике 3, например `http://finance.localtest.me:8080`):

```bash
BASE_URL=http://finance.localtest.me:8080 ./practice4/monitoring/load-test-public-health.sh
```

Скриншоты дашборда **до и после** прогона и при необходимости отдельный кадр с бизнес-операциями — в [`screenshots/`](./screenshots/README.md).

## Каталог конфигурации

В [`monitoring/`](./monitoring/): Helm values, `ServiceMonitor`, JSON дашборда, скрипт нагрузки.
