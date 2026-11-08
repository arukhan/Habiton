# Habiton — инструкция для команды (Windows)

Habiton — мобильный веб-трекер привычек с основной механикой **Recovery Flow**: после пропущенного дня пользователь может вернуться к привычке через небольшой квест, затем постепенно вернуться к первоначальной цели. Интерфейс адаптирован для телефона.

## 1. Что используется

- **Frontend:** Next.js (React, TypeScript), порт `3000`.
- **Backend:** Go + Gin (REST API), порт `8080`.
- **База данных:** PostgreSQL 16, запускается в Docker; внутри сети Docker доступна как `db:5432`.
- **Docker Compose:** запускает все три компонента одной командой.

Структура проекта:

```text
Habiton/
├── backend/                 # Go API, миграции БД
├── frontend/                # Next.js, страницы, компоненты, изображения
├── docs/                    # архитектура и дополнительные инструкции
├── docker-compose.yml
├── .env.example
└── README.md
```

## 2. Что установить

1. **Git** — для получения кода.
2. **Docker Desktop** — с включенным WSL 2 backend (Windows).
3. **VS Code** — для редактирования проекта.
4. Для разработки без пересборки Frontend: **Node.js и npm**. Для локального запуска Go без Docker дополнительно понадобится Go версии, указанной в `backend/go.mod`.

Проверьте в терминале VS Code (PowerShell):

```powershell
git --version
docker --version
docker compose version
```

Откройте Docker Desktop и дождитесь запуска Docker Engine.

## 3. Скачать репозиторий

Для приватного репозитория владелец должен сначала добавить вас в GitHub: **Settings → Collaborators → Add people**; приглашение нужно принять.

В PowerShell выполните:

```powershell
cd D:\Habiton
git clone https://github.com/arukhan/Habiton.git
cd Habiton
```

Если проект находится в другой папке, используйте свой путь. Откройте папку `Habiton` через **File → Open Folder** в VS Code.

## 4. Настроить `.env`

В **корне проекта** создайте рабочий файл `.env` из шаблона:

```powershell
Copy-Item .env.example .env
```

Откройте `.env` и задайте собственный пароль PostgreSQL для вашей локальной БД. Для проверки демонстрационных пользователей установите `DEMO_MODE=true` (только локально). Пример:

```dotenv
POSTGRES_PASSWORD=replace_with_your_own_local_password
DEMO_MODE=true
ADMIN_EMAIL=
AMPLITUDE_API_KEY=
APP_ORIGIN=http://localhost:3000
```

**Не отправляйте `.env` в GitHub или в общий чат.** В репозиторий загружается только `.env.example` без секретов. `APP_ORIGIN` должен совпадать с адресом, по которому браузер открывает приложение.

## 5. Первый запуск всего проекта и базы данных

Находясь в корне проекта, выполните:

```powershell
docker compose up -d --build
docker compose ps
```

Ожидаемые сервисы: `db` — **healthy**, `backend` — **up**, `frontend` — **up**.

Откройте:

- Сайт: http://localhost:3000/login
- Проверка API: http://localhost:8080/api/health

При первом старте Go Backend выполняет SQL-инициализацию из `backend/migrations/001_init.sql`. База создается Docker Compose автоматически. **Не нужно отдельно устанавливать PostgreSQL на Windows.** Порт `5432` наружу обычно не опубликован, чтобы избежать конфликтов.

При включенном `DEMO_MODE=true` можно проверить локальные демо-аккаунты:

- `demo@habiton.local`
- `maya@habiton.local`
- `alex@habiton.local`

Пароль локального демо-режима: `HabitonDemo2026!`. Это тестовые данные, не использовать для публичного релиза.

## 6. Где хранится база и как проверить подключение

PostgreSQL хранит данные в Docker named volume `habiton_data` (полное имя обычно зависит от имени Compose-проекта, например `habiton_habiton_data`). Каждый участник при локальном запуске получает **собственную БД**. GitHub **не синхронизирует** базы участников.

Проверка PostgreSQL:

```powershell
docker compose exec db pg_isready -U habiton -d habiton
docker compose exec db psql -U habiton -d habiton -c "SELECT COUNT(*) FROM users;"
```

Если таблицы существуют и запрос выполняется, соединение с БД работает. Проверяйте сохранение изменений: создайте привычку, обновите страницу, выйдите и войдите заново.

**Никогда не используйте для обычной остановки** `docker compose down -v`, `docker volume prune`, `docker system prune --volumes` или сброс Docker Desktop: это может удалить локальную историю привычек.

Безопасная остановка:

```powershell
docker compose down
```

Повторный запуск:

```powershell
docker compose up -d
```

### Резервная копия БД (перед важными изменениями)

Запускайте в корне проекта при работающем `db`:

```powershell
docker compose exec -T db pg_dump -U habiton -d habiton -Fc -f /tmp/habiton.dump
$dbId = docker compose ps -q db
docker cp "${dbId}:/tmp/habiton.dump" "D:\Habiton\habiton-backup.dump"
```

