#!/usr/bin/env bash
# Поднимает стек практики 3 в Minikube: образы, манифесты, миграция, проверка.
# Запуск из любой директории:  ./practice3/deploy-minikube.sh
# Или из practice3:             ./deploy-minikube.sh
#
# Опции:
#   --serve               macOS/docker: патч ORIGIN=http://finance.localtest.me:8080, port-forward Ingress→:8080, open в браузере
#   --no-minikube-start   не вызывать minikube start (кластер уже есть)
#   --no-build            не пересобирать Docker-образы
#   --secret PATH         явный файл Secret (по умолчанию: k8s/k8s-secret.local.yaml, иначе secret.example.yaml)
#   -h, --help            справка

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
K8S="$ROOT/practice3/k8s"
NS="finances"

MINIKUBE_START=1
DOCKER_BUILD=1
SECRET_FILE=""
SERVE_LOCAL=0
INGRESS_PF_PORT=8080

usage() {
  cat <<'EOF'
Использование: deploy-minikube.sh [опции]

  --serve               браузер через Ingress (finance.localtest.me → 127.0.0.1 по DNS, /etc/hosts не нужен)
  --no-minikube-start   не вызывать minikube start
  --no-build            не пересобирать образы finance-*
  --secret PATH         файл Secret (иначе k8s/k8s-secret.local.yaml или secret.example.yaml)
  -h, --help            эта справка
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --serve) SERVE_LOCAL=1; shift ;;
    --no-minikube-start) MINIKUBE_START=0; shift ;;
    --no-build) DOCKER_BUILD=0; shift ;;
    --secret)
      SECRET_FILE="${2:-}"
      [[ -n "$SECRET_FILE" ]] || { echo "Ожидается путь после --secret"; exit 1; }
      shift 2
      ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Неизвестный аргумент: $1 (см. --help)"; exit 1 ;;
  esac
done

if [[ -z "$SECRET_FILE" ]]; then
  if [[ -f "$K8S/k8s-secret.local.yaml" ]]; then
    SECRET_FILE="$K8S/k8s-secret.local.yaml"
  else
    SECRET_FILE="$K8S/secret.example.yaml"
  fi
fi

[[ -f "$SECRET_FILE" ]] || { echo "Файл Secret не найден: $SECRET_FILE"; exit 1; }

cd "$ROOT"

echo "==> Secret: $SECRET_FILE"

if [[ "$MINIKUBE_START" -eq 1 ]]; then
  echo "==> minikube start"
  minikube start --driver=docker
fi

echo "==> ingress addon"
minikube addons enable ingress

if [[ "$DOCKER_BUILD" -eq 1 ]]; then
  echo "==> docker build (контекст Minikube)"
  eval "$(minikube docker-env)"
  docker build -t finance-gateway:latest -f practice2/services/gateway/Dockerfile practice2/services/gateway
  docker build -t finance-worker:latest -f practice2/services/worker/Dockerfile practice2/services/worker
  docker build -t finance-db-migrate:latest -f practice2/services/gateway/Dockerfile.migrate practice2/services/gateway
fi

echo "==> kubectl apply (namespace, config, secret, postgres)"
kubectl apply -f "$K8S/namespace.yaml"
kubectl apply -f "$K8S/configmap.yaml"
kubectl apply -f "$SECRET_FILE"
kubectl apply -f "$K8S/pvc-postgres.yaml"
kubectl apply -f "$K8S/deployment-postgres.yaml"
kubectl apply -f "$K8S/service-postgres.yaml"

echo "==> ожидание Postgres"
kubectl wait --for=condition=available deployment/postgres -n "$NS" --timeout=120s

echo "==> миграция БД (Job)"
kubectl delete job db-migrate -n "$NS" --ignore-not-found=true
kubectl apply -f "$K8S/job-db-migrate.yaml"
if ! kubectl wait --for=condition=complete job/db-migrate -n "$NS" --timeout=300s; then
  echo "Job db-migrate не завершился. Логи:"
  kubectl logs -n "$NS" job/db-migrate --tail=80 || true
  exit 1
fi

echo "==> worker, gateway, ingress"
kubectl apply -f "$K8S/deployment-worker.yaml"
kubectl apply -f "$K8S/service-worker.yaml"
kubectl apply -f "$K8S/deployment-gateway.yaml"
kubectl apply -f "$K8S/service-gateway.yaml"
kubectl apply -f "$K8S/ingress.yaml"

