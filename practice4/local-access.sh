#!/usr/bin/env bash
# Единая точка входа: port-forward приложения (Ingress), Grafana и Prometheus + опционально браузер.
# Совместим с PID-файлом Ingress из practice3/deploy-minikube.sh (--serve).
#
#   ./practice4/local-access.sh start       # пробросы в фоне + open (macOS)
#   ./practice4/local-access.sh stop        # остановить пробросы
#   ./practice4/local-access.sh status      # показать PID и логи
#   ./practice4/local-access.sh bootstrap   # minikube, деплой app, helm monitoring, SM, start
#
# Переменные окружения:
#   NO_OPEN=1              — не открывать браузер
#   NO_BUILD=1             — в bootstrap не собирать образы и вызывать deploy с --no-build
#   NO_MINIKUBE_START=1    — в bootstrap не вызывать minikube start
#   INGRESS_PF_PORT=8080   — локальный порт для приложения
#   GRAFANA_PF_PORT=3000
#   PROMETHEUS_PF_PORT=9090
#   PROMETHEUS_SVC         — имя Service Prometheus (по умолчанию см. resolve_prometheus_svc)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

INGRESS_PF_PORT="${INGRESS_PF_PORT:-8080}"
GRAFANA_PF_PORT="${GRAFANA_PF_PORT:-3000}"
PROMETHEUS_PF_PORT="${PROMETHEUS_PF_PORT:-9090}"
ORIGIN_BROWSER="http://finance.localtest.me:${INGRESS_PF_PORT}"

TMP="${TMPDIR:-/tmp}"
PF_INGRESS_PID="$TMP/finances-ingress-pf.pid"
PF_INGRESS_LOG="$TMP/finances-ingress-pf.log"
PF_GRAFANA_PID="$TMP/finances-grafana-pf.pid"
PF_GRAFANA_LOG="$TMP/finances-grafana-pf.log"
PF_PROM_PID="$TMP/finances-prometheus-pf.pid"
PF_PROM_LOG="$TMP/finances-prometheus-pf.log"

usage() {
  cat <<EOF
Использование: $(basename "$0") <команда>

  start       Проброс: Ingress:$INGRESS_PF_PORT, Grafana:$GRAFANA_PF_PORT, Prometheus:$PROMETHEUS_PF_PORT
  stop        Остановить процессы из PID-файлов
  status      Вывести PID и хвост логов
  bootstrap   minikube + deploy приложения + helm kube-prometheus-stack + ServiceMonitor + start

Переменные: NO_OPEN=1 NO_BUILD=1 NO_MINIKUBE_START=1
EOF
}

kill_if_pid_file() {
  local f="$1"
  if [[ -f "$f" ]]; then
    local oldpid
    oldpid="$(cat "$f" 2>/dev/null || true)"
    if [[ -n "$oldpid" ]] && kill -0 "$oldpid" 2>/dev/null; then
      echo "==> останавливаю PID $oldpid ($f)"
      kill "$oldpid" 2>/dev/null || true
      sleep 1
    fi
    rm -f "$f"
  fi
}

stop_forwards() {
  kill_if_pid_file "$PF_INGRESS_PID"
  kill_if_pid_file "$PF_GRAFANA_PID"
  kill_if_pid_file "$PF_PROM_PID"
  echo "==> port-forward остановлены"
}

resolve_prometheus_svc() {
  if [[ -n "${PROMETHEUS_SVC:-}" ]]; then
    echo "$PROMETHEUS_SVC"
    return
  fi
  # Типичное имя при helm release "monitoring"
  local default="monitoring-kube-prometheus-prometheus"
  if kubectl get svc "$default" -n monitoring &>/dev/null; then
    echo "$default"
    return
  fi
  # Fallback: первый svc в monitoring с портом 9090
  kubectl get svc -n monitoring -o json 2>/dev/null | python3 -c "
import sys, json
d = json.load(sys.stdin)
for it in d.get('items', []):
  for p in it.get('spec', {}).get('ports', []) or []:
    if p.get('port') == 9090:
      print(it['metadata']['name'])
      sys.exit(0)
sys.exit(1)
" 2>/dev/null || true
}

