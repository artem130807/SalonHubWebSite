# Barber Booking Network

Единое Next.js-приложение (App Router): лендинг для клиентов, кабинеты мастера и админа, API-роуты.

## Структура

```text
barber_booking_network/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Лендинг
│   │   ├── barber/page.tsx       # Кабинет мастера
│   │   ├── admin/page.tsx        # Панель администратора
│   │   └── api/health/route.ts   # Health API
│   └── components/               # UI (лендинг + дашборды)
├── public/
└── package.json
```

## Запуск

```bash
npm install
npm run dev
```

- Приложение: http://localhost:3000
- Мастер: http://localhost:3000/barber
- Админ: http://localhost:3000/admin
- Health: http://localhost:3000/api/health

## Сборка

```bash
npm run build
npm start
```

> **Важно:** в пути к проекту есть символ `#` (`AAAAA1111222C#`). Next.js/Webpack из‑за этого могут падать при сборке. Если `npm run build` падает с ошибкой path/null bytes — запускайте из копии без `#` в пути или переименуйте родительскую папку.
