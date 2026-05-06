# Двоечка — платформа онлайн-тестирования

Веб-приложение для проведения школьных контрольных и тематических тестов.
Учитель готовит тест, ученик проходит его в браузере, результаты автоматически
сохраняются и приходят учителю в Telegram. Работают live-сессии с общим
таймером, автосохранение черновиков, защита от списывания и запись экрана.

## Стек

- **Frontend:** React 18, TypeScript (strict), Vite 5, Tailwind CSS, shadcn/ui, React Router, TanStack Query.
- **Backend:** Supabase — Postgres + Auth + Storage + Edge Functions (Deno).
- **Хостинг:** мульти-зеркало (Lovable, Netlify, Cloudflare Pages, GitHub Pages) на одной БД.
- **Уведомления:** Telegram Bot API через edge-функцию.

## Быстрый старт

```sh
npm install
npm run dev          # локальный dev-сервер на http://localhost:5173
npm run build        # production-сборка в ./dist
npm run preview:host # локальный preview production-сборки
```

Переменные окружения (`.env`) подставляются автоматически Lovable Cloud:

| Имя                              | Назначение                                      |
| -------------------------------- | ----------------------------------------------- |
| `VITE_SUPABASE_URL`              | URL проекта Supabase                            |
| `VITE_SUPABASE_PUBLISHABLE_KEY`  | Публичный anon-ключ                             |
| `VITE_SUPABASE_PROJECT_ID`       | ID проекта (для прямых вызовов edge functions)  |

## Документация

Вся подробная документация — в [`docs/`](./docs):

| Документ                                              | О чём                                                                       |
| ----------------------------------------------------- | --------------------------------------------------------------------------- |
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md)             | Высокоуровневая архитектура: фронт ↔ Supabase, диаграмма потоков            |
| [DATABASE.md](./docs/DATABASE.md)                     | Все таблицы, связи, RLS-политики и обоснование решений                      |
| [EDGE_FUNCTIONS.md](./docs/EDGE_FUNCTIONS.md)         | Каталог всех serverless-функций: входы, выходы, кто вызывает                |
| [AUTH_AND_ROLES.md](./docs/AUTH_AND_ROLES.md)         | Модель ролей (admin / teacher / student), HMAC учительский токен            |
| [TESTING_FLOW.md](./docs/TESTING_FLOW.md)             | Поток прохождения теста: обычный режим, live-сессии, автосейв, античит      |
| [SECURITY.md](./docs/SECURITY.md)                     | Модель угроз, осознанные риски, ответственное разглашение                   |
| [DEPLOYMENT.md](./docs/DEPLOYMENT.md)                 | Деплой: Lovable, Netlify, Cloudflare Pages, GitHub Pages                    |
| [DEVELOPMENT.md](./docs/DEVELOPMENT.md)               | Локальная разработка, структура папок, конвенции, как добавить новый тест   |

## Структура репозитория

```text
src/
  components/        UI-компоненты (shadcn/ui под capot)
    tests/           Реализации конкретных тестов (Grade7Informatics, …)
  pages/             Маршруты приложения (Index, Admin, TeacherLive, …)
  hooks/             Кастомные React-хуки (useAuth, useRrwebRecorder, …)
  lib/               Чистые утилиты (strictRules, dbTests, safeRandomUUID)
  integrations/      Авто-генерируемые модули Supabase (НЕ редактировать)
supabase/
  functions/         Edge Functions (Deno)
  migrations/        SQL-миграции (timestamp-based)
  config.toml        Конфиг проекта Supabase
docs/                Документация (см. таблицу выше)
```

## Лицензия

Внутренний проект. Все права защищены.
