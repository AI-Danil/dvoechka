# Разработка

## Локальный запуск

```sh
git clone <repo>
cd dvoechka
npm install
npm run dev          # http://localhost:5173
```

Тесты:

```sh
npm test             # vitest, watch mode
bunx vitest run      # один прогон (CI-style)
```

E2E (Playwright):

```sh
bunx playwright test
```

Линтер:

```sh
npm run lint
```

## Структура папок

```text
src/
  pages/                    Маршруты приложения (один файл = одна страница)
    Index.tsx               Главная: выбор теста для ученика
    Auth.tsx                Логин (Supabase Auth)
    Admin.tsx               Корневая админ-страница
    AdminDashboard.tsx      Дашборд админа: результаты, тесты
    TeacherDashboard.tsx    Дашборд учителя
    TeacherLive.tsx         Управление live-сессией (учитель)
    LiveStudent.tsx         Live-сессия (ученик)
    StudentDashboard.tsx    Дашборд ученика
    Replay.tsx              Просмотр записи экрана
    Account.tsx             Настройки аккаунта
    NotFound.tsx            404

  components/
    Quiz.tsx                Универсальный квиз с таймером и автосейвом
    LiveSessionRunner.tsx   Раннер live-сессии (на стороне ученика)
    FileAttach.tsx          Загрузка файлов (с санитизацией кириллицы)
    RequireRole.tsx         Гард маршрутов по роли
    TeacherLoginGate.tsx    HMAC-форма логина для legacy-страниц учителя
    tests/                  Реализации конкретных письменных частей тестов
      Grade7Informatics.tsx
      Grade8Physics.tsx
      ...
    ui/                     shadcn/ui — НЕ редактировать руками

  hooks/
    useAuth.tsx             Supabase Auth + роли
    useTeacherAuth.ts       HMAC-токен для legacy
    useAntiCheatNotify.ts   Античит: события + Telegram-алерты
    useRrwebRecorder.ts     Запись экрана через rrweb
    useDevToolsBlock.ts     Детектор DevTools

  lib/
    strictRules.ts          Валидация ФИО (2 русских слова + цифра-ретейк)
    quizRegistry.ts         Реестр (grade, subject, kind) → React-компонент
    dbTests.ts              Загрузка тестов из БД
    safeRandomUUID.ts       UUID polyfill для старых браузеров
    utils.ts                clsx + tailwind-merge

  integrations/supabase/    АВТОГЕНЕРАЦИЯ — не редактировать
    client.ts
    types.ts

  test/                     Vitest setup + примеры

supabase/
  functions/                Edge Functions (Deno)
  migrations/               SQL-миграции
  config.toml               Конфиг (project_id, verify_jwt по функциям)

docs/                       Эта документация
```

## Конвенции

### TypeScript

- `strict: true` — без исключений.
- Никаких `any` без явного `// eslint-disable-next-line` + причины.
- Типы из БД — из `src/integrations/supabase/types.ts` (автоген).

### React

- Только функциональные компоненты.
- Хуки — в `src/hooks/`, по одному на файл, имя `use<Name>.ts(x)`.
- `useEffect` с зависимостями — без `eslint-disable-next-line` без причины.
- Серверное состояние — TanStack Query, не useState/useEffect+fetch.
- Формы — react-hook-form + zod.

### Стили

- Только Tailwind utility-классы. Никаких `.module.css`.
- Семантические токены из `src/index.css` и `tailwind.config.ts`
  (`bg-background`, `text-foreground`, `bg-primary`), а не сырые цвета
  (`bg-white`, `text-black` — нельзя).
- Все цвета в HSL.
- shadcn/ui компоненты — кастомизировать через варианты, а не править файлы
  в `src/components/ui/`.

### Файлы и папки

- Компоненты: `PascalCase.tsx` (`Button.tsx`).
- Утилиты/хуки: `camelCase.ts` (`formatDate.ts`, `useAuth.ts`).
- Папки: `kebab-case` (`design-refs/`).

### Git

- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`,
  `test:`, `ci:`.
- Сообщения — на английском.
- Без авто-коммита: коммит вручную после ревью.

## Как добавить новый тест

1. Создать письменный компонент в `src/components/tests/Grade<N><Subject>.tsx`.
   Пример: `Grade8Chemistry.tsx`. Скопировать структуру из любого
   существующего (например, `Grade8Physics.tsx`).
2. Зарегистрировать в `src/lib/quizRegistry.ts`:
   ```ts
   "8/chemistry/mixed": Grade8Chemistry,
   ```
3. Создать тест в админке (или через `generate-test`) и опубликовать.
4. Проверить локально: `npm run dev` → войти как ученик → найти тест.
5. Если у теста особый автосейв (доп. поля) — добавить ключи в
   `getDraftKey` и `buildServerPayload` в `src/pages/Index.tsx`.

## Полезные команды

```sh
npm run dev               # dev-сервер
npm run build             # production-сборка
npm run preview           # preview production-сборки
npm run preview:host      # preview с привязкой к 0.0.0.0 (для туннеля)
npm run lint              # ESLint
npm test                  # vitest watch
npm run tunnel            # Cloudflare Tunnel (требует cloudflared)
npm run deploy:cf         # ручной деплой на Cloudflare Pages
```
