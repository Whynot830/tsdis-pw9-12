#!/usr/bin/env bash
# Нагрузочный прогон по методичке (практика №4): ~100–200 запросов к публичному URL.
# Пример после practice3/deploy-minikube.sh --serve:
#   BASE_URL=http://finance.localtest.me:8080 ./practice4/monitoring/load-test-public-health.sh
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:8080}"
PATH_HEALTH="${PATH_HEALTH:-/api/health}"
N="${N:-150}"

url="${BASE_URL%/}${PATH_HEALTH}"
echo "GET x${N} → ${url}"

for i in $(seq 1 "$N"); do
  code="$(curl -sS -o /dev/null -w '%{http_code}' "$url" || true)"
  if [[ "$code" != "200" ]]; then
    echo "[$i] HTTP $code" >&2
  fi
done

echo "Готово. Сравните панели в Grafana до и после прогона (скриншоты в practice4/screenshots/)."
