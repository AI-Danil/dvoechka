# Аутентификация и роли

В системе сосуществуют **три уровня доступа** и **два механизма аутентификации**.

## Уровни доступа (роли)

| Роль       | Кто                                | Что может                                                                |
| ---------- | ---------------------------------- | ------------------------------------------------------------------------ |
| `admin`    | владелец платформы                 | всё: управлять учителями, классами, всеми тестами и результатами         |
| `teacher`  | учитель                            | свои тесты, свои классы, результаты по своим тестам, live-сессии         |
| `student`  | ученик (опционально)               | пройти тест в live-режиме без анонимного ввода имени                     |
| (анонимный)| ученик без аккаунта                | пройти любой опубликованный тест, представившись ФИО                     |

Роли хранятся в таблице `user_roles` (`user_id` ↔ `role`). **Не в профиле
и не в JWT-claims.** Это намеренно — иначе пользователь мог бы повысить
себе права через обычный `UPDATE` на свою строку. Все RLS-политики проверяют
роль через SECURITY DEFINER функцию `has_role(uid, role)`.

## Механизм 1: Supabase Auth (admin / teacher / student)

Стандартный Supabase Auth, провайдеры: email+пароль и Google.

- Хук `useAuth` (`src/hooks/useAuth.tsx`) предоставляет `user`, `session`,
  `roles`, `loading`.
- Компонент `RequireRole` (`src/components/RequireRole.tsx`) защищает
  маршруты:
  ```tsx
  <RequireRole role={["admin", "teacher"]}>
    <AdminDashboard />
  </RequireRole>
  ```
- `Leaked Password Protection (HIBP)` включён — пароли проверяются по
  базе утечек при регистрации/смене пароля.

### Назначение первого admin

При первом запуске единственный пользователь может вызвать `claim-admin`
(verify_jwt=true) — функция назначит ему роль `admin`. После того, как
admin есть, дальнейшее назначение ролей идёт через админку.

## Механизм 2: HMAC учительский токен (legacy)

Часть страниц учителя унаследована из ранней версии без Supabase Auth.
Для них используется отдельный логин/пароль из переменных окружения
(`TEACHER_LOGIN`, `TEACHER_PASSWORD`) и собственный токен.

### Поток

```text
Учитель → форма /teacher → POST verify-teacher-credentials { login, password }
        ← { token, expiresAt }                           (HMAC-SHA256, TTL ~12ч)
        ← localStorage сохраняет токен
        → следующие запросы шлют x-teacher-token: <token>
        → edge-функция → _shared/teacher-auth.ts.verifyTeacherToken()
```

### Структура токена

```text
base64url(payload).base64url(hmacSHA256(payload, TEACHER_JWT_SECRET))

payload = "<login>.<exp_unix_seconds>"
```

Простая, проверяемая в одной функции структура. Не JWT — нам не нужны
претензии, просто «логин + срок действия + подпись».

### Файлы

- `src/hooks/useTeacherAuth.ts` — хук, хранит токен в localStorage.
- `src/components/TeacherLoginGate.tsx` — форма входа.
- `supabase/functions/_shared/teacher-auth.ts` — серверная проверка.
- `supabase/functions/verify-teacher-credentials/index.ts` — выдача токена.

## Анонимный ученик

Не требует входа. На главной вводит ФИО (см. правило двух слов в
[TESTING_FLOW.md](./TESTING_FLOW.md)) и проходит тест. Идентификация
по композитному ключу `(student_name, grade, subject, test_id, attempt)` —
этого достаточно для:

- автосейва (`student_drafts`);
- предотвращения повторной сдачи без специального триггера;
- античит-логирования.

Все edge-функции, принимающие анонимный ввод, нормализуют `student_name`
одинаково (trim + collapse-whitespace) и валидируют формат.

## Сводка проверок

| Где                                | Чем проверяется                                                |
| ---------------------------------- | -------------------------------------------------------------- |
| Чтение/запись через PostgREST      | RLS-политики + `has_role()`                                    |
| Edge-функции, доступные ученику    | Валидация Zod на входе, никаких чувствительных данных в ответе |
| Edge-функции учителя (legacy)      | `x-teacher-token` → `verifyTeacherToken()`                     |
| Edge-функции admin/teacher (новые) | Supabase JWT через `auth.getClaims(token)` + проверка `has_role` |
| Storage `rrweb-sessions`           | Приватный bucket → только signed URL от `replay-signed-url`    |