echo ""
echo "==> состояние кластера"
kubectl get pods,svc,ingress -n "$NS"

IP="$(minikube ip)"
ORIGIN_BROWSER="http://finance.localtest.me:${INGRESS_PF_PORT}"

if [[ "$SERVE_LOCAL" -eq 1 ]]; then
  echo ""
  echo "==> --serve: открыть в браузере — ${ORIGIN_BROWSER}/"
  echo "    Патч ConfigMap ORIGIN (better-auth и OAuth должны совпадать с этим URL)."
  kubectl patch configmap finances-config -n "$NS" --type merge -p "{\"data\":{\"ORIGIN\":\"${ORIGIN_BROWSER}\"}}"
  kubectl rollout restart deployment/gateway -n "$NS"
  kubectl rollout status deployment/gateway -n "$NS" --timeout=180s

  echo ""
  echo "==> Браузер: finance.localtest.me резолвится в 127.0.0.1 (DNS localtest.me), файл /etc/hosts не обязателен."
  echo "    Хост finance.local в Ingress сохранён для сценария с IP Minikube; для --serve открывайте ${ORIGIN_BROWSER}/"

  PF_LOG="${TMPDIR:-/tmp}/finances-ingress-pf.log"
  PF_PID_FILE="${TMPDIR:-/tmp}/finances-ingress-pf.pid"
  if [[ -f "$PF_PID_FILE" ]]; then
    oldpid="$(cat "$PF_PID_FILE" 2>/dev/null || true)"
    if [[ -n "$oldpid" ]] && kill -0 "$oldpid" 2>/dev/null; then
      echo "==> останавливаю старый port-forward (PID $oldpid)"
      kill "$oldpid" 2>/dev/null || true
      sleep 1
    fi
  fi
  nohup kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller "${INGRESS_PF_PORT}:80" >"$PF_LOG" 2>&1 &
  echo $! >"$PF_PID_FILE"
  sleep 2

  code="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 10 "${ORIGIN_BROWSER}/api/health" || echo "000")"
  echo "==> GET ${ORIGIN_BROWSER}/api/health -> HTTP $code (ожидается 200)"
  if [[ "$code" != "200" ]]; then
    echo "    Проверьте, что port-forward слушает (лог: $PF_LOG) и Ingress применён с хостом finance.localtest.me."
  fi

  if [[ "$(uname -s)" == "Darwin" ]] && command -v open >/dev/null; then
    echo "==> открываю браузер"
    open "${ORIGIN_BROWSER}/"
  fi

  echo ""
  echo "Port-forward: PID $(cat "$PF_PID_FILE"), лог $PF_LOG. Остановка: kill \$(cat $PF_PID_FILE)"
  echo "OAuth Google:    ${ORIGIN_BROWSER}/api/auth/callback/google"
  echo "OAuth GitHub:    ${ORIGIN_BROWSER}/api/auth/callback/github"
else
  echo ""
  echo "==> /etc/hosts (без --serve), если нужен curl через IP Minikube:"
  echo "    echo \"$IP finance.local\" | sudo tee -a /etc/hosts"
  echo "    На macOS + docker driver часто «Empty reply»; удобный браузерный вариант: ./practice3/deploy-minikube.sh --serve"
  echo ""

  if grep -q '[[:space:]]finance\.local' /etc/hosts 2>/dev/null; then
    INGRESS_HTTP_PORT="$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.spec.ports[?(@.name=="http")].nodePort}' 2>/dev/null || true)"
    echo "==> проверка HTTP через Ingress (NodePort)"
    if [[ -n "$INGRESS_HTTP_PORT" ]]; then
      url="http://${IP}:${INGRESS_HTTP_PORT}/api/health"
      code="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 5 -H "Host: finance.local" "$url" || echo "000")"
      echo "    GET $url (Host: finance.local) -> HTTP $code"
    fi
    code80="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 3 "http://finance.local/api/health" 2>/dev/null || echo "000")"
    if [[ "$code80" == "200" ]]; then
      echo "    http://finance.local/api/health -> HTTP 200"
    fi
  else
    echo "==> в /etc/hosts нет finance.local — команды выше"
  fi
fi

echo ""
echo "Готово."