Проверьте существование файла резервной копии. Не добавляйте `.dump` в Git.

## 7. Быстрая разработка Frontend (Hot Reload)

Если хотите видеть изменения CSS, страниц и пингвинов без пересборки Docker:

**Терминал 1 — сервисы API и БД:**

```powershell
# Из корня репозитория
docker compose up -d db backend
docker compose stop frontend
```

**Терминал 2 — Next.js на Windows:**

```powershell
cd frontend
npm install
$env:BACKEND_URL="http://localhost:8080"
$env:NEXT_PUBLIC_DEMO_MODE="true"
npm run dev
```

Откройте http://localhost:3000. Сохраняйте `tsx`/`css` через Ctrl+S; Next.js автоматически обновляет интерфейс. Не запускайте одновременно Docker Frontend и локальный Next.js на одном порту `3000`.

Изменения `.go` в Docker Backend требуют пересборки:

```powershell
# Из корня репозитория
docker compose up -d --build --no-deps backend
```

Для возврата к полностью Docker-режиму остановите `npm run dev` сочетанием Ctrl+C и выполните из корня:

```powershell
docker compose up -d --build frontend
```

## 8. Проверить основной Recovery Flow

1. Войти в демо-аккаунт или зарегистрировать свой.
2. Открыть `/today`, проверить привычки.
3. Открыть **Report a missed day** для подходящей привычки.
4. Выбрать причину пропуска и уровень нагрузки, отправить отчет.
5. Принять micro-quest, затем отметить его фактическое выполнение.
6. Проверить экран успешного восстановления и сохранение истории.
7. Продолжить Step-up и возврат к original goal.
8. Открыть `/profile` и `/insights`: проверить XP, уровень и историю.
9. После перезагрузки сайта убедиться, что записи сохранились.

Демонстрационные сценарии не должны учитываться как реальные продуктовые метрики. Дополнительные проверки — в `docs/ACCEPTANCE-CHECKLIST.md`.

## 9. Работа команды через GitHub

Не работайте все напрямую в `main`. Для каждой задачи создавайте ветку:

```powershell
git checkout main
git pull origin main
git checkout -b feature/short-description
```

После изменений:

```powershell
git status
git add .
git diff --cached --stat
git commit -m "feat: describe change"
git push -u origin feature/short-description
```

Создайте Pull Request на GitHub. Перед `git add` и `git commit` проверьте, что среди файлов **нет** `.env`, `node_modules`, `.next`, `.dump`, `*.log`, токенов, паролей и личных данных.

Предлагаемое распределение: Frontend/UI, Go API, Recovery Rules, PostgreSQL/Analytics, QA/Testing. Командные договоренности — в `docs/TEAM-WORKFLOW.md`.

## 10. Частые ошибки

**Docker Desktop не запущен:** откройте Docker Desktop, убедитесь, что работает Engine, повторите `docker compose ps`.

**Порт 3000 уже занят:** остановите лишний экземпляр Next.js или Docker Frontend.

**`Request failed (500)` / `ECONNREFUSED` при Login:** проверьте `docker compose ps`, `docker compose logs backend --tail=100` и правильный `BACKEND_URL`. Локальный Next.js использует `http://localhost:8080`, Docker Frontend внутри Compose — `http://backend:8080`.

**БД не запускается:** проверьте `docker compose logs db --tail=100`; не удаляйте volume. Если меняли `POSTGRES_PASSWORD` после первого запуска, старый volume сохраняет пароль, установленный при инициализации — верните исходное значение или согласованно измените пароль в БД.

**`Untrusted request origin` при входе с телефона:** Backend сверяет `Origin` с `APP_ORIGIN`. Если ваша версия Backend поддерживает несколько origin через запятую, для локальной сети укажите, например, `APP_ORIGIN=http://localhost:3000,http://192.168.1.10:3000` и пересоздайте Backend. IP должен быть IP вашего ноутбука; не выключайте эту защиту и не разрешайте произвольные origin.

**Доступ с телефона:** используйте IP ноутбука и порт 3000, при этом телефон и ноутбук должны быть в одной доступной сети. Для Next.js dev допускается настройка `allowedDevOrigins` в `frontend/next.config.ts`; для Go отдельно требуется разрешенный `APP_ORIGIN`. В публичной сети не открывайте dev-сервер без дополнительной защиты.

## 11. Важно перед production

Локальный Docker-проект не равен опубликованному приложению. Для общего доступа преподавателя потребуются HTTPS, хостинг Frontend/Backend, общая защищенная PostgreSQL, надежные секреты, `DEMO_MODE=false`, `COOKIE_SECURE=true`, корректный production `APP_ORIGIN` и проверка аналитики (Amplitude). Данные разных локальных баз автоматически не объединяются.

---

Если возникают проблемы, отправляйте команде **текст ошибки и вывод команд без паролей/токенов**:

```powershell
docker compose ps
docker compose logs backend --tail=80
docker compose logs frontend --tail=80
docker compose logs db --tail=80
```
