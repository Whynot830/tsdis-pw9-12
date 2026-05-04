# Практика 3 — Kubernetes (Minikube): манифесты и инструкция

Цель: развернуть **gateway**, **worker** и **PostgreSQL** из практики 2 в **Minikube** с **Deployment**, **Service (ClusterIP)**, **Ingress**, вынести конфигурацию в **ConfigMap** и **Secret**.

Первоисточник требований цикла: **[`pw9-12.md`](../pw9-12.md)** (раздел «Практика No3»). Ниже — реализация под ваш стек (SvelteKit + worker + Postgres в кластере).

Исходный код сервисов по-прежнему в [`practice2/services/`](../practice2/services/). Образы собираются локально и помечаются `imagePullPolicy: Never` (ожидается `eval $(minikube docker-env)`).

| Требование из методички | В репозитории |
|------------------------|---------------|
| Отдельный Deployment на каждый микросервис П2 | `deployment-gateway.yaml`, `deployment-worker.yaml` |
| Реплики: минимум 1; **для фронтенда рекомендуется 2** | gateway: **2**, worker: 1 |
| ClusterIP Service на каждый Deployment | `service-gateway.yaml`, `service-worker.yaml`, `service-postgres.yaml` |
| Ingress снаружи к «API Gateway» (веб+API) | `ingress.yaml`, хосты **`finance.localtest.me`** (удобно на macOS) и **`finance.local`** |
| Пароли, URL — в ConfigMap / Secret | `configmap.yaml`, `secret.example.yaml` |
| PVC при необходимости | `pvc-postgres.yaml` (+ опционально **StatefulSet** в методичке — только как усложнение) |

## Что лежит в каталоге

| Путь | Назначение |
|------|------------|
| [`k8s/`](./k8s/) | Namespace, Postgres (PVC + Deployment + Service), Job миграций БД, Deployments/Services gateway и worker, Ingress |
| [`PRACTICE3.md`](./PRACTICE3.md) | По методичке: образы, шаги Minikube, скриншоты, усложнения |
| [`OTCHET-TEKST.md`](./OTCHET-TEKST.md) | Связный текст для Word / Google Docs |
| [`screenshots/`](./screenshots/README.md) | Скриншоты для отчёта |
| [`deploy-minikube.sh`](./deploy-minikube.sh) | Всё поднять одной командой (см. ниже) |

## Один запуск (скрипт)

Из **корня** репозитория `pw9-12`.

**macOS + Minikube `driver=docker`:** одна команда поднимает стек, патчит **ORIGIN** на **http://finance.localtest.me:8080**, пробрасывает Ingress на **localhost:8080** и открывает браузер. Имя **`finance.localtest.me`** даёт **127.0.0.1** через обычный DNS (**localtest.me**), **`/etc/hosts` не обязателен**. Имя **`*.local`** на macOS часто конфликтует с mDNS (Bonjour), из‑за этого **`http://finance.local`** в браузере может не открываться даже при записи в hosts.

```bash
./practice3/deploy-minikube.sh --serve
```

Открывайте: **http://finance.localtest.me:8080/**. Остановить проброс: `kill $(cat "${TMPDIR:-/tmp}/finances-ingress-pf.pid")`.

**Без `--serve`** (или если с вашей ОС срабатывает доступ через `minikube ip` и NodePort):

```bash
./practice3/deploy-minikube.sh
```

Один раз создайте локальный Secret (в Git не попадёт — см. `.gitignore`):

```bash
cp practice3/k8s/secret.example.yaml practice3/k8s/k8s-secret.local.yaml
```

При отсутствии `k8s-secret.local.yaml` скрипт использует **`secret.example.yaml`**.

Дополнительные флаги:

```bash
./practice3/deploy-minikube.sh --serve --no-minikube-start   # кластер уже есть
./practice3/deploy-minikube.sh --serve --no-build
./practice3/deploy-minikube.sh --secret путь/к/secret.yaml
```

Перед Job миграции скрипт удаляет старый **`db-migrate`**, чтобы повторный запуск не ломался. Без **`--serve`** скрипт подскажет строку **`/etc/hosts`** с **IP Minikube**; на macOS с docker-дирайвером удобнее всё же **`--serve`**.

### Провайдеры OAuth (Google, GitHub)

