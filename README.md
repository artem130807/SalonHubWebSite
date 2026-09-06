# SalonHub / «Время Красоты»

Единое Next.js 16-приложение (App Router): лендинг, кабинеты клиента/мастера/админа и бэкенд на Route Handlers + Server Actions + Prisma.

Запись идёт по цепочке **салон → мастер → услуга → свободный старт внутри рабочего окна** (не фиксированная сетка слотов). Статус новой записи — `Confirmed`.

## Стек

- Next.js 16 (App Router, `src/app`, `src/proxy.ts`)
- PostgreSQL + Prisma
- httpOnly cookie-сессия (jose)
- Vitest для доменных и прикладных правил

## Структура

```text
src/
  app/                 # страницы, Server Actions, Route Handlers (/api/*)
  components/          # UI
  lib/                 # сессия, HTTP-хелперы
  proxy.ts             # защита /admin, /barber, /account
  server/
    domain/            # правила слотов и записи
    application/       # сервисы и порты (SOLID)
    infrastructure/    # Prisma и in-memory репозитории для тестов
prisma/                # схема, seed
```

## Запуск

Нужен PostgreSQL. Пример URL — в `.env.example`.

```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma db push
npx prisma db seed
npm run test
npm run dev
```

- Приложение: http://localhost:3000
- Клиент: http://localhost:3000/account
- Мастер: http://localhost:3000/barber
- Админ: http://localhost:3000/admin
- Health: http://localhost:3000/api/health

### Демо-аккаунты (после seed)

| Роль | Email | Пароль |
| --- | --- | --- |
| Админ салона | `admin@test.com` | `password1` |
| Мастер | `master@test.com` | `password1` |
| Клиент | `client@test.com` | `password1` |

В development код подтверждения email показывается на экране регистрации.

## Docker

```bash
docker compose up --build
```

Postgres: `localhost:5433`, приложение: `localhost:3000`. После первого старта выполните seed локально, указав тот же `DATABASE_URL`.

## API

| Метод | Путь | Назначение |
| --- | --- | --- |
| POST | `/api/auth/register` | регистрация |
| POST | `/api/auth/verify-email` | подтверждение email |
| POST | `/api/auth/login` | вход |
| POST | `/api/auth/logout` | выход |
| GET | `/api/auth/me` | текущий пользователь |
| GET | `/api/salons` | каталог салонов |
| GET | `/api/salons/:id/masters` | мастера салона |
| GET | `/api/salons/:id/services` | услуги салона |
| GET | `/api/masters/:id/available-slots` | свободные старты |
| POST | `/api/appointments` | создать запись (клиент) |
| GET | `/api/appointments/me` | записи клиента |
| GET | `/api/appointments/today` | записи мастера на сегодня |
| POST | `/api/appointments/:id/cancel` | отмена |
| POST | `/api/appointments/:id/complete` | завершение |

Auth-формы на `/login`, `/register`, `/verify` используют Server Actions.

> **Сборка:** в пути к репозиторию есть символ `#`. Если `npm run build` падает из‑за path/null bytes — запускайте из копии без `#` или переименуйте родительскую папку. Скрипт `build` уже использует webpack (`next build --webpack`).
