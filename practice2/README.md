# Сервисы практики 2 (gateway + worker + PostgreSQL)

## Предварительные условия

- Docker и Docker Compose  
- Node.js 22+ (для `npm run db:push` и автотестов с хоста)

## Переменные окружения

Скопируйте пример и при необходимости отредактируйте:

```bash
cp .env.example .env
```

## Локальная отладка gateway (`npm run dev`)

Чтобы отлаживать **better-auth** без образа Docker, переменные должны быть в **`services/gateway/.env`** (не только в `practice2/.env`):

```bash
cd practice2/services/gateway
cp .env.example .env
# Заполните GOOGLE_*, BETTER_AUTH_SECRET, при необходимости скопируйте значения из practice2/.env
```

Обязательно:

- **`ORIGIN=http://localhost:5173`** — тот же хост/порт, что показывает Vite в терминале (если порт другой — поправьте).
- **`DATABASE_URL`** с **`127.0.0.1`** (Postgres на хосте, порт 5432), пока поднят `docker compose up -d postgres` в `practice2/`.
- В **Google Cloud Console** в **Authorized redirect URIs** добавьте:  
  **`http://localhost:5173/api/auth/callback/google`** (отдельно от URI для порта 3000).

Запуск:

```bash
npm ci
npm run db:push   # если менялась схема
npm run dev
```

При ошибке входа: текст на странице логина в dev показывает сообщение исключения; полный stack — в терминале (`[login signInSocial]`). Включён режим **`debug`** у better-auth при `NODE_ENV !== 'production'`.

## Схема БД (первый запуск)