В **Secret** задайте ключи: `google-client-id`, `google-client-secret`, при необходимости **`github-client-id`**, **`github-client-secret`** (см. `k8s/secret.example.yaml`). В консоли **Google** / **GitHub OAuth App** укажите redirect URI **строго**:

- **`{ORIGIN}/api/auth/callback/google`**
- **`{ORIGIN}/api/auth/callback/github`**

где **`{ORIGIN}`** совпадает с тем, что в браузере: при **`--serve`** это **http://finance.localtest.me:8080** (без слэша в конце в поле redirect). У **Google** также **Authorized JavaScript origin** = **http://finance.localtest.me:8080**. После правок: **`kubectl apply -f …`** и **`kubectl rollout restart deployment/gateway -n finances`**.

## Образы Docker (имена зафиксированы в манифестах)

Сборка **внутри окружения Docker Minikube** (чтобы кластер видел образы без registry):

```bash
minikube start --driver=docker
minikube addons enable ingress
# По методичке иногда используют отдельный терминал:
# minikube tunnel
# Для доступа через ingress nginx обычно достаточно записи в /etc/hosts с IP из `minikube ip`
# (tunnel нужен в первую очередь для Service типа LoadBalancer).

eval $(minikube docker-env)

docker build -t finance-gateway:latest \
  -f practice2/services/gateway/Dockerfile \
  practice2/services/gateway

docker build -t finance-worker:latest \
  -f practice2/services/worker/Dockerfile \
  practice2/services/worker

docker build -t finance-db-migrate:latest \
  -f practice2/services/gateway/Dockerfile.migrate \
  practice2/services/gateway
```

После `eval $(minikube docker-env)` команды `docker build` выполняйте в **том же терминале**, где настроен контекст Minikube.

## Ingress

```bash
minikube addons enable ingress
```

Контроллер обычно получает класс `nginx`. В манифесте указано `ingressClassName: nginx` и хосты **`finance.localtest.me`**, **`finance.local`**.

На **macOS с Minikube driver=docker** запросы с хоста к **`http://$(minikube ip):80`** или даже к **`http://$(minikube ip):NodePort`** нередко дают **«Empty reply»** — это ограничение маршрутизации Docker Desktop, а не ошибка ваших YAML. Ingress при этом в кластере может быть исправен.

**Рекомендуемая проверка Ingress с Mac:** проброс **Service** контроллера на localhost:

```bash
# терминал 1
kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller 8080:80
```

```bash
# терминал 2 (предпочтительно на macOS — без ручного /etc/hosts)
curl -sS http://finance.localtest.me:8080/api/health
# или с явным Host:
curl -sS -H "Host: finance.localtest.me" http://127.0.0.1:8080/api/health
```

Для отчёта достаточно скрина команды из терминала 2 (с пояснением про **port-forward** к Ingress).

**Альтернатива:** `minikube service ingress-nginx-controller -n ingress-nginx --url` — подставьте выданный `http://127.0.0.1:…` вместо `http://127.0.0.1:8080` в `curl` с заголовком **`Host: finance.localtest.me`** (или **`Host: finance.local`**).

**Если у вас NodePort с хоста отвечает** (часто на Linux), можно так:

```bash
INGRESS_HTTP_PORT=$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.spec.ports[?(@.name=="http")].nodePort}')
curl -sS -H "Host: finance.local" "http://$(minikube ip):${INGRESS_HTTP_PORT}/api/health"
```

Открыть сайт в браузере по **`http://finance.local`** без порта удобнее после **`minikube tunnel`** (отдельный терминал) — по опыту на части конфигураций тогда отвечает порт 80; если нет — используйте URL с **NodePort**: `http://finance.local:30616` и при необходимости поправьте **`ORIGIN`** в ConfigMap под этот URL (для входа в better-auth).

Проверка «в лоб» без Ingress (убедиться, что gateway жив):

```bash
kubectl port-forward -n finances svc/gateway 3000:3000
# другой терминал:
curl -sS http://127.0.0.1:3000/api/health
```

## Секреты

В репозитории есть только **[`k8s/secret.example.yaml`](./k8s/secret.example.yaml)**. Перед деплоем скопируйте и при необходимости отредактируйте:

```bash
cp practice3/k8s/secret.example.yaml practice3/k8s-secret.local.yaml
kubectl apply -f practice3/k8s-secret.local.yaml
```

