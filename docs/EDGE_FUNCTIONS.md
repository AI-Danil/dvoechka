# Edge Functions

Все функции — Deno runtime, лежат в `supabase/functions/<name>/index.ts`.
Конфиг (`verify_jwt`) — в `supabase/config.toml`.

## Конвенции

- Все функции возвращают JSON и правильные CORS-заголовки.
- Вход валидируется через Zod (или вручную для простых случаев).
- При работе с БД используется service role — это позволяет
  обходить RLS контролируемо, после собственной проверки прав.
- Секреты читаются из `Deno.env`, никогда не возвращаются клиенту.

## Каталог функций

### Аутентификация и роли

| Функция                          | verify_jwt | Назначение                                                                          |
| -------------------------------- | ---------- | ----------------------------------------------------------------------------------- |
| `verify-teacher-credentials`     | false      | Логин учителя legacy-формой → выдаёт HMAC-токен (TTL ~12ч)                         |
| `claim-admin`                    | true       | Назначает текущему пользователю роль admin (одноразовое действие при первом запуске)|
| `seed-teacher`                   | false      | Создание учителя из конфига (служебная)                                            |

### Тесты и сессии (учитель)

| Функция                | verify_jwt | Назначение                                                       |
| ---------------------- | ---------- | ---------------------------------------------------------------- |
| `generate-test`        | false      | Генерация теста через Lovable AI (по теме + классу)             |
| `publish-test`         | false      | Перевод теста из `draft` в `published`                          |
| `delete-test`          | false      | Удаление теста (с каскадом по вопросам)                          |
| `create-session`       | false      | Создание live-сессии: генерация кода, запись `teacher_user_id`  |
| `start-session`        | false      | Старт live-сессии: проставляет `started_at`/`ends_at`           |
| `stop-session`         | false      | Завершение live-сессии раньше времени                           |
| `list-results`         | false      | Постраничный список результатов с фильтрами для админки         |

### Прохождение теста (ученик)

| Функция                    | verify_jwt | Назначение                                                          |
| -------------------------- | ---------- | ------------------------------------------------------------------- |
| `get-test-questions`       | false      | Возвращает вопросы теста БЕЗ полей `correct_index`/`expected_answer`|
| `start-attempt`            | false      | Создаёт запись в `test_attempts` (live-режим)                       |
| `save-attempt-progress`    | false      | Сохраняет прогресс live-attempt (server-side draft)                 |
| `save-draft`               | false      | Автосейв черновика обычного режима (5-сек debounce)                 |
| `load-draft`               | false      | Восстановление черновика при возврате к тесту                       |
| `clear-draft`              | false      | Удаление черновика после успешной сдачи                             |
| `join-session`             | false      | Присоединение ученика к live-сессии по коду                         |
| `grade-quiz-submission`    | false      | Серверная проверка ответов квиза (сравнение с `correct_index`)      |
| `send-test-results`        | false      | Финальная отправка: запись в `test_results` + отчёт в Telegram      |

### Античит

| Функция                  | verify_jwt | Назначение                                                              |
| ------------------------ | ---------- | ----------------------------------------------------------------------- |
| `notify-copy-attempt`    | false      | Мгновенная отправка алерта в Telegram при копировании / уходе с вкладки |
| `log-cheat-event`        | false      | Логирование менее критичных событий в `cheat_log` attempt'а             |
| `page-beacon`            | false      | Beacon-пинг с этапами загрузки страницы (диагностика «белого экрана»)   |

### Запись экрана

| Функция              | verify_jwt | Назначение                                                  |
| -------------------- | ---------- | ----------------------------------------------------------- |
| `replay-signed-url`  | false      | Выдача signed URL на запись (TTL ~1 час) для учителя        |
| `update-replay-url`  | false      | Привязка пути записи к строке `test_results` после загрузки |

## Почему `verify_jwt = false` у большинства функций?

Supabase перешёл на signing-keys, и встроенная JWT-проверка через
`verify_jwt = true` не подходит для нашего сценария, где:

1. **Ученики анонимны.** У них нет Supabase-сессии, но edge-функция должна
   принимать их данные (с собственной валидацией).
2. **Учитель — HMAC-токен.** Legacy-страницы учителя ходят с собственным
   токеном (`x-teacher-token`), который проверяется в `_shared/teacher-auth.ts`,
   а не Supabase JWT.

Поэтому JWT валидируется в коде функции, где это нужно. Анонимные функции
защищены валидацией входа, rate-limit на уровне Supabase и тем, что не
возвращают чувствительных данных (например, `correct_index`).

## Секреты

Используемые edge-функциями (значения хранятся в Supabase Secrets):

| Секрет                       | Где используется                                          |
| ---------------------------- | --------------------------------------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY`  | Все функции, пишущие в БД                                 |
| `SUPABASE_URL`               | Все                                                       |
| `TELEGRAM_BOT_TOKEN`         | `send-test-results`, `notify-copy-attempt`, `page-beacon` |
| `TELEGRAM_CHAT_ID`           | то же                                                     |
| `TEACHER_LOGIN`              | `verify-teacher-credentials`                              |
| `TEACHER_PASSWORD`           | `verify-teacher-credentials`                              |
| `TEACHER_JWT_SECRET`         | `verify-teacher-credentials`, `_shared/teacher-auth.ts`   |
| `LOVABLE_API_KEY`            | `generate-test`                                           |