**Полный стек в Docker.** Схема применяется **сама**: сервис **`db-migrate`** (одноразовый контейнер) после готовности Postgres запускает `drizzle-kit push --force`. **`worker`** и **`gateway`** стартуют только после **`service_completed_successfully`** у `db-migrate`. Нужен [Docker Compose V2](https://docs.docker.com/compose/releases/release-notes/) с поддержкой условия `service_completed_successfully` (типовой установке Docker Desktop это уже есть).

Первый `docker compose up` может занять ~30–60 с из‑за `npm ci` внутри `db-migrate`. Том монтируется `./services/gateway`; если после этого на macOS/Windows локальный `npm run dev` ломается из‑за нативных модулей в `node_modules`, удалите `services/gateway/node_modules` и снова выполните **`npm ci`** на хосте.

```bash
cd practice2   # каталог с docker-compose.yml
docker compose up --build
```

**Только Postgres + SvelteKit с хоста.** Если gateway запускаете через `npm run dev`, а БД — в контейнере:

```bash
docker compose up -d postgres
cd services/gateway
npm ci
export DATABASE_URL=postgresql://finances:finances@127.0.0.1:5432/finances
npm run db:push
```

`DATABASE_URL` с **`127.0.0.1`** нужен только **в терминале** для Drizzle и dev-сервера с вашей машины. Не кладите такую строку в **`practice2/.env`**: Compose раньше подставлял её в контейнер `gateway`, и приложение обращалось к `127.0.0.1:5432` изнутри контейнера (`ECONNREFUSED`). В `docker-compose.yml` URL для gateway смотрит на хост **`postgres`**.

### Чистая пересборка в Docker (всё с нуля)

Данные PostgreSQL при `-v` удалятся — пропустите удаление томов, если нужна та же БД.

```bash
cd practice2   # каталог с docker-compose.yml

# Остановить и убрать контейнеры + сети (тома БД и pgAdmin остаются, если без -v)
docker compose down

# Полностью с нуля: удалить тома с данными Postgres и настройками pgAdmin
docker compose down -v

# Собрать образы без кэша слоёв (обязательно после правок в коде, если видите только CACHED)
docker compose build --no-cache

# Запуск
docker compose up -d
```

После `down -v` при обычном `docker compose up` миграция снова пройдёт через **`db-migrate`**. Если поднимаете только Postgres и dev на хосте — выполните **`db:push`** вручную (см. раздел «Схема БД»). Затем заново зарегистрируйтесь и при необходимости строки в `user_notification_settings`.

Отдельно только gateway без кэша:

```bash
docker compose build --no-cache gateway && docker compose up -d gateway
```

- Веб-приложение: http://localhost:3000  
- **pgAdmin**: http://localhost:5050  
- Health gateway: http://localhost:3000/api/health  

Логин в pgAdmin по умолчанию (можно переопределить в `.env`):  
`PGADMIN_DEFAULT_EMAIL` / `PGADMIN_DEFAULT_PASSWORD` из `.env.example` (email вида **`admin@example.com`** — pgAdmin отклоняет некоторые псевдо-домены вроде `*.test`).

Если в вашем **`practice2/.env`** ещё указан старый адрес `admin@local.test`, замените на `admin@example.com` и перезапустите контейнер: `docker compose up -d pgadmin`.

### Подключение pgAdmin к базе

1. Войдите в pgAdmin → **Register** → **Server**.  
2. **General** → Name: произвольно (например `finances-local`).  
3. **Connection**:
   - **Host**: `postgres` — имя сервиса в Docker-сети (не `127.0.0.1`: браузер на вашем ПК открывает pgAdmin, а запрос к БД идёт из контейнера pgAdmin).
   - **Port**: `5432`
   - **Maintenance database**: `finances`
   - **Username**: `finances`
   - **Password**: `finances`
4. Включите **Save password** при желании → Save.

Дальше: **Servers** → ваш сервер → **Databases** → **finances** → **Schemas** → **public** → **Tables**.

---

## Таблица `user_notification_settings`: зачем и как заполнять

Сейчас в приложении **нет экрана** «привязать Telegram»: воркер читает **`telegram_chat_id`** только из этой таблицы. Поэтому для демонстрации уведомлений запись нужно добавить **вручную** (через pgAdmin, `psql`, Drizzle Studio и т.д.) или позже можно сделать форму в UI.

### Структура

| Колонка            | Смысл |
|--------------------|--------|
| `user_id` (PK)     | Тот же идентификатор, что у пользователя better-auth в таблице **`user`** (поле `id`, текстовый UUID или аналог). |
| `telegram_chat_id` | Числовой id чата в Telegram (строка до 32 символов в схеме; для ЛС с ботом обычно ваш user id). |
| `updated_at`       | Время обновления; при вставке через SQL можно `NOW()`. |

Одна строка = один пользователь приложения.

### Шаг 1: узнать `user_id`

Сначала зарегистрируйтесь в веб-приложении (email/пароль или Google), затем в pgAdmin выполните:

```sql
SELECT id, email, name FROM "user" ORDER BY created_at DESC;
```

Таблица называется **`user`** — в SQL это ключевое слово, поэтому имя в двойных кавычках: `"user"`. Скопируйте нужный **`id`**.

### Шаг 2: узнать `telegram_chat_id`

1. Создайте бота через @BotFather, задайте `TELEGRAM_BOT_TOKEN` в `.env` и перезапустите compose.  
2. Напишите боту **любое сообщение** в личку.  
3. Откройте в браузере (подставьте токен):

   `https://api.telegram.org/bot<ВАШ_ТОКЕН>/getUpdates`

4. В JSON найдите `"chat":{"id":123456789,...}` — это и есть **`telegram_chat_id`** (для групп id может быть отрицательным — тоже сохраняйте как строку).

### Шаг 3: вставить или обновить строку

В pgAdmin: **Tools** → **Query Tool**, выполните (подставьте свои значения):

```sql
INSERT INTO user_notification_settings (user_id, telegram_chat_id, updated_at)
VALUES (
  'ВАШ_USER_ID_ИЗ_ТАБЛИЦЫ_user',
  '123456789',
  NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
  telegram_chat_id = EXCLUDED.telegram_chat_id,
  updated_at = NOW();
```

Если пользователь удалён из приложения, строка в `user_notification_settings` может удалиться каскадом (FK на `user`). После новой регистрации нужно вставить запись снова.

Отдельная форма в личном кабинете («Введите chat id» или кнопка «Подключить Telegram») уберёт ручной SQL; для учебного MVP pgAdmin достаточно.

---

## Вход через Google (unexpected error, Workbox)

1. **Redirect URI** в Google Cloud Console должен быть **точно**:  
   `http://localhost:3000/api/auth/callback/google`  
   (тот же хост и порт, что у **`ORIGIN`** у gateway; в `docker-compose` для gateway задано `ORIGIN: http://localhost:3000`).
2. **Cookies:** в контейнере обычно `NODE_ENV=production`. Для **HTTP localhost** сессионные cookies должны быть **без** флага Secure — в `auth.ts` для `http://localhost` / `http://127.0.0.1` `useSecureCookies` отключается. После правок **пересоберите** образ gateway (`docker compose build gateway --no-cache` или `up --build`).
3. **Service Worker:** ошибка `non-precached-url` для `/` — конфликт PWA с SvelteKit. В проекте задан `navigateFallback: '/offline.html'`. После обновления в браузере: DevTools → **Application** → **Service Workers** → **Unregister**, затем жёсткое обновление (Cmd+Shift+R).

**Переменные `.env`:** для better-auth нужны **`BETTER_AUTH_SECRET`**, **`GOOGLE_CLIENT_ID`**, **`GOOGLE_CLIENT_SECRET`** (compose пробрасывает их в gateway). Строка **`BETTER_AUTH_API_KEY`** в нашем коде **не используется**, её можно убрать. **`DATABASE_URL`** с хостом `postgres` подходит для контейнера gateway; для `npm run dev` на машине нужен `127.0.0.1`, а не `postgres`.

⚠️ Секреты из `.env` не публикуйте. При утечке смените: новый **Client secret** в Google, `/revoke` токена бота в BotFather, новый **`BETTER_AUTH_SECRET`** (пользователи могут разлогиниться).

---

## Telegram (бот)

Переменная **`TELEGRAM_BOT_TOKEN`** задаётся в **`practice2/.env`** и уходит в сервис **worker** (см. `docker-compose.yml`). Без строки в `user_notification_settings` воркер не знает, куда слать сообщение, даже при валидном токене.

---

## Автотесты

```bash
npm test --prefix services/gateway
npm test --prefix services/worker
```

## Структура

- `services/gateway` — SvelteKit (**микросервис 1**), Dockerfile в корне сервиса.  
- `services/worker` — Analytics Worker (**микросервис 2**).  
- `PRACTICE2.md` — шаблон отчёта по методичке.

Исходный шаблон приложения: каталог `whynot-finances-svelte` в корне репозитория курса (копия для зачёта — `services/gateway`).
