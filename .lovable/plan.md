## Контекст и важная оговорка

**Скрытие следов ИИ из репо я делать не буду** — причины подробно объяснены в чате (нельзя переписывать git history из среды; всё равно палится по `package.json`, хостингу `lovable.app`, метаданным коммитов; намеренное сокрытие при ревью выглядит хуже честного признания). Вместо этого делаем проект таким, чтобы код прошёл ревью на качестве, а не на «кто автор».

Если позже захочешь всё-таки чистить историю — это отдельная задача вне Lovable: локально `git filter-repo`, перенос в новый репозиторий, смена хостинга. Готов написать инструкцию, но выполнить не смогу.

---

## Что сделаю

### 1. Аудит безопасности и фиксы

Найдено линтером 8 предупреждений. Чиню всё:

- **Public Bucket Allows Listing** (`test-attachments`) — добавлю RLS на `storage.objects`: публичное чтение конкретных файлов оставляем, но `LIST` запрещаем для anon.
- **SECURITY DEFINER функции доступны anon/authenticated** (`has_role`, `set_updated_at`, `get_session_by_code`) — `REVOKE EXECUTE ... FROM anon, authenticated` где не нужно. `get_session_by_code` оставляем доступной для anon (её зовёт `join-session` через service role — можно вообще отозвать).
- **Leaked Password Protection** — включу через `configure_auth`.

Дополнительно ручной разбор:
- Все edge functions: проверю CORS (в `_shared` или дублирование), `verify_jwt`, валидацию входа (zod), что service role не утекает в ответы, что `student_name` нормализуется одинаково везде (anti-cheat key).
- RLS-политики 13 таблиц: проверю каждую на recursion, на overly permissive (`true`), на отсутствие политик для INSERT/UPDATE/DELETE где должны быть.
- `student_drafts`: сейчас INSERT/UPDATE/DELETE закрыты — это правильно (всё через edge с service role). Зафиксирую в комментарии.
- `verify-teacher-credentials` + HMAC токен в `_shared/teacher-auth.ts` — перепроверю срок жизни, алгоритм.
- Прогоняю security scan ещё раз после фиксов.

### 2. Документация

Создаю структуру:

```text
README.md                  — обзор, быстрый старт, ссылки на docs/
docs/
  ARCHITECTURE.md          — фронт SPA + Supabase, диаграмма потоков
  DATABASE.md              — все таблицы, связи, RLS-политики (с пояснением «почему так»)
  EDGE_FUNCTIONS.md        — каждая функция: назначение, вход, выход, кто вызывает, права
  AUTH_AND_ROLES.md        — модель ролей (admin/teacher/student), HMAC teacher-token, flow логина
  TESTING_FLOW.md          — обычный режим / live-сессии / автосейв (3 уровня) / античит
  SECURITY.md              — модель угроз, что защищено, что осознанный риск, ответственное разглашение
  DEPLOYMENT.md            — Lovable / Netlify / Cloudflare Pages / GitHub Pages, env vars, build secrets
  DEVELOPMENT.md           — локальный запуск, структура папок, конвенции, как добавить новый тест
  CHANGELOG.md             — пустой шаблон под Keep a Changelog
```

Текущий `README.md` сильно перегружен инструкциями по деплою — переношу деплой в `docs/DEPLOYMENT.md`, README делаю чистым обзором.

### 3. Комментарии в коде (JSDoc)

Прохожусь по ключевым модулям и добавляю заголовочные JSDoc-блоки + поясняющие комментарии у нетривиальных мест:

- `src/pages/Index.tsx` — главный экран, маршрутизация по тестам, автосейв
- `src/components/Quiz.tsx` — таймер, persist, восстановление
- `src/components/LiveSessionRunner.tsx` — live-режим, серверный таймер
- `src/hooks/useAuth.tsx`, `useTeacherAuth.ts`, `useAntiCheatNotify.ts`, `useRrwebRecorder.ts`, `useDevToolsBlock.ts`
- `src/lib/strictRules.ts`, `quizRegistry.ts`, `dbTests.ts`, `safeRandomUUID.ts`
- Все 25 edge functions: 5–10 строк сверху (назначение, входы, выходы, side effects, security)

Особо документирую «костыли с причиной»:
- санитизация кириллицы перед upload в Storage
- 2 русских слова в имени + 3-е слово-цифра как hidden retake
- `verify_jwt = false` для большинства функций + причина (signing-keys + in-code validation)
- почему `student_drafts` без INSERT-политики (только service role)

### 4. Чистка

- Удалю `console.log`, оставлю `console.error`/`console.warn` где уместно.
- Уберу мёртвый код, найденный по ходу аудита.
- Помечу TODO либо закрою, либо оформлю в `docs/ROADMAP.md`.

### 5. Финальная проверка

- `supabase--linter` — должно быть 0 warnings.
- `security--run_security_scan` — прогнать.
- Пройду по чеклисту OWASP ASVS Level 1 (то, что применимо к SPA + BaaS).
- Убедиться, что typecheck/build не сломаны.

---

## Файлы, которые будут затронуты

**Создаются:** `docs/*.md` (8 файлов), миграция для RLS-фиксов.
**Переписывается:** `README.md`.
**Правятся:** ~20 .ts/.tsx файлов (комментарии + чистка console.log), `supabase/functions/*/index.ts` (заголовочные комментарии).

## Чего НЕ трогаю

- `src/integrations/supabase/{client,types}.ts`, `.env*`, `supabase/config.toml` (project-level), `package.json` лишний раз.
- Бизнес-логику тестов/квизов — только комментирую.
- Git history.

## Оценка

Большой объём, но прямолинейный. Сделаю одним проходом, в конце — короткий отчёт «что починено / что осталось как осознанный риск».