Файл с реальными токенами **не коммитьте** (в корневом `.gitignore` игнорируется `practice3/k8s/secret.yaml`, если вы назовёте его так локально).

Ключи в Secret (см. пример):

- `postgres-password`, `database-url` — должны быть согласованы (пользователь `finances`, БД `finances`, хост **`postgres`** — имя Service).
- `better-auth-secret`, `internal-api-token` — как в Docker Compose.
- `telegram-bot-token` — можно пустым.
- `google-client-id` / `google-client-secret` — опционально; redirect URI в консоли Google должен совпадать с **ORIGIN** (например **http://finance.localtest.me:8080** при **`--serve`**).

**ConfigMap** [`k8s/configmap.yaml`](./k8s/configmap.yaml): по умолчанию **`ORIGIN=http://finance.local`**; при **`deploy-minikube.sh --serve`** **ORIGIN** патчится на **http://finance.localtest.me:8080**. **`WORKER_INTERNAL_URL=http://worker:3001`** — внутренний DNS Kubernetes.

## Порядок применения манифестов

**Кратко, как в методичке** ([`pw9-12.md`](../pw9-12.md), шаг 3): после `minikube addons enable ingress` и сборки образов можно выполнить:

```bash
kubectl apply -f practice3/k8s/namespace.yaml
kubectl apply -f practice3/k8s/
```

В каталоге есть **`secret.example.yaml`** с демо-значениями (как в Docker Compose): он создаёт тот же Secret `finances-secrets`, что ожидают манифесты. Для своих секретов замените файл на копию с другим имени или примените `kubectl create secret …` и **не применяйте** example повторно.

Из-за асинхронности Job и Postgres первый `apply` иногда догоняют поды сами (initContainers ждут схему). При сбоях используйте пошаговый сценарий ниже и `kubectl wait` на Job.

**Пошагово (надёжнее для отчёта и отладки):**

```bash
kubectl apply -f practice3/k8s/namespace.yaml
kubectl apply -f practice3/k8s/configmap.yaml
kubectl apply -f practice3/k8s-secret.local.yaml   # или secret.yaml — ваш локальный файл
kubectl apply -f practice3/k8s/pvc-postgres.yaml \
  -f practice3/k8s/deployment-postgres.yaml \
  -f practice3/k8s/service-postgres.yaml

kubectl wait --for=condition=available deployment/postgres -n finances --timeout=120s

kubectl apply -f practice3/k8s/job-db-migrate.yaml
kubectl wait --for=condition=complete job/db-migrate -n finances --timeout=300s

kubectl apply -f practice3/k8s/deployment-worker.yaml \
  -f practice3/k8s/service-worker.yaml \
  -f practice3/k8s/deployment-gateway.yaml \
  -f practice3/k8s/service-gateway.yaml \
  -f practice3/k8s/ingress.yaml
```

Проверка подов:

```bash
kubectl get pods,svc,ingress -n finances
```

**Диагностика** (как в `pw9-12.md`, шаг 5): `kubectl get pods,deploy,svc,ingress -n finances`, `kubectl logs -n finances deployment/gateway`, `kubectl describe pod -n finances <pod>`.

## Повторный прогон миграций

Job с именем `db-migrate` **одноразовый**. При смене схемы:

```bash
kubectl delete job db-migrate -n finances --ignore-not-found=true
kubectl apply -f practice3/k8s/job-db-migrate.yaml
kubectl wait --for=condition=complete job/db-migrate -n finances --timeout=300s
```

## Troubleshooting

- **ImagePullBackOff** — образы не собраны в Docker **Minikube**; выполните `eval $(minikube docker-env)` и пересоберите теги `finance-*:latest`.
- **Ingress 404 / нет ответа** — проверьте `minikube addons list`, запись в `/etc/hosts`, `kubectl describe ingress -n finances`.
- **Петля в initContainer `wait-schema`** — Job миграций не завершился или упал; `kubectl logs job/db-migrate -n finances`.
- **Логин в приложении** — `ORIGIN` в ConfigMap должен совпадать с URL в браузере (при `--serve`: **http://finance.localtest.me:8080**). В коде gateway для production включены **Secure-cookies только при `https://`**, поэтому HTTP на Minikube допустим (см. [`auth.ts`](../practice2/services/gateway/src/lib/server/auth.ts)).

## Связь с практикой 2

Локальный сценарий без Kubernetes: [`practice2/README.md`](../practice2/README.md).
