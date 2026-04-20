

## Что чиню

### 1. Edge functions возвращают 401 (главная проблема)

В edge-логах видно: `POST /generate-test → 401` ещё до выполнения кода. Платформа режет запрос, потому что у новых функций включён `verify_jwt`, а у нас в коде свой `getUser()`-механизм.

**Правлю `supabase/config.toml`** — добавляю блоки:
```toml
[functions.generate-test]
verify_jwt = false

[functions.publish-test]
verify_jwt = false

[functions.delete-test]
verify_jwt = false

[functions.grade-quiz-submission]
verify_jwt = false
```

JWT всё равно валидируется внутри функции через `userClient.auth.getUser()` — безопасность не страдает.

### 2. Roles race condition на `/account`

`useAuth` грузит роли асинхронно, после `setUser`. Из-за этого `Account.tsx` мгновенно показывает «У вас нет роли», хотя роль `teacher` уже в БД.

Правлю `src/hooks/useAuth.tsx` — `loading` снимаю только **после** загрузки ролей при `onAuthStateChange` (сейчас `loading=false` ставится только в `getSession`, а на повторный логин не пересчитывается).

Правлю `src/pages/Account.tsx` — пока `loading=true` показываю спиннер, а не «нет роли». И делаю редирект `teacher → /teacher/dashboard` / `admin → /admin/dashboard` сразу как роли подгрузились.

### 3. Кнопка «Стать админом» висит у не-админов

Правлю `src/pages/Account.tsx` (или где она рендерится) — кнопку показываю только если в системе **ещё нет ни одного админа**. Проверка через edge-функцию `claim-admin` (она уже умеет отвечать 403, если админ есть) — делаю быструю проверку при маунте: вызываю claim с флагом `dry_run` или просто скрываю кнопку, если у пользователя уже есть любая роль (`teacher`/`student`).

Проще: **скрываю кнопку, если `roles.length > 0`** — учитель не должен видеть «стать админом».

### Файлы

- `supabase/config.toml` — добавить блоки `verify_jwt = false` для 4 новых функций
- `src/hooks/useAuth.tsx` — фиксить loading после onAuthStateChange
- `src/pages/Account.tsx` — спиннер пока loading, редирект по ролям, скрыть кнопку «стать админом» если уже есть роль

### Не трогаю

БД, RLS, сами edge-функции (код корректный), `seed-teacher`, `claim-admin`.

### Проверка после

1. Выйти/войти под `teatcher01@test.ru` → должен сразу попасть в `/teacher/dashboard` без мелькания «нет роли», кнопки «стать админом» нет.
2. На дашборде учителя выбрать «9А (2025) — Физика», вставить вопросы, нажать «Сгенерировать» → ответ 200, превью с вопросами.
3. Опубликовать → открыть `/`, выбрать 9 класс / физику → новый тест в списке.

