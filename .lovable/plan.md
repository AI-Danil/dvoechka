## Цель
Убрать публичный доступ к `test_questions` (сейчас любой может скачать вопросы с правильными ответами) — вопросы будут отдаваться только через серверный edge function без полей `correct_index` и `expected_answer`.

## Шаги

### 1. Миграция БД
- DROP RLS-политики `"Anyone reads questions of published tests"` на `test_questions` (роли anon/authenticated).
- Оставить только: `"Admins manage all questions"` и `"Authors manage questions of own tests"`.
- (Аналогично проверить `public_test_questions` — это скорее всего view; если SELECT доступен anon, отозвать GRANT.)

### 2. Новый edge function `get-test-questions`
- `verify_jwt = false`, входы: `attempt_id` (или `test_id` + `student_name` для верификации существующей попытки).
- Через service role:
  1. Находит активную `test_attempts` запись (status = `in_progress`) с этим `attempt_id`.
  2. Загружает `test_questions` без `correct_index`, `expected_answer`.
  3. Возвращает массив вопросов клиенту.
- Так гарантируем: вопросы видит только тот, кто реально начал попытку через `start-attempt`/`join-session`.

### 3. Обновление фронта
- `src/lib/dbTests.ts` → `loadTestQuestions()`: вместо прямого `from("public_test_questions")` вызывать `supabase.functions.invoke("get-test-questions", { body: { attempt_id } })`.
- Найти все места использования `loadTestQuestions` (вероятно `DbTestRunner.tsx`, `LiveSessionRunner.tsx`) и пробросить `attempt_id`.
- Убедиться, что нигде на фронте не используются поля `correct_index`/`expected_answer` — оценка уже идёт на сервере в `grade-quiz-submission`.

### 4. Регистрация в `supabase/config.toml`
Добавить блок:
```
[functions.get-test-questions]
verify_jwt = false
```

### 5. Проверка
- Прогнать `supabase--linter` и `security--run_security_scan` — убедиться, что утечки нет.
- Тест-сценарий: попробовать `curl` на `test_questions` с anon-ключом → должен вернуться пустой массив / 401.
- Проверить, что обычное прохождение теста (и live-сессия) работает.

## Возможный риск
Если в БД есть view `public_test_questions`, он может игнорировать RLS базовой таблицы — нужно либо пересоздать его с `security_invoker=on`, либо отозвать `GRANT SELECT ... TO anon`. Уточню при миграции через `supabase--read_query`.

## Затронутые файлы
- новая миграция (DROP policy + GRANT REVOKE на view)
- `supabase/functions/get-test-questions/index.ts` (новый)
- `supabase/config.toml`
- `src/lib/dbTests.ts`
- `src/components/DbTestRunner.tsx`, `src/components/LiveSessionRunner.tsx` (адаптация вызова)
