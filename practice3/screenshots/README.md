Скриншоты встроены в [`PRACTICE3.md`](../PRACTICE3.md) (§ 3). Исходные файлы:

| Файл | Назначение |
|------|------------|
| **`kubectl_logs.png`** | Вывод **`kubectl get pods,svc,ingress -n finances`** (рис. 1). |
| **`curl_to_ingress.png`** | Запрос к приложению **через Ingress**, ответ **200** (рис. 2). |
| **`gateway_pod_logs.png`** | Журнал пода **gateway** (рис. 3). |

Опционально для отладки: логи worker, `kubectl describe pod`.