start_forwards() {
  local prom_svc
  prom_svc="$(resolve_prometheus_svc)"
  if [[ -z "$prom_svc" ]]; then
    echo "ERROR: не найден Service Prometheus в namespace monitoring. Установите kube-prometheus-stack (см. practice4/LOCAL-INFRA.md)" >&2
    echo "    Подсказка: kubectl get svc -n monitoring" >&2
    exit 1
  fi

  stop_forwards

  echo "==> kubectl port-forward ingress-nginx-controller *:$INGRESS_PF_PORT -> 80"
  nohup kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller "${INGRESS_PF_PORT}:80" \
    >"$PF_INGRESS_LOG" 2>&1 &
  echo $! >"$PF_INGRESS_PID"

  echo "==> kubectl port-forward monitoring-grafana *:$GRAFANA_PF_PORT -> 80"
  nohup kubectl port-forward -n monitoring svc/monitoring-grafana "${GRAFANA_PF_PORT}:80" \
    >"$PF_GRAFANA_LOG" 2>&1 &
  echo $! >"$PF_GRAFANA_PID"

  echo "==> kubectl port-forward $prom_svc *:$PROMETHEUS_PF_PORT -> 9090"
  nohup kubectl port-forward -n monitoring "svc/${prom_svc}" "${PROMETHEUS_PF_PORT}:9090" \
    >"$PF_PROM_LOG" 2>&1 &
  echo $! >"$PF_PROM_PID"

  sleep 2
  echo ""
  echo "PID Ingress:    $(cat "$PF_INGRESS_PID")  лог $PF_INGRESS_LOG"
  echo "PID Grafana:    $(cat "$PF_GRAFANA_PID")  лог $PF_GRAFANA_LOG"
  echo "PID Prometheus: $(cat "$PF_PROM_PID")  лог $PF_PROM_LOG"
  echo ""
  echo "Приложение:  ${ORIGIN_BROWSER}/"
  echo "Grafana:     http://127.0.0.1:${GRAFANA_PF_PORT}/"
  echo "Prometheus:  http://127.0.0.1:${PROMETHEUS_PF_PORT}/"
}

open_browser() {
  if [[ "${NO_OPEN:-}" == "1" ]]; then
    return
  fi
  if [[ "$(uname -s)" != "Darwin" ]] || ! command -v open >/dev/null; then
    echo "(open только на macOS; откройте URL вручную)"
    return
  fi
  echo "==> открываю вкладки в браузере"
  open "${ORIGIN_BROWSER}/"
  open "http://127.0.0.1:${GRAFANA_PF_PORT}/"
  open "http://127.0.0.1:${PROMETHEUS_PF_PORT}/"
}

cmd_status() {
  for label in "Ingress:$PF_INGRESS_PID" "Grafana:$PF_GRAFANA_PID" "Prometheus:$PF_PROM_PID"; do
    name="${label%%:*}"
    f="${label#*:}"
    echo "--- $name ---"
    if [[ -f "$f" ]]; then
      pid="$(cat "$f")"
      if kill -0 "$pid" 2>/dev/null; then
        echo "PID $pid running"
      else
        echo "PID file exists but process dead: $pid"
      fi
    else
      echo "no pid file"
    fi
  done
}

cmd_bootstrap() {
  cd "$ROOT"

  if [[ "${NO_MINIKUBE_START:-}" != "1" ]]; then
    echo "==> minikube start"
    minikube start --driver=docker
  fi

  echo "==> ingress addon"
  minikube addons enable ingress

  local deploy_flags=(--no-minikube-start)
  if [[ "${NO_BUILD:-}" == "1" ]]; then
    deploy_flags+=(--no-build)
  fi

  echo "==> deploy приложения (practice3/deploy-minikube.sh ${deploy_flags[*]})"
  "$ROOT/practice3/deploy-minikube.sh" "${deploy_flags[@]}"

  echo "==> ORIGIN для браузера: $ORIGIN_BROWSER"
  kubectl patch configmap finances-config -n finances --type merge \
    -p "{\"data\":{\"ORIGIN\":\"${ORIGIN_BROWSER}\"}}"
  kubectl rollout restart deployment/gateway -n finances
  kubectl rollout status deployment/gateway -n finances --timeout=180s

  if ! helm version &>/dev/null; then
    echo "ERROR: helm не установлен (brew install helm)" >&2
    exit 1
  fi
  helm repo add prometheus-community https://prometheus-community.github.io/helm-charts 2>/dev/null || true
  helm repo update
  echo "==> kube-prometheus-stack"
  helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \
    -n monitoring --create-namespace \
    -f "$ROOT/practice4/monitoring/kube-prometheus-stack-values-minikube.yaml"

  kubectl apply -f "$ROOT/practice4/monitoring/servicemonitor-gateway.yaml"
  kubectl apply -f "$ROOT/practice4/monitoring/servicemonitor-worker.yaml"

  echo ""
  echo "==> дождитесь Ready у подов в monitoring, затем уже с пробросами:"
  kubectl get pods -n monitoring
  echo ""
  start_forwards
  open_browser
  echo ""
  echo "Готово. Если Prometheus ещё не поднялся — подождите и откройте http://127.0.0.1:${PROMETHEUS_PF_PORT}/ вручную."
}

main() {
  local cmd="${1:-}"
  case "$cmd" in
    start)
      start_forwards
      open_browser
      ;;
    stop)
      stop_forwards
      ;;
    status)
      cmd_status
      ;;
    bootstrap)
      cmd_bootstrap
      ;;
    -h|--help|help|"")
      usage
      [[ -z "$cmd" ]] && exit 1
      exit 0
      ;;
    *)
      echo "Неизвестная команда: $cmd" >&2
      usage
      exit 1
      ;;
  esac
}

main "$@"
