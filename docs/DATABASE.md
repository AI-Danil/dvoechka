# База данных

PostgreSQL под управлением Supabase. Все таблицы — в схеме `public`,
RLS включён везде. Миграции лежат в `supabase/migrations/` и применяются
автоматически.

## Перечисляемые типы

| Тип            | Значения                            | Назначение                       |
| -------------- | ----------------------------------- | -------------------------------- |
| `app_role`     | `admin`, `teacher`, `student`       | Роли пользователей               |
| `test_kind`    | `quiz`, `mixed`, `written`          | Тип теста                        |
| `test_status`  | `draft`, `published`, `archived`    | Жизненный цикл теста             |

## Справочники

### `classes` — классы (5–11)
- `name` — например, `7А`.
- `year` — учебный год.
- **Доступ:** читать может кто угодно (нужно для экрана выбора теста), писать — только admin.

### `subjects` — предметы (Информатика, Физика, …)
- **Доступ:** читать — все, писать — admin.

## Пользователи и роли

### `user_roles`
- `(user_id, role)` — связь Supabase-пользователя с ролью.
- **Почему отдельная таблица, а не колонка в `profiles`:** иначе пользователь
  мог бы повысить себе права обычным `UPDATE`. Текущая схема + SECURITY DEFINER
  функция `has_role(uid, role)` исключают эту атаку.
- **Доступ:** свои роли видит сам пользователь, все роли — admin.

### `teachers`
- Профиль учителя, ссылается на `auth.users` через `user_id`.
- **Доступ:** учителя видят учителей, admin управляет.

### `teacher_assignments`
- Привязка учителя к (классу, предмету). Используется в RLS для определения,
  какие тесты учителю разрешено читать.

### `students`
- Профили учеников (для будущей регистрации; сейчас не обязательны).
- **Доступ:** admin управляет; учитель видит учеников своих классов.

## Контент тестов

### `tests`
- `kind`, `status`, `class_id`, `subject_id`, `author_user_id`,
  `time_per_question_sec`.
- **Доступ:**
  - читать опубликованные (`status = published`) — кто угодно (нужно для
    анонимного экрана ученика);
  - автор управляет своими;
  - учителя — читают тесты в своих (классах, предметах);
  - admin — всё.

### `test_questions`
- Принадлежит `tests`, поле `position` задаёт порядок.
- `response_kind` (`quiz` / `written`), `correct_index`, `points`,
  `seconds_override`.
- **Доступ:** управляет автор теста и admin. Само содержимое вопросов клиент
  получает только через edge-функцию `get-test-questions` — это позволяет
  скрыть `correct_index` и `expected_answer` от ученика.

## Прохождение тестов

### `test_attempts`
- Серверная сессия прохождения. Используется в live-режиме для синхронизации
  таймера и прогресса.
- `status` (`in_progress`, `submitted`), `current_phase`, `current_question`,
  `draft_answers` (jsonb), `cheat_log` (jsonb), `started_at`, `finished_at`.
- **Доступ:** только учителя/admin (read + update). INSERT — через
  `start-attempt` (service role).

### `test_results`
- Финальный результат. То, что показывается в админке.
- `student_name`, `grade`, `subject`, `test_type`, `attempt`, `answers`,
  `attachments`, `cheat_log`, `time_spent`, `replay_url`.
- **Доступ:** только READ для учителей/admin. Любой INSERT — через
  edge-функцию `send-test-results` (service role + валидация).

### `student_drafts`
- Серверный автосейв черновика (5-секундный debounce).
- Уникальный ключ — `(student_name, grade, subject, test_id, attempt)`.
- `written` (jsonb) — поля письменной части, `quiz` (jsonb) — состояние квиза.
- **Доступ:** READ — учителя/admin. INSERT/UPDATE/DELETE — **закрыты**
  для всех клиентов. Все операции идут через edge-функции `save-draft`,
  `load-draft`, `clear-draft` от имени service role.

## Live-сессии

### `test_sessions`
- Учительская сессия с кодом-PIN.
- `code` (TEXT), `status` (`waiting` / `running` / `finished`),
  `duration_sec`, `started_at`, `ends_at`, `teacher_user_id`.
- **Доступ:** учитель управляет своими сессиями, admin — всеми.
- Анонимный ученик присоединяется через edge `join-session` (service role
  ищет сессию по коду через `get_session_by_code`).

### `test_session_participants`
- Кто присоединился к сессии и когда сдал.
- **Доступ:** READ — учитель этой сессии или admin. INSERT/UPDATE — через
  edge-функции.

## SECURITY DEFINER функции

Все три имеют `search_path = public` для защиты от search_path-инъекций.
EXECUTE для `anon`/`authenticated` отозван — функции вызываются только из
RLS-политик и edge-функций (service role).

| Функция                       | Назначение                                                       |
| ----------------------------- | ---------------------------------------------------------------- |
| `has_role(uid, role)`         | Проверка роли в RLS без рекурсии                                 |
| `set_updated_at()`            | Триггер автоматического обновления `updated_at`                  |
| `get_session_by_code(code)`   | Безопасный lookup live-сессии по коду из edge-функции            |

## Storage buckets

| Bucket             | Public | Назначение                                                              |
| ------------------ | ------ | ----------------------------------------------------------------------- |
| `test-attachments` | yes    | Файлы, прикладываемые учеником (фото решения, документы)                |
| `rrweb-sessions`   | no     | Записи экрана. Доступ только через signed URL (`replay-signed-url`)     |

**Заметка о RLS на `test-attachments`.** Bucket публичный — файлы отдаются
напрямую через `/object/public/...`. Политики SELECT в `storage.objects`
сняты намеренно: они нужны были бы только для `LIST`-операций, которые
клиенту запрещены. Загрузка ученика идёт через INSERT-политику (anon
разрешён).

## Конвенции

- `id UUID DEFAULT gen_random_uuid() PRIMARY KEY`.
- `created_at`, `updated_at` — `TIMESTAMPTZ DEFAULT now()`.
- `updated_at` обновляется триггером `set_updated_at()`.
- Никаких `FOREIGN KEY` на `auth.users` — ссылки идут через `user_id UUID`
  без FK (ограничение Supabase: `auth` — managed schema).
