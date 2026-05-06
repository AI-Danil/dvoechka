## Что делаем (4 блока)

### Блок 1 — Защита учительского логина

**Проблема:** `TEACHER_PASSWORD` в env в открытом виде; нет защиты от брутфорса (минута перебора — и токен у атакующего).

- Новая таблица `teacher_credentials(login text PK, password_hash text, updated_at)` + миграция.
- Новая таблица `auth_attempts(id, login text, ip text, success bool, created_at)` для счётчика попыток.
- Edge function `set-teacher-password` (admin only) — хэширует через `bcrypt` (`npm:bcryptjs`) и записывает в `teacher_credentials`.
- One-time миграция: при первом вызове `verify-teacher-credentials`, если в БД нет хэша — берём `TEACHER_PASSWORD` из env, хэшируем, сохраняем. После проверки можно env удалить вручную.
- В `verify-teacher-credentials`: читаем хэш из БД, `bcrypt.compare`. Перед этим — счётчик: если за последние 15 минут с этого IP+login было ≥5 неудачных, отдаём 429 с задержкой. Все попытки логируем в `auth_attempts`.
- HMAC-токен: добавить `iat` в payload (для будущей ротации `TEACHER_JWT_SECRET` через `revoked_before` timestamp в env). `kid` пока не добавляем — overkill.

**Примечание:** в Lovable нет infra для рейт-лимита, делаем ad-hoc через таблицу. Это работает, но не идеально (можно обойти при наличии многих IP). Для текущих угроз (один абитуриент-хулиган) — достаточно.

### Блок 2 — CI на GitHub Actions + базовые тесты

- `.github/workflows/ci.yml`: на push/PR гоняет `bun install → bun run lint → tsc --noEmit → bunx vitest run`. Без playwright/deno (отдельный workflow позже, если нужно).
- Бейдж `![CI](...)` в `README.md`.
- Unit-тесты (vitest) для критичной логики:
  - `src/lib/strictRules.ts` — валидация имени (2 слова кириллицы, цифра как hidden retake), edge cases.
  - `src/lib/safeRandomUUID.ts` — fallback path.
  - Утилита санитизации Cyrillic → ASCII (вынести из `FileAttach.tsx` в `src/lib/sanitizeFilename.ts`, покрыть тестами).
  - Формула оценки в `grade-quiz-submission` — выделить в чистую функцию `src/lib/grading.ts`, импортировать и в edge function, и в тесте.
- Деплой Pages (`deploy-pages.yml`) — добавить `needs: ci`, чтобы не публиковалось битое.

### Блок 3 — Zod-валидация во всех edge functions + общий CORS

- `supabase/functions/_shared/cors.ts` — экспорт `corsHeaders` и `handleCors(req)`. Подменить во всех 25 функциях (механическая правка).
- `supabase/functions/_shared/validate.ts` — хелпер `parseJson(req, schema)` → `Response | data`.
- Перевести на zod (`npm:zod`) функции, где сейчас ручной парсинг:
  - `save-draft`, `load-draft`, `clear-draft`
  - `save-attempt-progress`, `start-attempt`
  - `send-test-results`, `notify-copy-attempt`, `log-cheat-event`
  - `verify-teacher-credentials`, `create-session`, `start-session`, `stop-session`, `join-session`
  - `generate-test`, `publish-test`, `delete-test`, `get-test-questions`, `grade-quiz-submission`
  - `replay-signed-url`, `update-replay-url`, `page-beacon`, `claim-admin`, `seed-teacher`, `list-results`
- Единый формат ошибок: `{ ok: false, error: { code, message, fields? } }`.

### Блок 4 — CSP + retention

- `public/_headers`: добавить
  ```
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.telegram.org; frame-ancestors 'none'
  ```
  (`unsafe-inline` для Vite/shadcn неизбежен; nonce-режим — отдельный большой рефакторинг).
- Аналогично в `netlify.toml` для Netlify-деплоя.
- Retention через миграцию + edge function `cleanup-old-data` (вызывается вручную или cron-ом извне):
  - `student_drafts` старше 30 дней → удалить.
  - `auth_attempts` старше 7 дней → удалить.
  - Записи `cheat_log` в `test_attempts` со статусом `submitted` старше 90 дней → очистить (сам attempt оставить).
  - Файлы в bucket `rrweb-sessions` старше 90 дней → удалить (через `storage.remove`).
- Документировать в `docs/SECURITY.md` (раздел "Data Retention").

### Технические детали

- **bcrypt в Deno:** `import bcrypt from "npm:bcryptjs@2.4.3"` — работает в edge functions, cost 10.
- **Уникальный индекс для `student_drafts`:** проверить и при отсутствии добавить миграцией `UNIQUE(student_name, grade, subject, test_id, attempt)` — нужен для `onConflict` в `save-draft`.
- **Не трогаем:** `client.ts`, `types.ts`, `package.json` версии, бизнес-логику тестов, git history.

### Затронутые файлы (≈)

- 2 миграции (credentials/attempts/retention/index)
- 4 новых edge function (`set-teacher-password`, `cleanup-old-data`) + правки 20+ существующих
- 2 новых `_shared/` файла
- 4 новых файла в `src/lib/` + тесты
- `.github/workflows/ci.yml`, `deploy-pages.yml`
- `public/_headers`, `netlify.toml`, `README.md`, `docs/SECURITY.md`, `supabase/config.toml` (новые функции)

Объём большой, но всё параллелится. После реализации повторно прогоним security scan и линтер.
